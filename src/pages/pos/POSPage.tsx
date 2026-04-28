import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Plus, Minus, Trash2, ShoppingCart, User, Zap,
  CreditCard, Banknote, Smartphone, CheckCircle, X, Package, UserX
} from 'lucide-react'
import { useCartStore } from '@/store/useCartStore'
import { useUIStore } from '@/store/useUIStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useBarcodeScan } from '@/hooks/useBarcodeScan'
import { products as productsApi, sales as salesApi, clients as clientsApi } from '@/lib/api'
import { formatCurrency } from '@/lib/formatters'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/cn'
import type { Product, Client } from '@/types'

const CATEGORY_KEYS: Record<string, string> = {
  tire: 'pos.category_tire',
  rim: 'pos.category_rim',
  service: 'pos.category_service',
  accessory: 'pos.category_accessory',
}

const PAYMENT_METHOD_DEFS = [
  { id: 'pix', labelKey: 'pos.paymentPix', icon: <Smartphone size={18} /> },
  { id: 'cash', labelKey: 'pos.paymentCash', icon: <Banknote size={18} /> },
  { id: 'card', labelKey: 'pos.paymentCard', icon: <CreditCard size={18} /> },
]

function ProductCard({ product, onAdd }: { product: Product; onAdd: (p: Product) => void }) {
  const { t } = useTranslation()
  const isService = product.category === 'service'
  const outOfStock = product.stock <= 0 && !isService
  const lowStock = product.stock <= product.minStock && !isService && product.stock > 0

  return (
    <motion.button
      whileHover={{ scale: outOfStock ? 1 : 1.01 }}
      whileTap={{ scale: outOfStock ? 1 : 0.99 }}
      onClick={() => !outOfStock && onAdd(product)}
      disabled={outOfStock}
      className={cn(
        'w-full text-left p-3 rounded-xl border transition-all duration-150',
        'bg-surface-800 border-surface-700',
        outOfStock
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:bg-surface-700 hover:border-surface-600 active:bg-surface-600 cursor-pointer'
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-100 truncate">{product.name}</p>
          <p className="text-xs text-zinc-500 truncate">{product.brand} · {product.size}</p>
        </div>
        <div
          className={cn(
            'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
            outOfStock ? 'bg-red-500/10' : 'bg-brand-500/10'
          )}
        >
          {outOfStock ? <X size={14} className="text-red-400" /> : <Plus size={14} className="text-brand-400" />}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-base font-bold text-zinc-100 tabular">{formatCurrency(product.salePrice)}</span>
        <span className={cn(
          'text-[10px] font-medium px-1.5 py-0.5 rounded-md',
          isService
            ? 'bg-blue-500/10 text-blue-400'
            : outOfStock
            ? 'bg-red-500/10 text-red-400'
            : lowStock
            ? 'bg-amber-500/10 text-amber-400'
            : 'bg-emerald-500/10 text-emerald-400'
        )}>
          {isService ? t('pos.service') : outOfStock ? t('pos.outOfStock') : `${product.stock} un`}
        </span>
      </div>
    </motion.button>
  )
}

export function POSPage() {
  const { t } = useTranslation()
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('pix')
  const [paid, setPaid] = useState(false)
  const [saleLoading, setSaleLoading] = useState(false)
  const [amountReceived, setAmountReceived] = useState('')
  const [clientSelectorOpen, setClientSelectorOpen] = useState(false)
  const [clientSearch, setClientSearch] = useState('')
  const [allClients, setAllClients] = useState<Client[]>([])
  const [clientsLoading, setClientsLoading] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const { addToast } = useUIStore()
  const { user: _user } = useAuthStore()
  const cart = useCartStore()

  const openClientSelector = async () => {
    setClientSearch('')
    setClientSelectorOpen(true)
    setClientsLoading(true)
    try {
      const res = await clientsApi.list()
      setAllClients(res.clients)
    } catch {
      addToast({ type: 'error', title: t('pos.errorLoadClients') })
    } finally {
      setClientsLoading(false)
    }
  }

  const selectClient = (client: Client) => {
    cart.setClient(client)
    setClientSelectorOpen(false)
  }

  const filteredClients = allClients.filter((c) => {
    const q = clientSearch.toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      (c.phone || '').includes(q) ||
      (c.document || '').includes(q) ||
      (c.vehiclePlates || []).some((p) => p.toLowerCase().includes(q))
    )
  })

  useEffect(() => {
    productsApi.list({ limit: '200' }).then((res) => {
      setAllProducts(res.products)
    }).finally(() => setProductsLoading(false))
  }, [])

  const filtered = allProducts.filter((p) => {
    const q = search.toLowerCase()
    return (
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.size.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.barcode || '').includes(q)
    )
  })

  useBarcodeScan({
    onScan: async (code) => {
      try {
        const product = await productsApi.getByBarcode(code)
        cart.addItem(product)
        addToast({ type: 'success', title: t('pos.productAdded', { name: product.name }), message: `${product.brand} · ${product.size}` })
      } catch {
        addToast({ type: 'warning', title: t('pos.productNotFound'), message: t('pos.barcodeCode', { code }) })
      }
    },
  })

  const handleFinalize = async () => {
    setSaleLoading(true)
    try {
      const totalValue = cart.total()
      await salesApi.create({
        clientId: cart.client?.id || undefined,
        items: cart.items.map((item) => ({
          productId: item.product.id,
          qty: item.qty,
          unitPrice: item.unitPrice,
          discount: item.discount,
        })),
        discount: 0,
        paymentMethod,
        notifyClient: false,
        emitNFe: false,
      })
      setPaid(true)
      setTimeout(() => {
        setPaid(false)
        setPaymentOpen(false)
        cart.clearCart()
        addToast({ type: 'success', title: t('pos.saleFinalized'), message: t('pos.saleTotal', { value: formatCurrency(totalValue) }) })
      }, 2000)
    } catch {
      addToast({ type: 'error', title: t('pos.errorFinalize'), message: t('pos.tryAgain') })
    } finally {
      setSaleLoading(false)
    }
  }

  const change = amountReceived ? parseFloat(amountReceived.replace(',', '.')) - cart.total() : 0

  return (
    <div className="flex h-full">
      {/* Left — Products */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-surface-700">
        {/* Search */}
        <div className="p-4 border-b border-surface-700 bg-surface-900/50">
          <Input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('pos.searchPlaceholder')}
            icon={<Search size={15} />}
            size="lg"
          />
          <div className="flex items-center gap-2 mt-2">
            {['tire', 'service', 'accessory'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSearch(cat === 'tire' ? '' : cat)}
                className="text-xs px-2.5 py-1 rounded-full bg-surface-700 border border-surface-600 text-zinc-400 hover:text-zinc-200 hover:bg-surface-600 transition-all"
              >
                {t(CATEGORY_KEYS[cat])}
              </button>
            ))}
            <span className="text-xs text-zinc-600 ml-auto">
              {productsLoading ? '...' : t('pos.productsCount', { count: filtered.length })}
            </span>
          </div>
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {productsLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-6 h-6 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <Package size={32} className="text-zinc-700" />
              <p className="text-sm text-zinc-500">{t('pos.clientNotFound')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              {filtered.map((product) => (
                <ProductCard key={product.id} product={product} onAdd={cart.addItem} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right — Cart */}
      <div className="w-80 xl:w-96 flex flex-col bg-surface-900">
        {/* Cart header */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-surface-700 shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCart size={16} className="text-zinc-400" />
            <span className="text-sm font-semibold text-zinc-100">{t('pos.cart')}</span>
            {cart.itemCount() > 0 && (
              <Badge variant="brand" size="sm">{cart.itemCount()}</Badge>
            )}
          </div>
          {cart.items.length > 0 && (
            <button
              onClick={cart.clearCart}
              className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
            >
              {t('pos.clearCart')}
            </button>
          )}
        </div>

        {/* Client selector */}
        <div className="px-4 py-2 border-b border-surface-700">
          <div className="flex items-center gap-1.5">
            <button
              onClick={openClientSelector}
              className={cn(
                'flex items-center gap-2 flex-1 p-2 rounded-lg border transition-all text-left',
                cart.client
                  ? 'bg-brand-500/8 border-brand-500/25 hover:border-brand-500/40'
                  : 'bg-surface-800 border-surface-700 hover:border-surface-600'
              )}
            >
              <User size={14} className={cart.client ? 'text-brand-400 shrink-0' : 'text-zinc-500 shrink-0'} />
              <div className="flex-1 min-w-0">
                {cart.client ? (
                  <>
                    <p className="text-xs font-medium text-brand-300 truncate">{cart.client.name}</p>
                    {cart.client.vehiclePlates?.[0] && (
                      <p className="text-[10px] text-zinc-500">{cart.client.vehiclePlates[0]}</p>
                    )}
                  </>
                ) : (
                  <span className="text-sm text-zinc-500">{t('pos.selectClient')}</span>
                )}
              </div>
            </button>
            {cart.client && (
              <button
                onClick={() => cart.setClient(null)}
                className="p-2 rounded-lg hover:bg-surface-700 text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
              >
                <UserX size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto py-2">
          <AnimatePresence>
            {cart.items.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-40 gap-3"
              >
                <div className="w-12 h-12 rounded-2xl bg-surface-800 flex items-center justify-center">
                  <ShoppingCart size={20} className="text-zinc-600" />
                </div>
                <p className="text-sm text-zinc-500">{t('pos.emptyCart')}</p>
                <p className="text-xs text-zinc-600">{t('pos.emptyCartHint')}</p>
              </motion.div>
            ) : (
              cart.items.map((item) => (
                <motion.div
                  key={item.product.id}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  layout
                  className="flex items-center gap-3 px-4 py-2.5 border-b border-surface-800 hover:bg-surface-800/40 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">{item.product.name}</p>
                    <p className="text-xs text-zinc-500">{formatCurrency(item.unitPrice)}/un</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => cart.updateQty(item.product.id, item.qty - 1)}
                      className="w-6 h-6 rounded-md bg-surface-700 hover:bg-surface-600 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-all"
                    >
                      <Minus size={11} />
                    </button>
                    <span className="w-7 text-center text-sm font-medium text-zinc-100 tabular">{item.qty}</span>
                    <button
                      onClick={() => cart.updateQty(item.product.id, item.qty + 1)}
                      className="w-6 h-6 rounded-md bg-surface-700 hover:bg-surface-600 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-all"
                    >
                      <Plus size={11} />
                    </button>
                  </div>
                  <div className="text-right shrink-0 min-w-[60px]">
                    <p className="text-sm font-semibold text-zinc-100 tabular">
                      {formatCurrency(item.unitPrice * item.qty * (1 - item.discount / 100))}
                    </p>
                  </div>
                  <button
                    onClick={() => cart.removeItem(item.product.id)}
                    className="text-zinc-600 hover:text-red-400 transition-colors ml-1"
                  >
                    <Trash2 size={13} />
                  </button>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Cart summary */}
        <div className="border-t border-surface-700 p-4 space-y-2 shrink-0">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">{t('pos.subtotal')}</span>
            <span className="text-zinc-300 tabular">{formatCurrency(cart.subtotal())}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">{t('pos.discount')}</span>
            <span className="text-zinc-300 tabular">-{formatCurrency(0)}</span>
          </div>
          <div className="flex justify-between text-base font-bold border-t border-surface-700 pt-2">
            <span className="text-zinc-100">{t('pos.total')}</span>
            <span className="text-zinc-100 tabular">{formatCurrency(cart.total())}</span>
          </div>
          <Button
            variant="primary"
            size="lg"
            className="w-full mt-3"
            icon={<Zap size={16} />}
            disabled={cart.items.length === 0}
            onClick={() => setPaymentOpen(true)}
          >
            {t('pos.finalizeSale')}
          </Button>
        </div>
      </div>

      {/* Client Selector Modal */}
      <Modal
        open={clientSelectorOpen}
        onClose={() => setClientSelectorOpen(false)}
        title={t('pos.selectClientTitle')}
        subtitle={t('pos.selectClientSubtitle')}
        size="md"
      >
        <div className="space-y-3">
          <Input
            value={clientSearch}
            onChange={(e) => setClientSearch(e.target.value)}
            placeholder="João Silva, ABC-1234, 11987..."
            icon={<Search size={14} />}
            autoFocus
          />
          <div className="max-h-72 overflow-y-auto -mx-1 space-y-1">
            {clientsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <User size={24} className="text-zinc-700" />
                <p className="text-sm text-zinc-500">
                  {clientSearch ? t('pos.clientNotFound') : t('pos.noClients')}
                </p>
              </div>
            ) : (
              filteredClients.map((client) => (
                <button
                  key={client.id}
                  onClick={() => selectClient(client)}
                  className={cn(
                    'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl border text-left transition-all',
                    cart.client?.id === client.id
                      ? 'bg-brand-500/10 border-brand-500/30'
                      : 'bg-surface-700 border-surface-600 hover:bg-surface-600 hover:border-surface-500'
                  )}
                >
                  <div className="w-8 h-8 rounded-full bg-brand-gradient flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-100 truncate">{client.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {client.phone && <span className="text-xs text-zinc-500">{client.phone}</span>}
                      {client.vehiclePlates?.length > 0 && (
                        <span className="text-xs font-mono bg-surface-600 px-1.5 py-0.5 rounded text-zinc-400">
                          {client.vehiclePlates[0]}
                        </span>
                      )}
                    </div>
                  </div>
                  {cart.client?.id === client.id && (
                    <CheckCircle size={15} className="text-brand-400 shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      </Modal>

      {/* Payment Modal */}
      <Modal
        open={paymentOpen}
        onClose={() => !paid && setPaymentOpen(false)}
        title={t('pos.finalizeSale')}
        subtitle={`${t('pos.total')}: ${formatCurrency(cart.total())}`}
        size="sm"
      >
        {paid ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center gap-4 py-6"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
              className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center"
            >
              <CheckCircle size={32} className="text-emerald-400" />
            </motion.div>
            <p className="text-lg font-semibold text-zinc-100">{t('pos.saleDone')}</p>
            <p className="text-sm text-zinc-400">{formatCurrency(cart.total())} via {paymentMethod.toUpperCase()}</p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-zinc-400">{t('pos.selectPayment')}</p>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHOD_DEFS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setPaymentMethod(m.id)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-3 rounded-xl border transition-all',
                    paymentMethod === m.id
                      ? 'bg-brand-500/15 border-brand-500/40 text-brand-300'
                      : 'bg-surface-700 border-surface-600 text-zinc-400 hover:border-surface-500 hover:text-zinc-300'
                  )}
                >
                  {m.icon}
                  <span className="text-xs font-medium">{t(m.labelKey)}</span>
                </button>
              ))}
            </div>
            {paymentMethod === 'cash' && (
              <Input
                label={t('pos.amountReceived')}
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                placeholder="0,00"
                hint={change >= 0 ? t('pos.change', { value: formatCurrency(change) }) : ''}
              />
            )}
            {paymentMethod === 'pix' && (
              <div className="bg-surface-700 rounded-xl p-4 flex flex-col items-center gap-3">
                <div className="w-24 h-24 bg-white rounded-lg flex items-center justify-center">
                  <div className="grid grid-cols-5 gap-0.5 w-16 h-16">
                    {Array.from({ length: 25 }).map((_, i) => (
                      <div key={i} className={cn('rounded-sm', Math.random() > 0.5 ? 'bg-black' : 'bg-white')} />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-zinc-400 text-center">{t('pos.pixScan')}</p>
                <button className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
                  {t('pos.pixCopy')}
                </button>
              </div>
            )}
            <Button variant="primary" size="lg" className="w-full" icon={<Zap size={16} />} onClick={handleFinalize} loading={saleLoading}>
              {saleLoading ? t('pos.processing') : t('pos.confirmPayment')}
            </Button>
          </div>
        )}
      </Modal>
    </div>
  )
}
