import { Search, Bell, Sun, Moon, Bot, Globe } from 'lucide-react'
import { motion } from 'framer-motion'
import { useUIStore } from '@/store/useUIStore'
import { useThemeStore } from '@/store/useThemeStore'
import { useAuthStore } from '@/store/useAuthStore'
import { Kbd } from '@/components/ui/Kbd'
import { cn } from '@/lib/cn'

const LOCALE_LABELS: Record<string, string> = {
  'pt-BR': 'PT',
  'es': 'ES',
  'en': 'EN',
}

const LOCALE_CYCLE: Array<'pt-BR' | 'es' | 'en'> = ['pt-BR', 'es', 'en']

export function TopBar() {
  const { openCommandPalette, toggleAIAssistant, notifications } = useUIStore()
  const { theme, toggleTheme, locale, setLocale } = useThemeStore()
  const { user } = useAuthStore()

  const cycleLocale = () => {
    const idx = LOCALE_CYCLE.indexOf(locale)
    setLocale(LOCALE_CYCLE[(idx + 1) % LOCALE_CYCLE.length])
  }

  return (
    <header className="flex items-center h-14 px-4 border-b border-surface-700 bg-surface-900/80 backdrop-blur-sm shrink-0">
      {/* Search trigger */}
      <button
        onClick={openCommandPalette}
        className={cn(
          'flex items-center gap-2 h-8 px-3 rounded-lg',
          'bg-surface-800 border border-surface-600 hover:border-surface-500',
          'text-zinc-500 hover:text-zinc-400 transition-all duration-150',
          'text-sm flex-1 max-w-xs mr-auto'
        )}
      >
        <Search size={14} />
        <span className="text-xs">Buscar ou executar...</span>
        <div className="ml-auto flex items-center gap-0.5">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </div>
      </button>

      <div className="flex items-center gap-1 ml-4">
        {/* Locale toggle */}
        <button
          onClick={cycleLocale}
          className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-surface-700 transition-all duration-150 text-xs font-medium border border-transparent hover:border-surface-600"
          title="Trocar idioma"
        >
          <Globe size={14} />
          <span>{LOCALE_LABELS[locale]}</span>
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-surface-700 transition-all duration-150 border border-transparent hover:border-surface-600"
          title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
        >
          <motion.div
            key={theme}
            initial={{ rotate: -30, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </motion.div>
        </button>

        {/* AI Assistant */}
        <button
          onClick={toggleAIAssistant}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-brand-400 hover:bg-brand-500/10 transition-all duration-150 border border-transparent hover:border-brand-500/20"
          title="Assistente IA (Ctrl+Space)"
        >
          <Bot size={15} />
        </button>

        {/* Notifications */}
        <button className="relative h-8 w-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-surface-700 transition-all duration-150 border border-transparent hover:border-surface-600">
          <Bell size={15} />
          {notifications > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white">
              {notifications > 9 ? '9+' : notifications}
            </span>
          )}
        </button>

        {/* User Avatar */}
        <div className="h-8 w-8 rounded-full bg-brand-gradient flex items-center justify-center text-white text-xs font-bold ml-1 cursor-pointer border-2 border-brand-500/30 hover:border-brand-400/50 transition-colors">
          {user?.name?.charAt(0).toUpperCase() || 'U'}
        </div>
      </div>
    </header>
  )
}
