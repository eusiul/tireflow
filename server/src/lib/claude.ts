/**
 * Claude API (Anthropic) — AI Assistant
 * Powers both the in-app assistant and WhatsApp chatbot
 *
 * Uses prompt caching for the system prompt to minimize costs.
 */

import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const SYSTEM_PROMPT = `Você é o TireFlow AI, assistente especializado em gestão de caucheiras e lojas de pneus.

Você tem acesso ao contexto da loja e pode ajudar com:
- Análise de vendas e performance
- Sugestões de estoque e reposição
- Recomendação de pneus por veículo/medida
- Informações sobre serviços (montagem, balanceamento, alinhamento)
- Geração de respostas comerciais para clientes
- Alertas e insights de negócio

Regras de resposta:
- Seja direto, prático e objetivo
- Use emojis com moderação para facilitar leitura
- Formate valores em R$ (moeda brasileira)
- Respostas curtas para perguntas simples, detalhadas para análises
- Sempre que sugerir pneus, informe a medida exata e marcas disponíveis em estoque
- Para WhatsApp: respostas em até 300 palavras
- Para o app: pode ser mais detalhado

Idioma: responda sempre no mesmo idioma da pergunta (PT-BR, ES ou EN).`

// ─── Types ───────────────────────────────────────────────────────────────────

interface TenantContext {
  tenantName: string
  plan: string
  lowStockProducts?: Array<{ name: string; stock: number; minStock: number }>
  recentSalesSummary?: { total: number; count: number; period: string }
  topClients?: Array<{ name: string; totalSpent: number }>
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

// ─── Main chat function ───────────────────────────────────────────────────────

export async function chatWithAI(
  messages: Message[],
  context?: TenantContext
): Promise<string> {
  const contextBlock = context
    ? `\n\nContexto atual da loja "${context.tenantName}" (Plano: ${context.plan}):\n${JSON.stringify(context, null, 2)}`
    : ''

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT + contextBlock,
        // Cache the system prompt to reduce costs on repeated calls
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  })

  const block = response.content[0]
  return block.type === 'text' ? block.text : ''
}

// ─── WhatsApp-specific handler ────────────────────────────────────────────────

export async function handleWhatsAppMessage(
  text: string,
  phone: string,
  tenantContext: TenantContext
): Promise<string> {
  // Simple single-turn for WhatsApp (no conversation history)
  return chatWithAI(
    [{ role: 'user', content: text }],
    tenantContext
  )
}

// ─── Tire recommendation ──────────────────────────────────────────────────────

export async function recommendTires(params: {
  vehicleDescription: string
  availableStock: Array<{ name: string; brand: string; size: string; price: number; stock: number }>
}): Promise<string> {
  const prompt = `O cliente quer pneus para: ${params.vehicleDescription}

Estoque disponível:
${params.availableStock.map((p) => `- ${p.brand} ${p.name} ${p.size} — R$ ${p.price} (${p.stock} un)`).join('\n')}

Recomende os melhores pneus para o veículo informado, justificando a escolha.`

  return chatWithAI([{ role: 'user', content: prompt }])
}

// ─── Sales analysis ───────────────────────────────────────────────────────────

export async function analyzeSales(params: {
  period: string
  totalRevenue: number
  salesCount: number
  topProducts: Array<{ name: string; sold: number; revenue: number }>
  comparedToPrevious?: { revenue: number; salesCount: number }
}): Promise<string> {
  const prompt = `Analise as vendas do período ${params.period}:

- Receita total: R$ ${params.totalRevenue.toFixed(2)}
- Número de vendas: ${params.salesCount}
- Ticket médio: R$ ${(params.totalRevenue / params.salesCount).toFixed(2)}
- Top produtos: ${params.topProducts.map((p) => `${p.name} (${p.sold} un)`).join(', ')}
${params.comparedToPrevious ? `- Período anterior: R$ ${params.comparedToPrevious.revenue.toFixed(2)} (${params.comparedToPrevious.salesCount} vendas)` : ''}

Forneça um resumo executivo com insights e recomendações de ação.`

  return chatWithAI([{ role: 'user', content: prompt }])
}
