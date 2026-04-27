import { useRef, useEffect } from 'react'
import { Search, Bell, Globe, X, AlertTriangle, CheckCircle, Info } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useUIStore } from '@/store/useUIStore'
import { useThemeStore } from '@/store/useThemeStore'
import { useAuthStore } from '@/store/useAuthStore'
import { Kbd } from '@/components/ui/Kbd'
import { cn } from '@/lib/cn'
import { formatRelativeTime } from '@/lib/formatters'

const LOCALE_LABELS: Record<string, string> = {
  'pt-BR': 'PT',
  es: 'ES',
  en: 'EN',
}

const LOCALE_CYCLE: Array<'pt-BR' | 'es' | 'en'> = ['pt-BR', 'es', 'en']

function SeverityIcon({ severity }: { severity: string }) {
  if (severity === 'critical') return <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
  if (severity === 'warning') return <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
  return <Info size={14} className="text-blue-400 shrink-0 mt-0.5" />
}

export function TopBar() {
  const { t } = useTranslation()
  const {
    openCommandPalette,
    notificationItems,
    notificationsOpen,
    toggleNotifications,
    closeNotifications,
    markAllRead,
    dismissNotification,
  } = useUIStore()
  const { locale, setLocale } = useThemeStore()
  const { user } = useAuthStore()
  const panelRef = useRef<HTMLDivElement>(null)

  const unreadCount = notificationItems.filter((n) => !n.read).length

  const cycleLocale = () => {
    const idx = LOCALE_CYCLE.indexOf(locale)
    setLocale(LOCALE_CYCLE[(idx + 1) % LOCALE_CYCLE.length])
  }

  useEffect(() => {
    if (!notificationsOpen) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        closeNotifications()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [notificationsOpen, closeNotifications])

  return (
    <header className="flex items-center h-14 px-4 border-b border-surface-700 bg-surface-900/80 backdrop-blur-sm shrink-0 relative z-40">
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
        <span className="text-xs">{t('topbar.searchPlaceholder')}</span>
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
          title={t('topbar.changeLanguage')}
        >
          <Globe size={14} />
          <span>{LOCALE_LABELS[locale]}</span>
        </button>

        {/* Notifications */}
        <div className="relative" ref={panelRef}>
          <button
            onClick={toggleNotifications}
            className={cn(
              'relative h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-150 border',
              notificationsOpen
                ? 'bg-surface-700 border-surface-600 text-zinc-200'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-surface-700 border-transparent hover:border-surface-600'
            )}
            title={t('topbar.notifications')}
          >
            <Bell size={15} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {notificationsOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.97 }}
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="absolute right-0 top-10 w-80 bg-surface-800 border border-surface-600 rounded-2xl shadow-modal z-50 overflow-hidden"
              >
                {/* Panel header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-surface-700">
                  <div className="flex items-center gap-2">
                    <Bell size={14} className="text-zinc-400" />
                    <span className="text-sm font-semibold text-zinc-100">{t('topbar.notifications')}</span>
                    {unreadCount > 0 && (
                      <span className="text-[10px] font-bold bg-red-500 text-white rounded-full px-1.5 py-0.5">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
                    >
                      {t('topbar.markAllRead')}
                    </button>
                  )}
                </div>

                {/* Items */}
                <div className="max-h-72 overflow-y-auto">
                  {notificationItems.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-8 px-4">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <CheckCircle size={18} className="text-emerald-400" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-zinc-200">{t('topbar.allRead')}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">{t('topbar.allReadDesc')}</p>
                      </div>
                    </div>
                  ) : (
                    notificationItems.map((n) => (
                      <div
                        key={n.id}
                        className={cn(
                          'flex items-start gap-3 px-4 py-3 border-b border-surface-700 last:border-0 transition-colors',
                          !n.read ? 'bg-surface-800/60' : 'opacity-50'
                        )}
                      >
                        <SeverityIcon severity={n.severity} />
                        <div className="flex-1 min-w-0">
                          <p className={cn('text-xs font-medium leading-snug', !n.read ? 'text-zinc-100' : 'text-zinc-400')}>
                            {n.title}
                          </p>
                          <p className="text-[11px] text-zinc-500 mt-0.5 leading-snug">{n.message}</p>
                          <p className="text-[10px] text-zinc-600 mt-1">{formatRelativeTime(n.createdAt)}</p>
                        </div>
                        <button
                          onClick={() => dismissNotification(n.id)}
                          className="p-1 rounded hover:bg-surface-600 text-zinc-600 hover:text-zinc-400 transition-colors shrink-0"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User Avatar */}
        <div className="h-8 w-8 rounded-full bg-brand-gradient flex items-center justify-center text-white text-xs font-bold ml-1 cursor-pointer border-2 border-brand-500/30 hover:border-brand-400/50 transition-colors">
          {user?.name?.charAt(0).toUpperCase() || 'U'}
        </div>
      </div>
    </header>
  )
}
