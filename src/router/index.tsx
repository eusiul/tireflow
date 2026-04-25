import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'

const LoginPage = lazy(() => import('@/pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })))
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const POSPage = lazy(() => import('@/pages/pos/POSPage').then((m) => ({ default: m.POSPage })))
const InventoryPage = lazy(() => import('@/pages/inventory/InventoryPage').then((m) => ({ default: m.InventoryPage })))
const ClientsPage = lazy(() => import('@/pages/clients/ClientsPage').then((m) => ({ default: m.ClientsPage })))
const ServicesPage = lazy(() => import('@/pages/services/ServicesPage').then((m) => ({ default: m.ServicesPage })))
const ReportsPage = lazy(() => import('@/pages/reports/ReportsPage').then((m) => ({ default: m.ReportsPage })))
const SubscriptionPage = lazy(() => import('@/pages/subscription/SubscriptionPage').then((m) => ({ default: m.SubscriptionPage })))
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })))

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
    </div>
  )
}

function Wrap({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Wrap><LoginPage /></Wrap>,
  },
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <Wrap><DashboardPage /></Wrap> },
      { path: 'pos', element: <Wrap><POSPage /></Wrap> },
      { path: 'inventory', element: <Wrap><InventoryPage /></Wrap> },
      { path: 'clients', element: <Wrap><ClientsPage /></Wrap> },
      { path: 'services', element: <Wrap><ServicesPage /></Wrap> },
      { path: 'reports', element: <Wrap><ReportsPage /></Wrap> },
      { path: 'subscription', element: <Wrap><SubscriptionPage /></Wrap> },
      { path: 'settings', element: <Wrap><SettingsPage /></Wrap> },
    ],
  },
])
