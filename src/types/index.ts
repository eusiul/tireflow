export interface Product {
  id: string
  sku: string
  barcode?: string
  name: string
  brand: string
  size: string
  category: 'tire' | 'rim' | 'service' | 'accessory'
  costPrice: number
  salePrice: number
  stock: number
  minStock: number
  supplier?: string
  location?: string
  imageUrl?: string
  createdAt: string
  updatedAt: string
}

export interface Client {
  id: string
  name: string
  email?: string
  phone: string
  document?: string
  vehiclePlates: string[]
  totalSpent: number
  totalVisits: number
  lastVisit?: string
  notes?: string
  createdAt: string
}

export interface SaleItem {
  productId: string
  productName: string
  productSku: string
  qty: number
  unitPrice: number
  discount: number
  total: number
}

export interface Sale {
  id: string
  clientId?: string
  clientName?: string
  items: SaleItem[]
  subtotal: number
  discount: number
  total: number
  paymentMethod: 'cash' | 'card' | 'transfer' | 'pix' | 'mixed'
  status: 'completed' | 'pending' | 'cancelled'
  notes?: string
  createdAt: string
  operatorId: string
  operatorName: string
}

export interface CartItem {
  product: Product
  qty: number
  discount: number
  unitPrice: number
}

export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'seller' | 'cashier'
  avatarUrl?: string
  tenantId: string
}

export interface Tenant {
  id: string
  name: string
  logoUrl?: string
  primaryColor?: string
  cnpj?: string
  address?: string
  phone?: string
  email?: string
  plan: 'starter' | 'pro' | 'enterprise'
  planStatus: 'active' | 'inactive' | 'trial'
  planExpiresAt?: string
}

export interface KPIData {
  label: string
  value: number
  change: number
  changeType: 'increase' | 'decrease' | 'neutral'
  format: 'currency' | 'number' | 'percent'
  sparkline?: number[]
}

export interface Alert {
  id: string
  type: 'low_stock' | 'no_stock' | 'pending_payment' | 'system'
  severity: 'critical' | 'warning' | 'info'
  title: string
  message: string
  productId?: string
  createdAt: string
  read: boolean
}
