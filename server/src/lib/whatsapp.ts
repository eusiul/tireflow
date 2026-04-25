/**
 * WhatsApp — Evolution API Client
 * Docs: https://doc.evolution-api.com/
 * Self-hosted: https://github.com/EvolutionAPI/evolution-api
 *
 * Funcionalidades implementadas:
 *   - Envio de mensagens de texto
 *   - Envio de mídia (PDFs, imagens)
 *   - Webhook de recebimento
 *   - Templates automáticos de negócio
 *   - Integração com AI Assistant
 */

import axios, { type AxiosInstance } from 'axios'

interface EvolutionConfig {
  apiUrl: string
  apiKey: string
  instance: string
}

interface SendTextParams {
  to: string          // '5511987654321' — number without +
  text: string
  delay?: number      // ms delay (simulate human typing)
  quoted?: { key: { id: string }; message: { conversation: string } }
}

interface SendMediaParams {
  to: string
  mediatype: 'audio' | 'document' | 'image' | 'video'
  mimetype: string
  caption?: string
  media: string       // base64 or URL
  fileName?: string
}

interface SendButtonsParams {
  to: string
  text: string
  buttons: Array<{ buttonId: string; buttonText: { displayText: string } }>
}

interface WebhookMessage {
  event: string
  instance: string
  data: {
    key: { remoteJid: string; id: string; fromMe: boolean }
    pushName: string
    message: { conversation?: string; extendedTextMessage?: { text: string } }
    messageTimestamp: number
  }
}

// ─── Business message templates ──────────────────────────────────────────────

export const TEMPLATES = {
  saleConfirmed: (params: {
    clientName: string
    total: string
    items: string
    saleId: string
  }) =>
    `✅ *Venda Confirmada!*\n\nOlá, ${params.clientName}!\n\nSua compra foi registrada com sucesso.\n\n*Itens:* ${params.items}\n*Total: ${params.total}*\n\n_Ref: #${params.saleId}_\n\nObrigado pela preferência! 🚗`,

  stockAlert: (params: { productName: string; stock: number; minStock: number }) =>
    `⚠️ *Alerta de Estoque*\n\n*${params.productName}* está com estoque baixo.\n\nDisponível: *${params.stock} unidades*\nMínimo: ${params.minStock} unidades\n\nConsidere repor o estoque.`,

  serviceReady: (params: { clientName: string; vehicle: string; plate: string }) =>
    `🔧 *Serviço Concluído!*\n\nOlá, ${params.clientName}!\n\nSeu veículo *${params.vehicle}* (${params.plate}) está pronto para retirada.\n\nPassar na loja quando puder! 😊`,

  paymentConfirmed: (params: { plan: string; validUntil: string }) =>
    `🎉 *Pagamento Confirmado!*\n\nSeu plano *${params.plan}* foi ativado com sucesso.\n\nVálido até: *${params.validUntil}*\n\nAcesse: https://app.tireflow.com.br`,

  appointmentReminder: (params: {
    clientName: string
    date: string
    service: string
  }) =>
    `🗓️ *Lembrete de Agendamento*\n\nOlá, ${params.clientName}!\n\nVocê tem um serviço agendado:\n\n*${params.service}*\n📅 ${params.date}\n\nQualquer dúvida, estamos aqui!`,
}

// ─── Client ──────────────────────────────────────────────────────────────────

export class WhatsAppClient {
  private config: EvolutionConfig
  private http: AxiosInstance

  constructor(config?: Partial<EvolutionConfig>) {
    this.config = {
      apiUrl: config?.apiUrl ?? process.env.EVOLUTION_API_URL ?? 'http://localhost:8080',
      apiKey: config?.apiKey ?? process.env.EVOLUTION_API_KEY ?? '',
      instance: config?.instance ?? process.env.EVOLUTION_INSTANCE ?? 'tireflow-main',
    }

    this.http = axios.create({
      baseURL: this.config.apiUrl,
      headers: {
        apikey: this.config.apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 15_000,
    })
  }

  // ─── Instance Management ──────────────────────────────────────

  async getInstanceStatus(): Promise<{ state: string; qrcode?: string }> {
    const { data } = await this.http.get(
      `/instance/connectionState/${this.config.instance}`
    )
    return data
  }

  async connectInstance(): Promise<{ qrcode?: { base64: string } }> {
    const { data } = await this.http.get(
      `/instance/connect/${this.config.instance}`
    )
    return data
  }

  // ─── Send Text ────────────────────────────────────────────────

  async sendText(params: SendTextParams): Promise<{ key: { id: string } }> {
    const { data } = await this.http.post(
      `/message/sendText/${this.config.instance}`,
      {
        number: this.normalizePhone(params.to),
        text: params.text,
        delay: params.delay ?? 1000,
        quoted: params.quoted,
      }
    )
    return data
  }

  // ─── Send Media ───────────────────────────────────────────────

  async sendMedia(params: SendMediaParams): Promise<{ key: { id: string } }> {
    const { data } = await this.http.post(
      `/message/sendMedia/${this.config.instance}`,
      {
        number: this.normalizePhone(params.to),
        mediatype: params.mediatype,
        mimetype: params.mimetype,
        caption: params.caption,
        media: params.media,
        fileName: params.fileName,
      }
    )
    return data
  }

  // ─── Send DANFE (NF-e PDF) ────────────────────────────────────

  async sendDANFE(phone: string, pdfBase64: string, saleRef: string): Promise<void> {
    await this.sendMedia({
      to: phone,
      mediatype: 'document',
      mimetype: 'application/pdf',
      caption: `📄 DANFE — Nota Fiscal Eletrônica #${saleRef}`,
      media: pdfBase64,
      fileName: `NF-${saleRef}.pdf`,
    })
  }

  // ─── Send Buttons (interactive) ──────────────────────────────

  async sendButtons(params: SendButtonsParams): Promise<void> {
    await this.http.post(`/message/sendButtons/${this.config.instance}`, {
      number: this.normalizePhone(params.to),
      description: params.text,
      buttons: params.buttons,
    })
  }

  // ─── Webhook Register ─────────────────────────────────────────

  async registerWebhook(callbackUrl: string): Promise<void> {
    await this.http.post(`/webhook/set/${this.config.instance}`, {
      enabled: true,
      url: callbackUrl,
      webhookByEvents: false,
      webhookBase64: false,
      events: ['MESSAGES_UPSERT'],
    })
  }

  // ─── AI Chat Handler ──────────────────────────────────────────

  async handleIncomingMessage(
    webhook: WebhookMessage,
    aiHandler: (message: string, phone: string) => Promise<string>
  ): Promise<void> {
    if (webhook.data.key.fromMe) return  // ignore outbound

    const phone = webhook.data.key.remoteJid.replace('@s.whatsapp.net', '')
    const text =
      webhook.data.message?.conversation ||
      webhook.data.message?.extendedTextMessage?.text ||
      ''

    if (!text.trim()) return

    try {
      // Simulate typing indicator
      await this.http.post(`/chat/sendPresence/${this.config.instance}`, {
        number: webhook.data.key.remoteJid,
        options: { presence: 'composing', delay: 2000 },
      })

      const reply = await aiHandler(text, phone)

      await this.sendText({ to: phone, text: reply, delay: 500 })
    } catch (err) {
      console.error('WhatsApp AI handler error:', err)
    }
  }

  // ─── Business automations ─────────────────────────────────────

  async notifySaleConfirmed(params: {
    phone: string
    clientName: string
    total: string
    items: string
    saleId: string
  }): Promise<void> {
    await this.sendText({
      to: params.phone,
      text: TEMPLATES.saleConfirmed(params),
    })
  }

  async notifyStockAlert(params: {
    adminPhone: string
    productName: string
    stock: number
    minStock: number
  }): Promise<void> {
    await this.sendText({
      to: params.adminPhone,
      text: TEMPLATES.stockAlert({
        productName: params.productName,
        stock: params.stock,
        minStock: params.minStock,
      }),
    })
  }

  async notifyServiceReady(params: {
    phone: string
    clientName: string
    vehicle: string
    plate: string
  }): Promise<void> {
    await this.sendText({
      to: params.phone,
      text: TEMPLATES.serviceReady(params),
    })
  }

  // ─── Utils ────────────────────────────────────────────────────

  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '')
    // Add Brazil country code if missing
    if (digits.length === 10 || digits.length === 11) {
      return `55${digits}`
    }
    return digits
  }
}

export const whatsapp = new WhatsAppClient()
