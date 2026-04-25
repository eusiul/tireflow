import { Outlet, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { CommandPalette } from '@/components/command/CommandPalette'
import { AIAssistant } from '@/components/ai/AIAssistant'
import { ToastContainer } from '@/components/ui/Toast'

export function AppShell() {
  const { isAuthenticated } = useAuthStore()

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
      <AIAssistant />
      <ToastContainer />
    </div>
  )
}
