import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, ShoppingCart, Package, Users, Settings,
  ChevronLeft, Zap, BarChart2, Wrench, CreditCard, LogOut,
  Layers
} from 'lucide-react'
import { useUIStore } from '@/store/useUIStore'
import { useAuthStore } from '@/store/useAuthStore'
import { cn } from '@/lib/cn'

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', shortcut: 'G D' },
  { to: '/pos', icon: ShoppingCart, label: 'Vendas / POS', shortcut: 'G V' },
  { to: '/inventory', icon: Package, label: 'Inventário', shortcut: 'G I' },
  { to: '/clients', icon: Users, label: 'Clientes', shortcut: 'G C' },
  { to: '/services', icon: Wrench, label: 'Serviços', shortcut: 'G S' },
  { to: '/reports', icon: BarChart2, label: 'Relatórios', shortcut: 'G R' },
]

const BOTTOM_ITEMS = [
  { to: '/subscription', icon: CreditCard, label: 'Plano' },
  { to: '/settings', icon: Settings, label: 'Configurações' },
]

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore()
  const { tenant, logout } = useAuthStore()
  const location = useLocation()

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 64 : 220 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex flex-col h-screen bg-surface-900 border-r border-surface-700 shrink-0 overflow-hidden z-20"
    >
      {/* Logo */}
      <div className="flex items-center h-14 px-3 border-b border-surface-700 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-brand-gradient flex items-center justify-center shrink-0 shadow-glow-sm">
            <Layers size={16} className="text-white" />
          </div>
          <motion.div
            animate={{ opacity: sidebarCollapsed ? 0 : 1, width: sidebarCollapsed ? 0 : 'auto' }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <span className="text-sm font-bold text-zinc-100 whitespace-nowrap">
              {tenant?.name || 'TireFlow'}
            </span>
            <span className="block text-[10px] text-zinc-500 whitespace-nowrap -mt-0.5">
              Sistema de Pneus
            </span>
          </motion.div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
          const active = location.pathname.startsWith(to)
          return (
            <NavLink
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-2.5 h-9 px-2.5 rounded-lg transition-all duration-150 relative group',
                'text-sm font-medium whitespace-nowrap',
                active
                  ? 'bg-brand-500/15 text-brand-300 border border-brand-500/20'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-surface-700 border border-transparent'
              )}
            >
              <Icon size={16} className="shrink-0" />
              <motion.span
                animate={{ opacity: sidebarCollapsed ? 0 : 1 }}
                transition={{ duration: 0.1 }}
                className="overflow-hidden"
              >
                {label}
              </motion.span>
              {active && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-brand-500 rounded-r-full"
                />
              )}
              {/* Tooltip when collapsed */}
              {sidebarCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-surface-700 border border-surface-600 rounded-lg text-xs text-zinc-200 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-card-hover z-50">
                  {label}
                </div>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-surface-700 py-2 px-2 space-y-0.5">
        {BOTTOM_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 h-9 px-2.5 rounded-lg transition-all duration-150 relative group',
                'text-sm font-medium whitespace-nowrap',
                isActive
                  ? 'bg-brand-500/15 text-brand-300 border border-brand-500/20'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-surface-700 border border-transparent'
              )
            }
          >
            <Icon size={16} className="shrink-0" />
            <motion.span
              animate={{ opacity: sidebarCollapsed ? 0 : 1 }}
              transition={{ duration: 0.1 }}
              className="overflow-hidden"
            >
              {label}
            </motion.span>
            {sidebarCollapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-surface-700 border border-surface-600 rounded-lg text-xs text-zinc-200 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-card-hover z-50">
                {label}
              </div>
            )}
          </NavLink>
        ))}
        <button
          onClick={logout}
          className="flex items-center gap-2.5 h-9 px-2.5 rounded-lg w-full transition-all duration-150 relative group text-zinc-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent whitespace-nowrap text-sm font-medium"
        >
          <LogOut size={16} className="shrink-0" />
          <motion.span
            animate={{ opacity: sidebarCollapsed ? 0 : 1 }}
            transition={{ duration: 0.1 }}
          >
            Sair
          </motion.span>
        </button>

        {/* Collapse toggle */}
        <button
          onClick={toggleSidebar}
          className="flex items-center gap-2.5 h-9 px-2.5 rounded-lg w-full transition-all duration-150 text-zinc-500 hover:text-zinc-300 hover:bg-surface-700 border border-transparent whitespace-nowrap text-sm"
        >
          <motion.div
            animate={{ rotate: sidebarCollapsed ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronLeft size={16} />
          </motion.div>
          <motion.span
            animate={{ opacity: sidebarCollapsed ? 0 : 1 }}
            transition={{ duration: 0.1 }}
          >
            Recolher
          </motion.span>
        </button>
      </div>

      {/* Plan badge */}
      {!sidebarCollapsed && tenant?.plan && (
        <div className="px-3 pb-3">
          <div className="flex items-center gap-1.5 bg-brand-500/10 border border-brand-500/20 rounded-lg px-2.5 py-1.5">
            <Zap size={11} className="text-brand-400 shrink-0" />
            <span className="text-[10px] font-medium text-brand-300 capitalize">
              Plano {tenant.plan}
            </span>
          </div>
        </div>
      )}
    </motion.aside>
  )
}
