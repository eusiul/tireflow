import { create } from 'zustand'
import type { Alert } from '@/types'

interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
}

const INITIAL_NOTIFICATIONS: Alert[] = [
  {
    id: 'n01',
    type: 'no_stock',
    severity: 'critical',
    title: 'Sem estoque: Pirelli P7 Cinturato 195/55R15',
    message: 'Produto com estoque zerado. Solicite reposição imediatamente.',
    read: false,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'n02',
    type: 'low_stock',
    severity: 'warning',
    title: 'Estoque baixo: Bridgestone Ecopia 185/65R15',
    message: 'Restam apenas 2 unidades (mínimo: 6). Considere repor o estoque.',
    read: false,
    createdAt: new Date(Date.now() - 14400000).toISOString(),
  },
  {
    id: 'n03',
    type: 'low_stock',
    severity: 'warning',
    title: 'Estoque baixo: Continental ContiSportContact 5',
    message: 'Restam apenas 3 unidades (mínimo: 4). Considere repor o estoque.',
    read: false,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
]

interface UIState {
  sidebarCollapsed: boolean
  commandPaletteOpen: boolean
  toasts: Toast[]
  notificationItems: Alert[]
  notificationsOpen: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (v: boolean) => void
  openCommandPalette: () => void
  closeCommandPalette: () => void
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  toggleNotifications: () => void
  closeNotifications: () => void
  markAllRead: () => void
  dismissNotification: (id: string) => void
}

let toastId = 0

export const useUIStore = create<UIState>((set, get) => ({
  sidebarCollapsed: false,
  commandPaletteOpen: false,
  toasts: [],
  notificationItems: INITIAL_NOTIFICATIONS,
  notificationsOpen: false,

  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),

  openCommandPalette: () => set({ commandPaletteOpen: true }),
  closeCommandPalette: () => set({ commandPaletteOpen: false }),

  addToast: (toast) => {
    const id = `toast_${++toastId}`
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }))
    const duration = toast.duration ?? 4000
    if (duration > 0) {
      setTimeout(() => get().removeToast(id), duration)
    }
  },
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  toggleNotifications: () => set((s) => ({ notificationsOpen: !s.notificationsOpen })),
  closeNotifications: () => set({ notificationsOpen: false }),

  markAllRead: () =>
    set((s) => ({
      notificationItems: s.notificationItems.map((n) => ({ ...n, read: true })),
    })),

  dismissNotification: (id) =>
    set((s) => ({
      notificationItems: s.notificationItems.filter((n) => n.id !== id),
    })),
}))
