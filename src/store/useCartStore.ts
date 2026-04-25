import { create } from 'zustand'
import type { CartItem, Product, Client } from '@/types'

interface CartState {
  items: CartItem[]
  client: Client | null
  globalDiscount: number
  setClient: (client: Client | null) => void
  addItem: (product: Product) => void
  removeItem: (productId: string) => void
  updateQty: (productId: string, qty: number) => void
  updateItemDiscount: (productId: string, discount: number) => void
  setGlobalDiscount: (discount: number) => void
  clearCart: () => void
  subtotal: () => number
  total: () => number
  itemCount: () => number
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  client: null,
  globalDiscount: 0,

  setClient: (client) => set({ client }),

  addItem: (product) => {
    const existing = get().items.find((i) => i.product.id === product.id)
    if (existing) {
      set((s) => ({
        items: s.items.map((i) =>
          i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i
        ),
      }))
    } else {
      set((s) => ({
        items: [
          ...s.items,
          { product, qty: 1, discount: 0, unitPrice: product.salePrice },
        ],
      }))
    }
  },

  removeItem: (productId) =>
    set((s) => ({ items: s.items.filter((i) => i.product.id !== productId) })),

  updateQty: (productId, qty) => {
    if (qty <= 0) {
      get().removeItem(productId)
      return
    }
    set((s) => ({
      items: s.items.map((i) =>
        i.product.id === productId ? { ...i, qty } : i
      ),
    }))
  },

  updateItemDiscount: (productId, discount) =>
    set((s) => ({
      items: s.items.map((i) =>
        i.product.id === productId ? { ...i, discount } : i
      ),
    })),

  setGlobalDiscount: (globalDiscount) => set({ globalDiscount }),

  clearCart: () =>
    set({ items: [], client: null, globalDiscount: 0 }),

  subtotal: () => {
    return get().items.reduce((sum, item) => {
      const itemTotal = item.unitPrice * item.qty * (1 - item.discount / 100)
      return sum + itemTotal
    }, 0)
  },

  total: () => {
    const sub = get().subtotal()
    const disc = get().globalDiscount
    return sub * (1 - disc / 100)
  },

  itemCount: () => get().items.reduce((sum, i) => sum + i.qty, 0),
}))
