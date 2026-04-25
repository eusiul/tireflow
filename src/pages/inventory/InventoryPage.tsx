import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Plus, Filter, Download, Package, AlertTriangle,
  Edit2, Trash2, BarChart2, X, ChevronDown, ChevronUp, RefreshCw
} from 'lucide-react'
import { products as productsApi } from '@/lib/api'
import { formatCurrency } from '@/lib/formatters'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/cn'
import type { Product } from '@/types'

const CATEGORY_BADGE: Record<string, { label: string; variant: 'brand' | 'info' | 'success' | 'default' }> = {
  tire: { label: 'Pneu', variant: 'brand' },
  rim: { label: 'Roda', variant: 'info' },
  service: { label: 'Serviço', variant: 'success' },
  accessory: { label: 'Acessório', variant: 'default' },
}

const EMPTY_FORM = {
  sku: '', barcode: '', name: '', brand: '', size: '',
  category: 'tire' as Product['category'],
  costPrice: 0, salePrice: 0, stock: 0, minStock: 0,
  supplier: '', location: '',
}

function StockIndicator({ product }: { product: Product }) {
  const isService = product.category === 'service'
  if (isService) return <Badge variant="info" size="sm" dot>Ilimitado</Badge>
  if (product.stock === 0) return <Badge variant="danger" size="sm" dot>Sem estoque</Badge>
  if (product.stock <= product.minStock) return <Badge variant="warning" size="sm" dot>{product.stock} un</Badge>
  return <Badge variant="success" size="sm" dot>{product.stock} un</Badge>
}

export function InventoryPage() {
  const [productList, setProductList] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all')
  const [sortField, setSortField] = useState<keyof Product>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  // Create / Edit modal
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Product | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (categoryFilter) params.category = categoryFilter
      if (search) params.search = search
      if (stockFilter !== 'all') params.lowStock = 'true'
      const res = await productsApi.list(params)
      setProductList(res.products)
      setTotal(res.total)
    } catch {
      // silently fail — keep previous data
    } finally {
      setLoading(false)
    }
  }, [search, categoryFilter, stockFilter])

  useEffect(() => {
    const t = setTimeout(fetchProducts, 300)
    return () => clearTimeout(t)
  }, [fetchProducts])

  const sorted = [...productList].sort((a, b) => {
    const av = a[sortField]
    const bv = b[sortField]
    const cmp = typeof av === 'number' ? (av as number) - (bv as number) : String(av).localeCompare(String(bv))
    return sortDir === 'asc' ? cmp : -cmp
  })

  const toggleSort = (field: keyof Product) => {
    if (sortField === field) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const SortIcon = ({ field }: { field: keyof Product }) => {
    if (sortField !== field) return <ChevronDown size={12} className="text-zinc-600" />
    return sortDir === 'asc' ? <ChevronUp size={12} className="text-brand-400" /> : <ChevronDown size={12} className="text-brand-400" />
  }

  const openCreate = () => {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setFormOpen(true)
  }

  const openEdit = (p: Product) => {
    setEditTarget(p)
    setForm({
      sku: p.sku, barcode: p.barcode ?? '', name: p.name, brand: p.brand, size: p.size,
      category: p.category, costPrice: p.costPrice, salePrice: p.salePrice,
      stock: p.stock, minStock: p.minStock, supplier: p.supplier ?? '', location: p.location ?? '',
    })
    setFormError('')
    setDetailOpen(false)
    setFormOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    setFormError('')
    try {
      const payload = {
        sku: form.sku,
        barcode: form.barcode || undefined,
        name: form.name,
        brand: form.brand,
        size: form.size,
        category: form.category,
        costPrice: Number(form.costPrice),
        salePrice: Number(form.salePrice),
        stock: Number(form.stock),
        minStock: Number(form.minStock),
        supplier: form.supplier || undefined,
        location: form.location || undefined,
      }
      if (editTarget) {
        await productsApi.update(editTarget.id, payload)
      } else {
        await productsApi.create(payload)
      }
      setFormOpen(false)
      fetchProducts()
    } catch (err: unknown) {
      const e = err as { message?: string }
      setFormError(e?.message === 'SKU already exists' ? 'Este SKU já está em uso.' : (e?.message || 'Erro ao salvar produto.'))
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await productsApi.delete(deleteTarget.id)
      setDeleteTarget(null)
      fetchProducts()
    } catch {
      // ignore
    } finally {
      setDeleteLoading(false)
    }
  }

  const lowStockCount = productList.filter((p) => p.stock > 0 && p.stock <= p.minStock).length
  const outStockCount = productList.filter((p) => p.stock === 0 && p.category !== 'service').length

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Inventário</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {loading ? 'Carregando...' : `${total} produtos cadastrados`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={<RefreshCw size={14} />} onClick={fetchProducts}>Atualizar</Button>
          <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={openCreate}>Novo Produto</Button>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-3 gap-3 mb-5"
      >
        {[
          { label: 'Total de SKUs', value: total, icon: <Package size={15} />, color: 'text-brand-400 bg-brand-500/10' },
          { label: 'Estoque baixo', value: lowStockCount, icon: <AlertTriangle size={15} />, color: 'text-amber-400 bg-amber-500/10' },
          { label: 'Sem estoque', value: outStockCount, icon: <X size={15} />, color: 'text-red-400 bg-red-500/10' },
        ].map((s) => (
          <div key={s.label} className="surface-card p-3 flex items-center gap-3">
            <div className={cn('p-2 rounded-lg shrink-0', s.color)}>{s.icon}</div>
            <div>
              <p className="text-lg font-bold text-zinc-100 tabular">{s.value}</p>
              <p className="text-xs text-zinc-500">{s.label}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="flex flex-wrap items-center gap-2 mb-4"
      >
        <div className="flex-1 min-w-52">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar produto, marca, medida, SKU..."
            icon={<Search size={14} />}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter size={14} className="text-zinc-500" />
          {['tire', 'service', 'accessory'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
              className={cn(
                'text-xs px-2.5 py-1.5 rounded-lg border transition-all',
                categoryFilter === cat
                  ? 'bg-brand-500/15 border-brand-500/30 text-brand-300'
                  : 'bg-surface-800 border-surface-700 text-zinc-400 hover:text-zinc-200 hover:border-surface-600'
              )}
            >
              {CATEGORY_BADGE[cat].label}
            </button>
          ))}
          <div className="w-px h-4 bg-surface-700" />
          {(['all', 'low', 'out'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setStockFilter(f)}
              className={cn(
                'text-xs px-2.5 py-1.5 rounded-lg border transition-all',
                stockFilter === f
                  ? 'bg-brand-500/15 border-brand-500/30 text-brand-300'
                  : 'bg-surface-800 border-surface-700 text-zinc-400 hover:text-zinc-200 hover:border-surface-600'
              )}
            >
              {f === 'all' ? 'Todos' : f === 'low' ? 'Baixo' : 'Zerado'}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="surface-card overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-700">
                {[
                  { label: 'Produto', field: 'name' as keyof Product },
                  { label: 'Marca', field: 'brand' as keyof Product },
                  { label: 'Medida', field: 'size' as keyof Product },
                  { label: 'Categoria', field: 'category' as keyof Product },
                  { label: 'Custo', field: 'costPrice' as keyof Product },
                  { label: 'Venda', field: 'salePrice' as keyof Product },
                  { label: 'Estoque', field: 'stock' as keyof Product },
                  { label: '', field: 'id' as keyof Product },
                ].map(({ label, field }) => (
                  <th
                    key={field}
                    onClick={() => label && toggleSort(field)}
                    className={cn(
                      'px-4 py-3 text-left text-xs font-medium text-zinc-500 whitespace-nowrap',
                      label && 'cursor-pointer hover:text-zinc-300 select-none'
                    )}
                  >
                    <span className="flex items-center gap-1">
                      {label}
                      {label && <SortIcon field={field} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/50">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="w-6 h-6 rounded-full border-2 border-brand-500 border-t-transparent animate-spin mx-auto" />
                  </td>
                </tr>
              ) : (
                <AnimatePresence>
                  {sorted.map((product, i) => (
                    <motion.tr
                      key={product.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="hover:bg-surface-700/30 transition-colors group"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-zinc-200">{product.name}</p>
                          <p className="text-xs text-zinc-600 font-mono">{product.sku}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-400">{product.brand}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono bg-surface-700 px-2 py-0.5 rounded text-zinc-300">
                          {product.size}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={CATEGORY_BADGE[product.category].variant} size="sm">
                          {CATEGORY_BADGE[product.category].label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-400 tabular">{formatCurrency(product.costPrice)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-zinc-200 tabular">{formatCurrency(product.salePrice)}</td>
                      <td className="px-4 py-3">
                        <StockIndicator product={product} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => { setSelectedProduct(product); setDetailOpen(true) }}
                            className="p-1.5 rounded-lg hover:bg-surface-600 text-zinc-500 hover:text-brand-400 transition-all"
                          >
                            <BarChart2 size={14} />
                          </button>
                          <button
                            onClick={() => openEdit(product)}
                            className="p-1.5 rounded-lg hover:bg-surface-600 text-zinc-500 hover:text-zinc-300 transition-all"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(product)}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>
        {!loading && sorted.length === 0 && (
          <div className="py-12 text-center">
            <Package size={32} className="text-zinc-700 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">Nenhum produto encontrado</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={openCreate} icon={<Plus size={14} />}>
              Adicionar produto
            </Button>
          </div>
        )}
      </motion.div>

      {/* Detail modal */}
      <Modal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={selectedProduct?.name}
        subtitle={`${selectedProduct?.brand} · ${selectedProduct?.size}`}
        size="md"
      >
        {selectedProduct && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'SKU', value: selectedProduct.sku },
                { label: 'Código de barras', value: selectedProduct.barcode || '—' },
                { label: 'Preço de custo', value: formatCurrency(selectedProduct.costPrice) },
                { label: 'Preço de venda', value: formatCurrency(selectedProduct.salePrice) },
                { label: 'Estoque atual', value: `${selectedProduct.stock} unidades` },
                { label: 'Estoque mínimo', value: `${selectedProduct.minStock} unidades` },
                { label: 'Fornecedor', value: selectedProduct.supplier || '—' },
                { label: 'Localização', value: selectedProduct.location || '—' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-surface-700 rounded-lg p-3">
                  <p className="text-xs text-zinc-500 mb-0.5">{label}</p>
                  <p className="text-sm font-medium text-zinc-200">{value}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="primary" size="sm" icon={<Edit2 size={14} />} onClick={() => openEdit(selectedProduct)}>
                Editar produto
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create / Edit modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editTarget ? 'Editar Produto' : 'Novo Produto'}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="SKU *"
              value={form.sku}
              onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
              placeholder="MICH-205-55R16"
              required
            />
            <Input
              label="Código de barras"
              value={form.barcode}
              onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
              placeholder="7891234560001"
            />
          </div>
          <Input
            label="Nome do produto *"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Pilot Sport 4"
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Marca *"
              value={form.brand}
              onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
              placeholder="Michelin"
              required
            />
            <Input
              label="Medida *"
              value={form.size}
              onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))}
              placeholder="205/55R16"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-300">Categoria *</label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as Product['category'] }))}
              className="h-9 rounded-lg border bg-surface-800 text-zinc-100 border-surface-600 hover:border-surface-500 focus:border-brand-500 transition-colors outline-none px-3 text-sm"
              required
            >
              <option value="tire">Pneu</option>
              <option value="rim">Roda</option>
              <option value="service">Serviço</option>
              <option value="accessory">Acessório</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Preço de custo (R$) *"
              type="number"
              min="0"
              step="0.01"
              value={form.costPrice}
              onChange={(e) => setForm((f) => ({ ...f, costPrice: parseFloat(e.target.value) || 0 }))}
              required
            />
            <Input
              label="Preço de venda (R$) *"
              type="number"
              min="0"
              step="0.01"
              value={form.salePrice}
              onChange={(e) => setForm((f) => ({ ...f, salePrice: parseFloat(e.target.value) || 0 }))}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Estoque inicial"
              type="number"
              min="0"
              value={form.stock}
              onChange={(e) => setForm((f) => ({ ...f, stock: parseInt(e.target.value) || 0 }))}
            />
            <Input
              label="Estoque mínimo"
              type="number"
              min="0"
              value={form.minStock}
              onChange={(e) => setForm((f) => ({ ...f, minStock: parseInt(e.target.value) || 0 }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Fornecedor"
              value={form.supplier}
              onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))}
              placeholder="Michelin Brasil"
            />
            <Input
              label="Localização"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              placeholder="A-01"
            />
          </div>
          {formError && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{formError}</p>
          )}
          <div className="flex items-center gap-2 pt-1">
            <Button type="submit" variant="primary" loading={formLoading}>
              {formLoading ? 'Salvando...' : (editTarget ? 'Salvar alterações' : 'Criar produto')}
            </Button>
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Excluir produto"
        size="sm"
      >
        <p className="text-sm text-zinc-400 mb-4">
          Tem certeza que deseja excluir <strong className="text-zinc-200">{deleteTarget?.name}</strong>? Esta ação não pode ser desfeita.
        </p>
        <div className="flex items-center gap-2">
          <Button variant="danger" loading={deleteLoading} onClick={handleDelete}>
            {deleteLoading ? 'Excluindo...' : 'Excluir'}
          </Button>
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
        </div>
      </Modal>
    </div>
  )
}
