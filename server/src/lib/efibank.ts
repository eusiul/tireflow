/**
 * Efi Bank (Gerencianet) — Pix API Client
 * Docs: https://dev.efipay.com.br/docs/api-pix/
 *
 * Fluxo:
 *   1. getAccessToken()     → OAuth2 token
 *   2. createCharge()       → cria cobrança imediata (cob)
 *   3. getQRCode()          → gera QR Code e copia-e-cola
 *   4. handleWebhook()      → confirma pagamento
 */

import axios, { type AxiosInstance } from 'axios'
import https from 'https'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const BASE_URL_PROD = 'https://pix.api.efipay.com.br'
const BASE_URL_SANDBOX = 'https://pix-h.api.efipay.com.br'

interface EfiBankConfig {
  clientId: string
  clientSecret: string
  pixKey: string         // Chave Pix do recebedor
  sandbox?: boolean
  certPath?: string      // mTLS certificate path (required in prod)
}

interface PixCharge {
  txid: string
  status: 'ATIVA' | 'CONCLUIDA' | 'REMOVIDA_PELO_USUARIO_RECEBEDOR' | 'REMOVIDA_PELO_PSP'
  valor: { original: string }
  devedor?: { cpf?: string; cnpj?: string; nome: string }
  infoAdicionais?: Array<{ nome: string; valor: string }>
  location: string
  pixCopiaECola: string
}

interface CreateChargeParams {
  value: number               // R$ amount, e.g. 197.00
  debtorName: string
  debtorCpfOrCnpj: string     // digits only
  expiresInSeconds?: number   // default: 3600
  description?: string
  metadata?: Record<string, string>
}

interface QRCodeResponse {
  imagemQrcode: string        // base64 PNG
  qrcode: string              // copia-e-cola string
}

export class EfiBankClient {
  private config: EfiBankConfig
  private http: AxiosInstance
  private token: string | null = null
  private tokenExpiresAt = 0

  constructor(config?: Partial<EfiBankConfig>) {
    this.config = {
      clientId: config?.clientId ?? process.env.EFI_CLIENT_ID ?? '',
      clientSecret: config?.clientSecret ?? process.env.EFI_CLIENT_SECRET ?? '',
      pixKey: config?.pixKey ?? process.env.EFI_PIX_KEY ?? '',
      sandbox: config?.sandbox ?? process.env.EFI_SANDBOX === 'true',
      certPath: config?.certPath,
    }

    const baseURL = this.config.sandbox ? BASE_URL_SANDBOX : BASE_URL_PROD

    // In production Efi Bank requires mTLS (mutual TLS)
    // Provide path to .p12 certificate from your Efi account
    let httpsAgent: https.Agent | undefined
    if (this.config.certPath) {
      try {
        const cert = readFileSync(resolve(this.config.certPath))
        httpsAgent = new https.Agent({ pfx: cert, passphrase: '' })
      } catch {
        httpsAgent = undefined
      }
    }

    this.http = axios.create({
      baseURL,
      httpsAgent,
      timeout: 10_000,
    })
  }

  // ─── OAuth2 Token ────────────────────────────────────────────

  private async getAccessToken(): Promise<string> {
    if (this.token && Date.now() < this.tokenExpiresAt) {
      return this.token
    }

    const credentials = Buffer.from(
      `${this.config.clientId}:${this.config.clientSecret}`
    ).toString('base64')

    const { data } = await this.http.post(
      '/oauth/token',
      { grant_type: 'client_credentials' },
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
      }
    )

    this.token = data.access_token
    this.tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000
    return this.token!
  }

  private async authHeaders() {
    const token = await this.getAccessToken()
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  }

  // ─── Create Immediate Charge (cob) ───────────────────────────

  async createCharge(params: CreateChargeParams): Promise<PixCharge & { txid: string }> {
    const headers = await this.authHeaders()
    const txid = this.generateTxid()

    const isDoc = params.debtorCpfOrCnpj.replace(/\D/g, '')
    const debtorKey = isDoc.length === 11 ? 'cpf' : 'cnpj'

    const body = {
      calendario: { expiracao: params.expiresInSeconds ?? 3600 },
      devedor: {
        [debtorKey]: isDoc,
        nome: params.debtorName,
      },
      valor: { original: params.value.toFixed(2) },
      chave: this.config.pixKey,
      solicitacaoPagador: params.description ?? 'Pagamento TireFlow',
      infoAdicionais: params.metadata
        ? Object.entries(params.metadata).map(([nome, valor]) => ({ nome, valor }))
        : [],
    }

    const { data } = await this.http.put(`/v2/cob/${txid}`, body, { headers })
    return { ...data, txid }
  }

  // ─── Generate QR Code ─────────────────────────────────────────

  async getQRCode(locId: string): Promise<QRCodeResponse> {
    const headers = await this.authHeaders()
    const { data } = await this.http.get(`/v2/loc/${locId}/qrcode`, { headers })
    return data
  }

  // ─── Get Charge Status ────────────────────────────────────────

  async getCharge(txid: string): Promise<PixCharge> {
    const headers = await this.authHeaders()
    const { data } = await this.http.get(`/v2/cob/${txid}`, { headers })
    return data
  }

  // ─── Cancel Charge ────────────────────────────────────────────

  async cancelCharge(txid: string): Promise<void> {
    const headers = await this.authHeaders()
    await this.http.patch(
      `/v2/cob/${txid}`,
      { status: 'REMOVIDA_PELO_USUARIO_RECEBEDOR' },
      { headers }
    )
  }

  // ─── Register Webhook ─────────────────────────────────────────

  async registerWebhook(callbackUrl: string): Promise<void> {
    const headers = await this.authHeaders()
    await this.http.put(
      `/v2/webhook/${this.config.pixKey}`,
      { webhookUrl: callbackUrl },
      { headers }
    )
  }

  // ─── Validate Webhook Signature ───────────────────────────────

  validateWebhookPayload(payload: unknown): boolean {
    // Basic validation — in production verify certificate chain
    return typeof payload === 'object' && payload !== null && 'pix' in payload
  }

  // ─── Full Subscription Payment Flow ───────────────────────────

  async createSubscriptionCharge(params: {
    tenantId: string
    tenantName: string
    document: string
    plan: string
    amount: number
  }): Promise<{
    txid: string
    pixCopiaECola: string
    imagemQrcode: string
    expiresAt: Date
  }> {
    const charge = await this.createCharge({
      value: params.amount,
      debtorName: params.tenantName,
      debtorCpfOrCnpj: params.document,
      expiresInSeconds: 3600,
      description: `TireFlow — Plano ${params.plan}`,
      metadata: {
        tenant_id: params.tenantId,
        plan: params.plan,
      },
    })

    // Extract locId from location URL
    const locId = charge.location.split('/loc/')[1]
    const qr = await this.getQRCode(locId)

    return {
      txid: charge.txid,
      pixCopiaECola: qr.qrcode,
      imagemQrcode: qr.imagemQrcode,
      expiresAt: new Date(Date.now() + 3600_000),
    }
  }

  // ─── Utils ────────────────────────────────────────────────────

  private generateTxid(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    return Array.from({ length: 35 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  }
}

// Singleton
export const efibank = new EfiBankClient()
