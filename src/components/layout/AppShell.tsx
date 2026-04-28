import { useEffect } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { useUIStore } from '@/store/useUIStore'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { CommandPalette } from '@/components/command/CommandPalette'
import { ToastContainer } from '@/components/ui/Toast'

export function AppShell() {
  const { isAuthenticated } = useAuthStore()
  const loadNotifications = useUIStore((s) => s.loadNotifications)
  const notificationsLoaded = useUIStore((s) => s.notificationsLoaded)

  useEffect(() => {
    if (isAuthenticated && !notificationsLoaded) {
      loadNotifications()
    }
  }, [isAuthenticated, notificationsLoaded, loadNotifications])

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex h-screen bg-surface-950 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>
      <CommandPalette />
      <ToastContainer />
    </div>
  )
}
