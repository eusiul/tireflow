import { create } from 'zustand'
import { alertsApi } from '@/lib/api'
import type { Alert } from '@/types'

interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
}

interface UIState {
  sidebarCollapsed: boolean
  commandPaletteOpen: boolean
  toasts: Toast[]
  notificationItems: Alert[]
  notificationsOpen: boolean
  notificationsLoaded: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (v: boolean) => void
  openCommandPalette: () => void
  closeCommandPalette: () => void
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  toggleNotifications: () => void
  closeNotifications: () => void
  loadNotifications: () => Promise<void>
  markAllRead: () => Promise<void>
  dismissNotification: (id: string) => Promise<void>
}

let toastId = 0

export const useUIStore = create<UIState>((set, get) => ({
  sidebarCollapsed: false,
  commandPaletteOpen: false,
  toasts: [],
  notificationItems: [],
  notificationsOpen: false,
  notificationsLoaded: false,

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

  loadNotifications: async () => {
    try {
      const res = await alertsApi.list()
      const mapped: Alert[] = res.alerts.map((a) => ({
        id: a.id,
        type: a.type as Alert['type'],
        severity: a.severity as Alert['severity'],
        title: a.title,
        message: a.message,
        read: a.is_read,
        createdAt: a.created_at,
      }))
      set({ notificationItems: mapped, notificationsLoaded: true })
    } catch {
      set({ notificationsLoaded: true })
    }
  },

  markAllRead: async () => {
    try {
      await alertsApi.markAllRead()
    } catch { /* ignore */ }
    set((s) => ({
      notificationItems: s.notificationItems.map((n) => ({ ...n, read: true })),
    }))
  },

  dismissNotification: async (id) => {
    try {
      await alertsApi.dismiss(id)
    } catch { /* ignore */ }
    set((s) => ({
      notificationItems: s.notificationItems.filter((n) => n.id !== id),
    }))
  },
}))
