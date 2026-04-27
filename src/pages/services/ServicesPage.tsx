import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wrench, Plus, Clock, CheckCircle, AlertCircle, Pencil, Trash2, Package } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { formatCurrency, formatRelativeTime } from '@/lib/formatters'
import { cn } from '@/lib/cn'

interface ServiceOrder {
  id: string
  client: string
  plate: string
  vehicle: string
  services: string[]
  total: number
  status: 'done' | 'in_progress' | 'pending'
  time: string
  operator: string
}

const INITIAL_ORDERS: ServiceOrder[] = [
  { id: 'sv01', client: 'João Pereira', plate: 'ABC-1234', vehicle: 'Honda Civic 2020', services: ['Montagem (4x)', 'Balanceamento (4x)'], total: 260, status: 'done', time: new Date(Date.now() - 3600000).toISOString(), operator: 'Carlos' },
  { id: 'sv02', client: 'Maria Santos', plate: 'GHI-9012', vehicle: 'VW Gol 2018', services: ['Alinhamento', 'Balanceamento (2x)'], total: 120, status: 'in_progress', time: new Date(Date.now() - 1800000).toISOString(), operator: 'Carlos' },
  { id: 'sv03', client: 'Carlos Oliveira', plate: 'JKL-3456', vehicle: 'Toyota Corolla 2022', services: ['Montagem (4x)', 'Balanceamento (4x)', 'Alinhamento'], total: 310, status: 'pending', time: new Date(Date.now() - 600000).toISOString(), operator: '—' },
]

interface FormState {
  client: string
  plate: string
  vehicle: string
  services: string
  total: string
  operator: string
  status: 'done' | 'in_progress' | 'pending'
}

const EMPTY_FORM: FormState = {
  client: '',
  plate: '',
  vehicle: '',
  services: '',
  total: '',
  operator: '',
  status: 'pending',
}

let nextId = 100

export function ServicesPage() {
  const { t } = useTranslation()
  const [orders, setOrders] = useState<ServiceOrder[]>(INITIAL_ORDERS)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const STATUS_CONFIG = {
    done: { label: t('services.done'), variant: 'success' as const, icon: <CheckCircle size={13} /> },
    in_progress: { label: t('services.inProgress'), variant: 'warning' as const, icon: <Clock size={13} /> },
    pending: { label: t('services.pending'), variant: 'outline' as const, icon: <AlertCircle size={13} /> },
  }

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  const openEdit = (order: ServiceOrder) => {
    setEditingId(order.id)
    setForm({
      client: order.client,
      plate: order.plate,
      vehicle: order.vehicle,
      services: order.services.join('\n'),
      total: String(order.total),
      operator: order.operator,
      status: order.status,
    })
    setModalOpen(true)
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    const servicesList = form.services.split('\n').map((s) => s.trim()).filter(Boolean)
    if (editingId) {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === editingId
            ? {
                ...o,
                client: form.client,
                plate: form.plate.toUpperCase(),
                vehicle: form.vehicle,
                services: servicesList,
                total: parseFloat(form.total) || 0,
                operator: form.operator,
                status: form.status,
              }
            : o
        )
      )
    } else {
      const newOrder: ServiceOrder = {
        id: `sv${++nextId}`,
        client: form.client,
        plate: form.plate.toUpperCase(),
        vehicle: form.vehicle,
        services: servicesList,
        total: parseFloat(form.total) || 0,
        operator: form.operator,
        status: form.status,
        time: new Date().toISOString(),
      }
      setOrders((prev) => [newOrder, ...prev])
    }
    setModalOpen(false)
  }

  const handleDelete = () => {
    if (deleteTarget) {
      setOrders((prev) => prev.filter((o) => o.id !== deleteTarget))
      setDeleteTarget(null)
    }
  }

  const field = (key: keyof FormState) => ({
    value: form[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  })

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div>
          <h1 className="text-xl font-bold text-zinc-100">{t('services.title')}</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{t('services.subtitle')}</p>
        </div>
        <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={openCreate}>
          {t('services.newOS')}
        </Button>
      </motion.div>

      <AnimatePresence mode="popLayout">
        {orders.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 gap-3"
          >
            <div className="w-14 h-14 rounded-2xl bg-surface-800 flex items-center justify-center">
              <Package size={24} className="text-zinc-600" />
            </div>
            <p className="text-sm font-medium text-zinc-400">{t('services.noOS')}</p>
            <p className="text-xs text-zinc-600">{t('services.noOSDesc')}</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {orders.map((sv, i) => {
              const sc = STATUS_CONFIG[sv.status]
              return (
                <motion.div
                  key={sv.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -16, transition: { duration: 0.2 } }}
                  transition={{ delay: i * 0.05 }}
                  className="surface-card p-4 flex items-start gap-4 hover:border-surface-600 transition-all"
                >
                  <div className={cn(
                    'p-2.5 rounded-xl mt-0.5',
                    sv.status === 'done' ? 'bg-emerald-500/10 text-emerald-400'
                    : sv.status === 'in_progress' ? 'bg-amber-500/10 text-amber-400'
                    : 'bg-surface-700 text-zinc-500'
                  )}>
                    <Wrench size={16} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-zinc-100">{sv.client}</p>
                      <span className="text-xs font-mono bg-surface-700 px-2 py-0.5 rounded text-zinc-400">
                        {sv.plate}
                      </span>
                      <Badge variant={sc.variant} size="sm">{sc.label}</Badge>
                    </div>
                    <p className="text-xs text-zinc-500 mb-2">{sv.vehicle}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {sv.services.map((s) => (
                        <span
                          key={s}
                          className="text-xs bg-surface-700 border border-surface-600 rounded-md px-2 py-0.5 text-zinc-400"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-zinc-100 tabular">{formatCurrency(sv.total)}</p>
                    <p className="text-xs text-zinc-500">{formatRelativeTime(sv.time)}</p>
                    <p className="text-xs text-zinc-600 mt-0.5">{sv.operator}</p>
                    <div className="flex items-center gap-1 mt-2 justify-end">
                      <button
                        onClick={() => openEdit(sv)}
                        className="p-1.5 rounded-lg hover:bg-surface-700 text-zinc-500 hover:text-zinc-200 transition-colors"
                        title={t('common.edit')}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(sv.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-colors"
                        title={t('common.delete')}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </AnimatePresence>

      {/* Create / Edit modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? t('services.editOS') : t('services.newOS')}
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('services.form.client')}
              placeholder="João Silva"
              required
              {...field('client')}
            />
            <Input
              label={t('services.form.plate')}
              placeholder="ABC-1234"
              required
              {...field('plate')}
            />
          </div>
          <Input
            label={t('services.form.vehicle')}
            placeholder="Honda Civic 2020"
            required
            {...field('vehicle')}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-300">{t('services.form.services')}</label>
            <textarea
              value={form.services}
              onChange={(e) => setForm((f) => ({ ...f, services: e.target.value }))}
              placeholder={`Montagem (4x)\nBalanceamento (4x)`}
              rows={3}
              required
              className="w-full rounded-lg border bg-surface-800 text-zinc-100 placeholder:text-zinc-500 border-surface-600 hover:border-surface-500 focus:border-brand-500 transition-colors duration-150 outline-none px-3 py-2 text-sm resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('services.form.total')}
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              required
              {...field('total')}
            />
            <Input
              label={t('services.form.operator')}
              placeholder="Carlos"
              {...field('operator')}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-300">{t('services.form.status')}</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as FormState['status'] }))}
              className="w-full h-9 rounded-lg border bg-surface-800 text-zinc-100 border-surface-600 hover:border-surface-500 focus:border-brand-500 transition-colors duration-150 outline-none px-3 text-sm"
            >
              <option value="pending">{t('services.pending')}</option>
              <option value="in_progress">{t('services.inProgress')}</option>
              <option value="done">{t('services.done')}</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={() => setModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary" className="flex-1">
              {t('common.save')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={t('services.deleteConfirm')}
        size="sm"
      >
        <p className="text-sm text-zinc-400 mb-6">{t('services.deleteMessage')}</p>
        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={() => setDeleteTarget(null)}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            className="flex-1 !bg-red-500 hover:!bg-red-600 !border-red-500"
            onClick={handleDelete}
          >
            {t('common.delete')}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
