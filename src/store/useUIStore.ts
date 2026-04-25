import { create } from 'zustand'

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
  aiAssistantOpen: boolean
  toasts: Toast[]
  notifications: number
  toggleSidebar: () => void
  setSidebarCollapsed: (v: boolean) => void
  openCommandPalette: () => void
  closeCommandPalette: () => void
  toggleAIAssistant: () => void
  closeAIAssistant: () => void
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  setNotifications: (n: number) => void
}

let toastId = 0

export const useUIStore = create<UIState>((set, get) => ({
  sidebarCollapsed: false,
  commandPaletteOpen: false,
  aiAssistantOpen: false,
  toasts: [],
  notifications: 3,

  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),

  openCommandPalette: () => set({ commandPaletteOpen: true }),
  closeCommandPalette: () => set({ commandPaletteOpen: false }),

  toggleAIAssistant: () => set((s) => ({ aiAssistantOpen: !s.aiAssistantOpen })),
  closeAIAssistant: () => set({ aiAssistantOpen: false }),

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

  setNotifications: (n) => set({ notifications: n }),
}))
