import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Bot, Send, Sparkles, TrendingUp, Package, Users } from 'lucide-react'
import { useUIStore } from '@/store/useUIStore'
import { useAuthStore } from '@/store/useAuthStore'
import { ai } from '@/lib/api'
import { cn } from '@/lib/cn'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const SUGGESTIONS = [
  { icon: <TrendingUp size={13} />, text: 'Como estão as vendas este mês?' },
  { icon: <Package size={13} />, text: 'Quais produtos preciso repor?' },
  { icon: <Users size={13} />, text: 'Quais são meus melhores clientes?' },
  { icon: <Sparkles size={13} />, text: 'Sugerir pneu para Honda Civic 2020' },
]

const DEMO_RESPONSES: Record<string, string> = {
  default: 'Olá! Sou o TireFlow AI. Posso ajudar com análise de vendas, sugestões de estoque, informações sobre pneus e muito mais. Como posso ajudar?',
  vendas: '📊 **Resumo de Novembro:**\n\n• Receita: R$ 42.850 (+12,4% vs outubro)\n• 34 vendas realizadas\n• Ticket médio: R$ 1.260\n\nDestaque: Continental e Michelin foram as marcas mais vendidas. Recomendo manter estoque elevado dessas marcas.',
  repor: '⚠️ **Produtos que precisam de reposição:**\n\n🔴 **Crítico:** Pirelli P7 195/55R15 — estoque **zero**\n🟡 **Baixo:** Bridgestone Ecopia 185/65R15 — 2 unidades (mín: 6)\n🟡 **Atenção:** Continental 225/45R17 — 3 unidades (mín: 4)\n\nSugestão: solicite pedido para Bridgestone e Continental ainda hoje.',
  clientes: '👥 **Top 3 Clientes (novembro):**\n\n1. **Carlos Oliveira** — R$ 2.724 (frota empresarial)\n2. **Roberto Lima** — R$ 2.430 (transportadora)\n3. **João Pereira** — R$ 1.100\n\n💡 Dica: Carlos tem frota de 3 veículos. Considere oferecer um desconto de fidelidade para fidelizá-lo.',
  honda: '🚗 **Pneus para Honda Civic 2020:**\n\nMedida original: **205/55R16**\n\n**Disponível no seu estoque:**\n• ✅ Michelin Pilot Sport 4 — R$ 520/un (12 unid)\n\n**Recomendações por perfil:**\n• Econômico: Hankook Kinergy Eco\n• Performance: Continental ContiSportContact 5\n• Premium: Michelin Pilot Sport 4 ⭐\n\nPosso adicionar ao carrinho?',
}

function getResponse(text: string): string {
  const lower = text.toLowerCase()
  if (lower.includes('vend') || lower.includes('mes') || lower.includes('mês')) return DEMO_RESPONSES.vendas
  if (lower.includes('repo') || lower.includes('estoque') || lower.includes('falta')) return DEMO_RESPONSES.repor
  if (lower.includes('client')) return DEMO_RESPONSES.clientes
  if (lower.includes('honda') || lower.includes('civic') || lower.includes('pneu') || lower.includes('suger')) return DEMO_RESPONSES.honda
  return DEMO_RESPONSES.default
}

let msgId = 0

export function AIAssistant() {
  const { aiAssistantOpen, closeAIAssistant } = useUIStore()
  const { isAuthenticated } = useAuthStore()
  const [messages, setMessages] = useState<Message[]>([
    { id: 'm0', role: 'assistant', content: DEMO_RESPONSES.default, timestamp: new Date() }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg: Message = { id: `m${++msgId}`, role: 'user', content: text, timestamp: new Date() }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      // Use real API if authenticated, else fall back to demo responses
      let responseText: string
      if (isAuthenticated) {
        const history = [...messages, userMsg]
          .filter((m) => m.id !== 'm0')
          .map((m) => ({ role: m.role, content: m.content }))
        const res = await ai.chat(history)
        responseText = res.content
      } else {
        await new Promise((r) => setTimeout(r, 800 + Math.random() * 600))
        responseText = getResponse(text)
      }
      const aiMsg: Message = { id: `m${++msgId}`, role: 'assistant', content: responseText, timestamp: new Date() }
      setMessages((prev) => [...prev, aiMsg])
    } catch {
      // Fallback to demo responses on API error
      const aiMsg: Message = { id: `m${++msgId}`, role: 'assistant', content: getResponse(text), timestamp: new Date() }
      setMessages((prev) => [...prev, aiMsg])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return createPortal(
    <AnimatePresence>
      {aiAssistantOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[55] bg-black/30"
            onClick={closeAIAssistant}
          />
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed right-0 top-0 bottom-0 z-[56] w-full max-w-sm bg-surface-800 border-l border-surface-600 flex flex-col shadow-modal"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 h-14 border-b border-surface-700 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-brand-gradient flex items-center justify-center shadow-glow-sm">
                <Bot size={15} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-100">TireFlow AI</p>
                <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  Assistente ativo
                </p>
              </div>
              <button
                onClick={closeAIAssistant}
                className="ml-auto p-1.5 rounded-lg hover:bg-surface-600 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn('flex gap-2.5', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-full bg-brand-gradient flex items-center justify-center shrink-0 mt-0.5">
                      <Bot size={12} className="text-white" />
                    </div>
                  )}
                  <div
                    className={cn(
                      'max-w-[80%] rounded-xl px-3 py-2 text-sm',
                      msg.role === 'user'
                        ? 'bg-brand-500 text-white rounded-tr-sm'
                        : 'bg-surface-700 text-zinc-200 rounded-tl-sm border border-surface-600'
                    )}
                  >
                    {msg.content.split('\n').map((line, i) => (
                      <p key={i} className={cn('leading-relaxed', i > 0 && 'mt-1')}>
                        {line.startsWith('**') && line.endsWith('**')
                          ? <strong className="font-semibold">{line.slice(2, -2)}</strong>
                          : line
                        }
                      </p>
                    ))}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-brand-gradient flex items-center justify-center shrink-0">
                    <Bot size={12} className="text-white" />
                  </div>
                  <div className="bg-surface-700 rounded-xl rounded-tl-sm px-4 py-3 border border-surface-600">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          animate={{ y: [0, -4, 0] }}
                          transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }}
                          className="w-1.5 h-1.5 rounded-full bg-zinc-400"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Suggestions */}
            {messages.length <= 1 && (
              <div className="px-4 pb-3">
                <p className="text-[10px] text-zinc-500 mb-2 font-medium uppercase tracking-wide">Sugestões</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {SUGGESTIONS.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(s.text)}
                      className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-surface-700 hover:bg-surface-600 border border-surface-600 hover:border-surface-500 text-left transition-all duration-150"
                    >
                      <span className="text-brand-400 shrink-0">{s.icon}</span>
                      <span className="text-[11px] text-zinc-300 leading-tight">{s.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="px-4 pb-4 shrink-0 border-t border-surface-700 pt-3">
              <div className="flex items-end gap-2 bg-surface-700 rounded-xl border border-surface-600 hover:border-surface-500 focus-within:border-brand-500 transition-colors p-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Pergunte sobre vendas, estoque, pneus..."
                  rows={1}
                  className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 outline-none resize-none leading-relaxed"
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || loading}
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all',
                    input.trim() && !loading
                      ? 'bg-brand-500 text-white hover:bg-brand-600 shadow-glow-sm'
                      : 'bg-surface-600 text-zinc-600 cursor-not-allowed'
                  )}
                >
                  <Send size={14} />
                </button>
              </div>
              <p className="text-[10px] text-zinc-600 mt-1.5 text-center">
                Enter para enviar · Shift+Enter para nova linha
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
