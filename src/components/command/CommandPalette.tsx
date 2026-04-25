import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, ShoppingCart, Package, Users, LayoutDashboard, BarChart2, Settings, ArrowRight, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useUIStore } from '@/store/useUIStore'
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut'
import { Kbd } from '@/components/ui/Kbd'
import { cn } from '@/lib/cn'

interface Command {
  id: string
  label: string
  description?: string
  icon: React.ReactNode
  section: string
  shortcut?: string[]
  action: () => void
}

export function CommandPalette() {
  const { commandPaletteOpen, openCommandPalette, closeCommandPalette } = useUIStore()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const COMMANDS: Command[] = [
    { id: 'goto-dashboard', label: 'Ir para Dashboard', icon: <LayoutDashboard size={15} />, section: 'Navegação', shortcut: ['G', 'D'], action: () => { navigate('/dashboard'); closeCommandPalette() } },
    { id: 'goto-pos', label: 'Ir para Vendas / POS', description: 'Ponto de venda', icon: <ShoppingCart size={15} />, section: 'Navegação', shortcut: ['G', 'V'], action: () => { navigate('/pos'); closeCommandPalette() } },
    { id: 'goto-inventory', label: 'Ir para Inventário', description: 'Gerenciar produtos e estoque', icon: <Package size={15} />, section: 'Navegação', shortcut: ['G', 'I'], action: () => { navigate('/inventory'); closeCommandPalette() } },
    { id: 'goto-clients', label: 'Ir para Clientes', description: 'Lista de clientes', icon: <Users size={15} />, section: 'Navegação', shortcut: ['G', 'C'], action: () => { navigate('/clients'); closeCommandPalette() } },
    { id: 'goto-reports', label: 'Ir para Relatórios', icon: <BarChart2 size={15} />, section: 'Navegação', shortcut: ['G', 'R'], action: () => { navigate('/reports'); closeCommandPalette() } },
    { id: 'new-sale', label: 'Nova Venda', description: 'Abrir ponto de venda', icon: <Zap size={15} />, section: 'Ações', action: () => { navigate('/pos'); closeCommandPalette() } },
    { id: 'new-product', label: 'Novo Produto', icon: <Package size={15} />, section: 'Ações', action: () => { navigate('/inventory?new=1'); closeCommandPalette() } },
    { id: 'new-client', label: 'Novo Cliente', icon: <Users size={15} />, section: 'Ações', action: () => { navigate('/clients?new=1'); closeCommandPalette() } },
    { id: 'settings', label: 'Configurações', icon: <Settings size={15} />, section: 'Sistema', action: () => { navigate('/settings'); closeCommandPalette() } },
  ]

  const filtered = query.trim()
    ? COMMANDS.filter((c) =>
        c.label.toLowerCase().includes(query.toLowerCase()) ||
        c.description?.toLowerCase().includes(query.toLowerCase()) ||
        c.section.toLowerCase().includes(query.toLowerCase())
      )
    : COMMANDS

  useKeyboardShortcut({
    key: 'k',
    modifiers: ['ctrl'],
    callback: openCommandPalette,
  })

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('')
      setSelectedIdx(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [commandPaletteOpen])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIdx((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        filtered[selectedIdx]?.action()
      } else if (e.key === 'Escape') {
        closeCommandPalette()
      }
    },
    [filtered, selectedIdx, closeCommandPalette]
  )

  // Group by section
  const sections = [...new Set(filtered.map((c) => c.section))]

  return createPortal(
    <AnimatePresence>
      {commandPaletteOpen && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[20vh] px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeCommandPalette}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-xl bg-surface-800 border border-surface-600 rounded-2xl shadow-modal overflow-hidden"
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 h-12 border-b border-surface-700">
              <Search size={16} className="text-zinc-500 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelectedIdx(0) }}
                onKeyDown={handleKeyDown}
                placeholder="Buscar ou executar uma ação..."
                className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 outline-none"
              />
              <Kbd>Esc</Kbd>
            </div>

            {/* Results */}
            <div className="max-h-80 overflow-y-auto py-2">
              {filtered.length === 0 ? (
                <p className="text-sm text-zinc-500 text-center py-8">
                  Nenhum resultado para "{query}"
                </p>
              ) : (
                sections.map((section) => {
                  const items = filtered.filter((c) => c.section === section)
                  return (
                    <div key={section} className="mb-1">
                      <p className="px-4 py-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                        {section}
                      </p>
                      {items.map((cmd) => {
                        const idx = filtered.indexOf(cmd)
                        return (
                          <button
                            key={cmd.id}
                            onClick={cmd.action}
                            onMouseEnter={() => setSelectedIdx(idx)}
                            className={cn(
                              'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                              idx === selectedIdx
                                ? 'bg-brand-500/10 text-zinc-100'
                                : 'text-zinc-300 hover:bg-surface-700'
                            )}
                          >
                            <span className={cn('shrink-0', idx === selectedIdx ? 'text-brand-400' : 'text-zinc-500')}>
                              {cmd.icon}
                            </span>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium">{cmd.label}</span>
                              {cmd.description && (
                                <span className="text-xs text-zinc-500 ml-2">{cmd.description}</span>
                              )}
                            </div>
                            {cmd.shortcut && (
                              <div className="flex items-center gap-0.5 shrink-0">
                                {cmd.shortcut.map((k) => <Kbd key={k}>{k}</Kbd>)}
                              </div>
                            )}
                            {idx === selectedIdx && (
                              <ArrowRight size={14} className="text-brand-400 shrink-0" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )
                })
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-surface-700 px-4 py-2 flex items-center gap-4 text-[10px] text-zinc-600">
              <span className="flex items-center gap-1"><Kbd>↑↓</Kbd> navegar</span>
              <span className="flex items-center gap-1"><Kbd>↵</Kbd> executar</span>
              <span className="flex items-center gap-1"><Kbd>Esc</Kbd> fechar</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
