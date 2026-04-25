/**
 * Focus NF-e — API Client
 * Docs: https://focusnfe.com.br/doc/
 *
 * Fluxo NF-e:
 *   1. emitir()             → envia dados da nota
 *   2. consultar()          → verifica status (processando → autorizado)
 *   3. getPDF()             → DANFE em PDF
 *   4. cancelar()           → cancela nota emitida
 *   5. inutilizar()         → inutiliza numeração
 */

import axios, { type AxiosInstance } from 'axios'

const BASE_URL_PROD = 'https://api.focusnfe.com.br'
const BASE_URL_SANDBOX = 'https://homologacao.focusnfe.com.br'

interface FocusNFeConfig {
  token: string
  sandbox?: boolean
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface NFeEmitente {
  cnpj: string
  nome: string
  nomeFantasia?: string
  logradouro: string
  numero: string
  complemento?: string
  bairro: string
  municipio: string
  uf: string
  cep: string
  telefone?: string
  email?: string
  crt: '1' | '2' | '3'     // 1=Simples Nacional, 2=Simples Nacional Excesso, 3=Regime Normal
  ie: string                 // Inscrição Estadual
}

export interface NFeDestinatario {
  cpfCnpj: string
  nome: string
  logradouro?: string
  numero?: string
  bairro?: string
  municipio?: string
  uf?: string
  cep?: string
  telefone?: string
  email?: string
  indicadorIeDestinatario?: '1' | '2' | '9'  // 1=contribuinte, 2=isento, 9=não contribuinte
}

export interface NFeItem {
  numeroItem: string
  codigoProduto: string
  descricao: string
  ncm: string                // NCM do produto (pneus: 4011.10.00)
  cfop: string               // CFOP (ex: '5102' = venda dentro do estado)
  unidadeComercial: string   // 'UN', 'PC', etc.
  quantidade: number
  valorUnitario: number
  valorTotal: number
  codigoEan?: string
  origem?: '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8'
  // ICMS simplificado (CRT=1 Simples Nacional)
  modalidadeBcIcms?: '3'
  aliquotaIcmsSimples?: number
  valorIcmsSimples?: number
}

export interface NFeParams {
  naturezaOperacao: string    // 'Venda de mercadoria'
  dataEmissao: string         // ISO date
  dataEntradaSaida?: string
  tipoDocumento: '1'          // 1 = saída
  localDestino: '1' | '2' | '3'  // 1=interna, 2=interestadual, 3=exterior
  emitente: NFeEmitente
  destinatario: NFeDestinatario
  itens: NFeItem[]
  informacoesAdicionais?: string
  // Pagamento
  formaPagamento: Array<{
    indicadorFormaPagamento: '0' | '1'  // 0=à vista, 1=a prazo
    meioPagamento: '01' | '02' | '03' | '04' | '15' | '17'
    // 01=dinheiro, 02=cheque, 03=cartão crédito, 04=cartão débito, 15=boleto, 17=Pix
    valor: number
  }>
}

export interface NFeStatus {
  cnpj_emitente: string
  ref: string
  status: 'processando_autorizacao' | 'autorizado' | 'cancelado' | 'erro_autorizacao' | 'denegado'
  status_sefaz?: string
  mensagem_sefaz?: string
  chave_nfe?: string
  numero?: string
  serie?: string
  caminho_danfe?: string
  caminho_xml_nota_fiscal?: string
}

// ─── Client ──────────────────────────────────────────────────────────────────

export class FocusNFeClient {
  private config: FocusNFeConfig
  private http: AxiosInstance

  constructor(config?: Partial<FocusNFeConfig>) {
    this.config = {
      token: config?.token ?? process.env.FOCUS_NFE_TOKEN ?? '',
      sandbox: config?.sandbox ?? process.env.FOCUS_NFE_SANDBOX === 'true',
    }

    const baseURL = this.config.sandbox ? BASE_URL_SANDBOX : BASE_URL_PROD

    this.http = axios.create({
      baseURL,
      auth: { username: this.config.token, password: '' },
      timeout: 30_000,
    })
  }

  // ─── Emitir NF-e ─────────────────────────────────────────────

  async emitir(ref: string, params: NFeParams): Promise<NFeStatus> {
    const { data } = await this.http.post(
      `/v2/nfe?ref=${ref}`,
      { nfe: this.formatNFeBody(params) }
    )
    return data
  }

  // ─── Consultar Status ─────────────────────────────────────────

  async consultar(ref: string): Promise<NFeStatus> {
    const { data } = await this.http.get(`/v2/nfe/${ref}`)
    return data
  }

  // ─── Polling até autorização ──────────────────────────────────

  async aguardarAutorizacao(
    ref: string,
    maxAttempts = 10,
    intervalMs = 2000
  ): Promise<NFeStatus> {
    for (let i = 0; i < maxAttempts; i++) {
      const status = await this.consultar(ref)
      if (status.status === 'autorizado') return status
      if (status.status === 'erro_autorizacao' || status.status === 'denegado') {
        throw new Error(`NF-e rejected: ${status.mensagem_sefaz}`)
      }
      await new Promise((r) => setTimeout(r, intervalMs))
    }
    throw new Error('NF-e authorization timeout')
  }

  // ─── Download DANFE PDF ───────────────────────────────────────

  async getPDF(ref: string): Promise<Buffer> {
    const { data } = await this.http.get(`/v2/nfe/${ref}/danfe`, {
      responseType: 'arraybuffer',
    })
    return Buffer.from(data)
  }

  // ─── Download XML ─────────────────────────────────────────────

  async getXML(ref: string): Promise<string> {
    const { data } = await this.http.get(`/v2/nfe/${ref}/xml/nota`, {
      responseType: 'text',
    })
    return data
  }

  // ─── Cancelar ────────────────────────────────────────────────

  async cancelar(ref: string, justificativa: string): Promise<NFeStatus> {
    const { data } = await this.http.delete(`/v2/nfe/${ref}`, {
      data: { justificativa },
    })
    return data
  }

  // ─── Inutilizar numeração ─────────────────────────────────────

  async inutilizar(params: {
    cnpj: string
    serie: string
    numeroInicial: number
    numeroFinal: number
    justificativa: string
  }): Promise<unknown> {
    const { data } = await this.http.post('/v2/nfe/inutilizacao', params)
    return data
  }

  // ─── Factory: NF-e de Venda ───────────────────────────────────

  buildVendaNFeParams(params: {
    emitente: NFeEmitente
    destinatario: NFeDestinatario
    itens: NFeItem[]
    totalValue: number
    paymentMethod: 'cash' | 'card' | 'transfer' | 'pix' | 'mixed'
    observations?: string
  }): NFeParams {
    const meioPagamentoMap: Record<string, '01' | '03' | '04' | '17'> = {
      cash: '01',
      card: '03',
      transfer: '17',
      pix: '17',
      mixed: '01',
    }

    return {
      naturezaOperacao: 'Venda de mercadoria',
      dataEmissao: new Date().toISOString().split('T')[0],
      tipoDocumento: '1',
      localDestino: '1',
      emitente: params.emitente,
      destinatario: params.destinatario,
      itens: params.itens,
      informacoesAdicionais: params.observations,
      formaPagamento: [
        {
          indicadorFormaPagamento: '0',
          meioPagamento: meioPagamentoMap[params.paymentMethod] ?? '01',
          valor: params.totalValue,
        },
      ],
    }
  }

  // ─── Internal helpers ─────────────────────────────────────────

  private formatNFeBody(params: NFeParams): Record<string, unknown> {
    return {
      natureza_operacao: params.naturezaOperacao,
      data_emissao: params.dataEmissao,
      tipo_documento: params.tipoDocumento,
      local_destino: params.localDestino,
      emitente: {
        cnpj: params.emitente.cnpj.replace(/\D/g, ''),
        nome: params.emitente.nome,
        nome_fantasia: params.emitente.nomeFantasia,
        logradouro: params.emitente.logradouro,
        numero: params.emitente.numero,
        complemento: params.emitente.complemento,
        bairro: params.emitente.bairro,
        municipio: params.emitente.municipio,
        uf: params.emitente.uf,
        cep: params.emitente.cep.replace(/\D/g, ''),
        telefone: params.emitente.telefone?.replace(/\D/g, ''),
        email: params.emitente.email,
        crt: params.emitente.crt,
        inscricao_estadual: params.emitente.ie,
      },
      destinatario: {
        cpf_cnpj: params.destinatario.cpfCnpj.replace(/\D/g, ''),
        nome: params.destinatario.nome,
        logradouro: params.destinatario.logradouro,
        numero: params.destinatario.numero,
        bairro: params.destinatario.bairro,
        municipio: params.destinatario.municipio,
        uf: params.destinatario.uf,
        cep: params.destinatario.cep?.replace(/\D/g, ''),
        telefone: params.destinatario.telefone?.replace(/\D/g, ''),
        email: params.destinatario.email,
        indicador_ie_destinatario: params.destinatario.indicadorIeDestinatario ?? '9',
      },
      items: params.itens.map((item) => ({
        numero_item: item.numeroItem,
        codigo_produto: item.codigoProduto,
        descricao: item.descricao,
        ncm: item.ncm,
        cfop: item.cfop,
        unidade_comercial: item.unidadeComercial,
        quantidade_comercial: item.quantidade,
        valor_unitario_comercial: item.valorUnitario,
        valor_bruto: item.valorTotal,
        codigo_ean: item.codigoEan ?? 'SEM GTIN',
        origem_mercadoria: item.origem ?? '0',
        modalidade_determinacao_bc_icms: item.modalidadeBcIcms,
        aliquota_icms_simples_nacional: item.aliquotaIcmsSimples,
        valor_icms_simples_nacional: item.valorIcmsSimples,
      })),
      formas_pagamento: params.formaPagamento.map((fp) => ({
        forma_pagamento: fp.indicadorFormaPagamento,
        meio_pagamento: fp.meioPagamento,
        valor_pagamento: fp.valor,
      })),
      informacoes_adicionais_contribuinte: params.informacoesAdicionais,
    }
  }

  // ─── NCM helper para pneus ────────────────────────────────────

  static NCM = {
    PNEU_AUTOMOVEL: '40111000',    // Pneus para automóveis
    PNEU_UTILITARIO: '40112000',   // Pneus para ônibus/caminhões
    PNEU_MOTOCICLETA: '40113000',  // Pneus para motocicletas
    RODA_ALUMINIO: '87087009',     // Rodas de alumínio
    SERVICO_MONTAGEM: '99999999',  // Serviço (não incide ICMS)
  }
}

export const focusNFe = new FocusNFeClient()
