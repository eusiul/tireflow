import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Tenant } from '@/types'

interface AuthState {
  user: User | null
  tenant: Tenant | null
  token: string | null
  isAuthenticated: boolean
  login: (user: User, tenant: Tenant, token: string) => void
  logout: () => void
  updateTenant: (tenant: Partial<Tenant>) => void
}

const DEMO_USER: User = {
  id: 'usr_01',
  name: 'Carlos Silva',
  email: 'carlos@pneusmax.com.br',
  role: 'admin',
  tenantId: 'ten_01',
}

const DEMO_TENANT: Tenant = {
  id: 'ten_01',
  name: 'PneusMax',
  plan: 'pro',
  planStatus: 'active',
  cnpj: '12.345.678/0001-99',
  phone: '(11) 98765-4321',
  email: 'contato@pneusmax.com.br',
  address: 'Rua das Borrachas, 420 - São Paulo, SP',
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tenant: null,
      token: null,
      isAuthenticated: false,
      login: (user, tenant, token) =>
        set({ user, tenant, token, isAuthenticated: true }),
      logout: () =>
        set({ user: null, tenant: null, token: null, isAuthenticated: false }),
      updateTenant: (partial) =>
        set((s) => ({ tenant: s.tenant ? { ...s.tenant, ...partial } : null })),
    }),
    { name: 'tireflow-auth' }
  )
)

// Demo login helper
export function demoLogin() {
  useAuthStore.getState().login(DEMO_USER, DEMO_TENANT, 'demo_token_xyz')
}
