/**
 * TireFlow API Client
 * All frontend ↔ backend communication goes through here.
 */
import type { Product, Client, Sale, User, Tenant } from '@/types'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1'

// ─── DB row → frontend type mappers ──────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProduct(row: any): Product {
  return {
    id: row.id,
    sku: row.sku,
    barcode: row.barcode,
    name: row.name,
    brand: row.brand,
    size: row.size,
    category: row.category,
    costPrice: parseFloat(row.cost_price ?? row.costPrice ?? 0),
    salePrice: parseFloat(row.sale_price ?? row.salePrice ?? 0),
    stock: parseInt(row.stock ?? 0),
    minStock: parseInt(row.min_stock ?? row.minStock ?? 0),
    supplier: row.supplier,
    location: row.location,
    imageUrl: row.image_url ?? row.imageUrl,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapClient(row: any): Client {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    document: row.document,
    vehiclePlates: row.vehicle_plates ?? row.vehiclePlates ?? [],
    totalSpent: parseFloat(row.total_spent ?? row.totalSpent ?? 0),
    totalVisits: parseInt(row.total_visits ?? row.totalVisits ?? 0),
    lastVisit: row.last_visit ?? row.lastVisit,
    notes: row.notes,
    createdAt: row.created_at ?? row.createdAt,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSale(row: any): Sale {
  return {
    id: row.id,
    clientId: row.client_id ?? row.clientId,
    clientName: row.client_name ?? row.clientName,
    items: row.items ?? [],
    subtotal: parseFloat(row.subtotal ?? 0),
    discount: parseFloat(row.discount ?? 0),
    total: parseFloat(row.total ?? 0),
    paymentMethod: row.payment_method ?? row.paymentMethod,
    status: row.payment_status ?? row.status,
    notes: row.notes,
    createdAt: row.created_at ?? row.createdAt,
    operatorId: row.operator_id ?? row.operatorId ?? '',
    operatorName: row.operator_name ?? row.operatorName ?? '',
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapUser(row: any): { user: User; tenant: Tenant } {
  return {
    user: {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      avatarUrl: row.avatar_url,
      tenantId: row.tenant_id,
    },
    tenant: {
      id: row.tenant_id,
      name: row.tenant_name,
      logoUrl: row.logo_url,
      primaryColor: row.primary_color,
      cnpj: row.cnpj,
      address: row.address,
      phone: row.phone,
      plan: row.plan,
      planStatus: row.plan_status,
    },
  }
}

// ─── Token management ────────────────────────────────────────────────────────

function getToken(): string | null {
  return localStorage.getItem('tf_access_token')
}

function setTokens(access: string, refresh: string) {
  localStorage.setItem('tf_access_token', access)
  localStorage.setItem('tf_refresh_token', refresh)
}

function clearTokens() {
  localStorage.removeItem('tf_access_token')
  localStorage.removeItem('tf_refresh_token')
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit & { skipAuth?: boolean } = {}
): Promise<T> {
  const { skipAuth, ...fetchOptions } = options
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string> || {}),
  }

  if (!skipAuth) {
    const token = getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  let res = await fetch(`${BASE_URL}${path}`, { ...fetchOptions, headers })

  // Auto-refresh on 401
  if (res.status === 401 && !skipAuth) {
    const refreshToken = localStorage.getItem('tf_refresh_token')
    if (refreshToken) {
      const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      if (refreshRes.ok) {
        const { accessToken } = await refreshRes.json()
        localStorage.setItem('tf_access_token', accessToken)
        headers['Authorization'] = `Bearer ${accessToken}`
        res = await fetch(`${BASE_URL}${path}`, { ...fetchOptions, headers })
      } else {
        clearTokens()
        window.location.href = '/login'
        throw new Error('Session expired')
      }
    }
  }

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ error: res.statusText }))
    throw Object.assign(new Error(errorBody.error || 'Request failed'), {
      status: res.status,
      body: errorBody,
    })
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const auth = {
  login: async (email: string, password: string) => {
    const data = await apiFetch<{
      accessToken: string; refreshToken: string
      user: { id: string; name: string; email: string; role: string; tenantId: string }
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      skipAuth: true,
    })
    setTokens(data.accessToken, data.refreshToken)
    return data
  },

  register: (params: { tenantName: string; name: string; email: string; password: string; cnpj?: string }) =>
    apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(params), skipAuth: true }),

  me: async (): Promise<{ user: User; tenant: Tenant }> => {
    const row = await apiFetch<Record<string, unknown>>('/auth/me')
    return mapUser(row)
  },

  logout: () => {
    clearTokens()
    window.location.href = '/login'
  },
}

// ─── Products ─────────────────────────────────────────────────────────────────

export const products = {
  list: async (params?: Record<string, string>): Promise<{ products: Product[]; total: number }> => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await apiFetch<{ products: any[]; total: number }>(`/products${qs}`)
    return { products: res.products.map(mapProduct), total: res.total }
  },
  get: async (id: string): Promise<Product> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = await apiFetch<any>(`/products/${id}`)
    return mapProduct(row)
  },
  getByBarcode: async (code: string): Promise<Product> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = await apiFetch<any>(`/products/barcode/${code}`)
    return mapProduct(row)
  },
  create: async (data: unknown): Promise<Product> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = await apiFetch<any>('/products', { method: 'POST', body: JSON.stringify(data) })
    return mapProduct(row)
  },
  update: async (id: string, data: unknown): Promise<Product> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = await apiFetch<any>(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
    return mapProduct(row)
  },
  adjustStock: (id: string, qty: number, type: string, notes?: string) =>
    apiFetch(`/products/${id}/adjust-stock`, { method: 'POST', body: JSON.stringify({ quantity: qty, type, notes }) }),
  delete: (id: string) => apiFetch(`/products/${id}`, { method: 'DELETE' }),
}

// ─── Sales ────────────────────────────────────────────────────────────────────

export const sales = {
  list: async (params?: Record<string, string>): Promise<{ sales: Sale[]; total: number }> => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await apiFetch<{ sales: any[]; total: number }>(`/sales${qs}`)
    return { sales: res.sales.map(mapSale), total: res.total }
  },
  summary: (period = 'month') => apiFetch<{ revenue: number; sales_count: number; avg_ticket: number }>(`/sales/summary?period=${period}`),
  get: async (id: string): Promise<Sale> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = await apiFetch<any>(`/sales/${id}`)
    return mapSale(row)
  },
  create: async (data: unknown): Promise<Sale> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = await apiFetch<any>('/sales', { method: 'POST', body: JSON.stringify(data) })
    return mapSale(row)
  },
  cancel: (id: string, reason: string) => apiFetch(`/sales/${id}`, { method: 'DELETE', body: JSON.stringify({ reason }) }),
}

// ─── Clients ──────────────────────────────────────────────────────────────────

export const clients = {
  list: async (search?: string): Promise<{ clients: Client[] }> => {
    const qs = search ? `?search=${encodeURIComponent(search)}` : ''
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await apiFetch<{ clients: any[] }>(`/clients${qs}`)
    return { clients: res.clients.map(mapClient) }
  },
  get: async (id: string): Promise<Client> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = await apiFetch<any>(`/clients/${id}`)
    return mapClient(row)
  },
  create: async (data: unknown): Promise<Client> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = await apiFetch<any>('/clients', { method: 'POST', body: JSON.stringify(data) })
    return mapClient(row)
  },
  update: async (id: string, data: unknown): Promise<Client> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = await apiFetch<any>(`/clients/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
    return mapClient(row)
  },
}

// ─── Payments (Pix) ───────────────────────────────────────────────────────────

export const payments = {
  createPixCharge: (plan: 'starter' | 'pro' | 'enterprise') =>
    apiFetch<{
      txid: string; pixCopiaECola: string; qrCodeBase64: string
      expiresAt: string; amount: number; plan: string; _mock?: boolean
    }>('/payments/subscription/pix', { method: 'POST', body: JSON.stringify({ plan }) }),

  checkPixStatus: (txid: string) =>
    apiFetch<{ status: 'paid' | 'pending'; plan: string }>(`/payments/subscription/status/${txid}`),

  history: () => apiFetch<{ events: unknown[] }>('/payments/history'),
}

// ─── NF-e ─────────────────────────────────────────────────────────────────────

export const nfe = {
  emit: (saleId: string, data: { destinatarioCpfCnpj?: string; destinatarioNome: string; destinatarioEmail?: string }) =>
    apiFetch(`/nfe/emit/${saleId}`, { method: 'POST', body: JSON.stringify(data) }),

  getDANFEUrl: (saleId: string) => `${BASE_URL}/nfe/${saleId}/danfe`,

  cancel: (saleId: string, justificativa: string) =>
    apiFetch(`/nfe/${saleId}`, { method: 'DELETE', body: JSON.stringify({ justificativa }) }),
}

// ─── WhatsApp ─────────────────────────────────────────────────────────────────

export const whatsappApi = {
  status: () => apiFetch<{ connected: boolean; state: string }>('/whatsapp/status'),
  getQRCode: () => apiFetch<{ qrCodeBase64?: string; message?: string }>('/whatsapp/qrcode'),
  send: (phone: string, message: string) =>
    apiFetch('/whatsapp/send', { method: 'POST', body: JSON.stringify({ phone, message }) }),
  notifyServiceReady: (serviceOrderId: string) =>
    apiFetch('/whatsapp/notify/service-ready', { method: 'POST', body: JSON.stringify({ serviceOrderId }) }),
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export const settings = {
  getTenant: () => apiFetch<Record<string, unknown>>('/settings/tenant'),

  updateTenant: (data: { name: string; cnpj?: string | null; phone?: string | null; address?: string | null; email?: string | null }) =>
    apiFetch<Record<string, unknown>>('/settings/tenant', { method: 'PATCH', body: JSON.stringify(data) }),

  uploadLogo: (logoBase64: string) =>
    apiFetch<{ logoUrl: string }>('/settings/logo', { method: 'POST', body: JSON.stringify({ logoBase64 }) }),

  deleteLogo: () =>
    apiFetch<{ logoUrl: null }>('/settings/logo', { method: 'DELETE' }),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiFetch<{ message: string }>('/settings/password', { method: 'PATCH', body: JSON.stringify({ currentPassword, newPassword }) }),

  listUsers: () =>
    apiFetch<{ users: Array<{ id: string; name: string; email: string; role: string; is_active: boolean; last_login_at: string | null }> }>('/settings/users'),

  updateUser: (data: { name: string }) =>
    apiFetch<{ id: string; name: string; email: string; role: string }>('/settings/user', { method: 'PATCH', body: JSON.stringify(data) }),
}

// ─── AI Chat ──────────────────────────────────────────────────────────────────

export const ai = {
  chat: (messages: Array<{ role: 'user' | 'assistant'; content: string }>) =>
    apiFetch<{ content: string }>('/ai/chat', { method: 'POST', body: JSON.stringify({ messages }) }),
}
