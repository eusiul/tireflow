import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Search, Plus, Users, TrendingUp, Star, Phone, Mail, Car, ChevronRight, Edit2 } from 'lucide-react'
import { clients as clientsApi } from '@/lib/api'
import { formatCurrency, formatRelativeTime, formatPhone } from '@/lib/formatters'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/cn'
import type { Client } from '@/types'

function ClientTier({ totalSpent }: { totalSpent: number }) {
  if (totalSpent >= 10000) return <Badge variant="brand" size="sm" dot>VIP</Badge>
  if (totalSpent >= 3000) return <Badge variant="success" size="sm" dot>Premium</Badge>
  if (totalSpent >= 1000) return <Badge variant="default" size="sm" dot>Regular</Badge>
  return <Badge variant="outline" size="sm">Novo</Badge>
}

const EMPTY_FORM = { name: '', phone: '', email: '', document: '', vehiclePlates: '', notes: '' }

export function ClientsPage() {
  const { t } = useTranslation()
  const [clientList, setClientList] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Client | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Client | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')

  const fetchClients = useCallback(async () => {
    setLoading(true)
    try {
      const res = await clientsApi.list(search || undefined)
      setClientList(res.clients)
    } catch { /* keep previous */ } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    const timer = setTimeout(fetchClients, 300)
    return () => clearTimeout(timer)
  }, [fetchClients])

  const openCreate = () => { setEditTarget(null); setForm(EMPTY_FORM); setFormError(''); setFormOpen(true) }
  const openEdit = (c: Client) => {
    setEditTarget(c)
    setForm({ name: c.name, phone: c.phone, email: c.email ?? '', document: c.document ?? '',
      vehiclePlates: c.vehiclePlates.join(', '), notes: c.notes ?? '' })
    setFormError(''); setFormOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setFormLoading(true); setFormError('')
    try {
      const payload = {
        name: form.name, phone: form.phone, email: form.email || undefined,
        document: form.document || undefined,
        vehiclePlates: form.vehiclePlates.split(',').map((p) => p.trim()).filter(Boolean),
        notes: form.notes || undefined,
      }
      if (editTarget) {
        const updated = await clientsApi.update(editTarget.id, payload)
        setClientList((prev) => prev.map((c) => c.id === updated.id ? updated : c))
        if (selected?.id === updated.id) setSelected(updated)
      } else {
        const created = await clientsApi.create(payload)
        setClientList((prev) => [created, ...prev])
      }
      setFormOpen(false)
    } catch (err: unknown) {
      const e = err as { message?: string }
      setFormError(e?.message || t('clients.errorSave'))
    } finally { setFormLoading(false) }
  }

  const totalRevenue = clientList.reduce((s, c) => s + c.totalSpent, 0)
  const avgSpent = clientList.length ? totalRevenue / clientList.length : 0

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">{t('clients.title')}</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {loading ? t('common.loading') : t('clients.subtitle', { count: clientList.length })}
          </p>
        </div>
        <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={openCreate}>{t('clients.newClient')}</Button>
      </motion.div>

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: t('clients.totalClients'), value: clientList.length, icon: <Users size={15} />, format: 'number' as const },
          { label: t('clients.totalRevenue'), value: totalRevenue, icon: <TrendingUp size={15} />, format: 'currency' as const },
          { label: t('clients.avgTicket'), value: avgSpent, icon: <Star size={15} />, format: 'currency' as const },
        ].map((s) => (
          <div key={s.label} className="surface-card p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-brand-500/10 text-brand-400 shrink-0">{s.icon}</div>
            <div>
              <p className="text-lg font-bold text-zinc-100 tabular">
                {s.format === 'currency' ? formatCurrency(s.value) : s.value}
              </p>
              <p className="text-xs text-zinc-500">{s.label}</p>
            </div>
          </div>
        ))}
      </motion.div>

      <div className="flex gap-4">
        {/* Left — list */}
        <div className="flex-1 min-w-0">
          <div className="mb-3">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('clients.searchPlaceholder')} icon={<Search size={14} />} />
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
            </div>
          ) : clientList.length === 0 ? (
            <div className="py-12 text-center">
              <Users size={32} className="text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-zinc-500">{t('clients.noClients')}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={openCreate} icon={<Plus size={14} />}>{t('clients.addClient')}</Button>
            </div>
          ) : (
            <div className="space-y-2">
              {clientList.map((client, i) => (
                <motion.button key={client.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  onClick={() => setSelected(client)}
                  className={cn('w-full text-left surface-card p-4 hover:border-surface-600 transition-all duration-150 flex items-center gap-4',
                    selected?.id === client.id && 'border-brand-500/40 bg-brand-500/5')}>
                  <div className="w-10 h-10 rounded-full bg-brand-gradient flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {client.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-medium text-zinc-200">{client.name}</p>
                      <ClientTier totalSpent={client.totalSpent} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                      <span className="flex items-center gap-1"><Phone size={10} /> {formatPhone(client.phone)}</span>
                      {client.vehiclePlates.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Car size={10} /> {client.vehiclePlates[0]}
                          {client.vehiclePlates.length > 1 && ` +${client.vehiclePlates.length - 1}`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-zinc-100 tabular">{formatCurrency(client.totalSpent)}</p>
                    <p className="text-xs text-zinc-500">{t('clients.visits', { count: client.totalVisits })}</p>
                  </div>
                  <ChevronRight size={16} className="text-zinc-600 shrink-0" />
                </motion.button>
              ))}
            </div>
          )}
        </div>

        {/* Right — detail panel */}
        <motion.div initial={false} animate={{ width: selected ? 320 : 0, opacity: selected ? 1 : 0 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }} className="shrink-0 overflow-hidden">
          {selected && (
            <div className="surface-card p-4 sticky top-4 w-80">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-brand-gradient flex items-center justify-center text-white font-bold text-lg">
                  {selected.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-zinc-100">{selected.name}</p>
                  <ClientTier totalSpent={selected.totalSpent} />
                </div>
                <button onClick={() => openEdit(selected)} className="p-1.5 rounded-lg hover:bg-surface-600 text-zinc-500 hover:text-zinc-300 transition-all">
                  <Edit2 size={14} />
                </button>
              </div>

              <div className="space-y-2 mb-4">
                {[
                  { icon: <Phone size={13} />, value: formatPhone(selected.phone) },
                  { icon: <Mail size={13} />, value: selected.email || '—' },
                ].map(({ icon, value }) => (
                  <div key={value} className="flex items-center gap-2 text-sm text-zinc-400">
                    <span className="text-zinc-600">{icon}</span>{value}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4">
                {[
                  { label: t('clients.detailTotalSpent'), value: formatCurrency(selected.totalSpent) },
                  { label: t('clients.detailVisits'), value: String(selected.totalVisits) },
                  { label: t('clients.detailLastVisit'), value: selected.lastVisit ? formatRelativeTime(selected.lastVisit) : '—' },
                  { label: t('clients.detailVehicles'), value: String(selected.vehiclePlates.length) },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-surface-700 rounded-lg p-2.5">
                    <p className="text-[10px] text-zinc-500 mb-0.5">{label}</p>
                    <p className="text-sm font-semibold text-zinc-100">{value}</p>
                  </div>
                ))}
              </div>

              {selected.vehiclePlates.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-zinc-500 mb-2 font-medium">{t('clients.detailPlates')}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.vehiclePlates.map((plate) => (
                      <span key={plate} className="flex items-center gap-1 text-xs font-mono bg-surface-700 border border-surface-600 rounded-md px-2 py-1 text-zinc-300">
                        <Car size={10} className="text-zinc-500" /> {plate}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selected.notes && (
                <div className="mb-4 bg-amber-500/8 border border-amber-500/15 rounded-lg p-3">
                  <p className="text-xs font-medium text-amber-400 mb-1">{t('clients.detailNotes')}</p>
                  <p className="text-xs text-zinc-400">{selected.notes}</p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>

      {/* Create / Edit modal */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editTarget ? t('clients.formEditTitle') : t('clients.formNewTitle')} size="md">
        <form onSubmit={handleSave} className="space-y-4">
          <Input label={t('clients.formName')} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="João da Silva" required />
          <div className="grid grid-cols-2 gap-3">
            <Input label={t('clients.formPhone')} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="(11) 99999-9999" required />
            <Input label={t('clients.formEmail')} type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="joao@email.com" />
          </div>
          <Input label={t('clients.formDocument')} value={form.document} onChange={(e) => setForm((f) => ({ ...f, document: e.target.value }))} placeholder="000.000.000-00" />
          <Input label={t('clients.formPlates')} value={form.vehiclePlates} onChange={(e) => setForm((f) => ({ ...f, vehiclePlates: e.target.value }))} placeholder={t('clients.formPlatesPlaceholder')} />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-300">{t('clients.formNotes')}</label>
            <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder={t('clients.formNotesPlaceholder')} rows={3}
              className="rounded-lg border bg-surface-800 text-zinc-100 placeholder:text-zinc-500 border-surface-600 hover:border-surface-500 focus:border-brand-500 transition-colors outline-none px-3 py-2 text-sm resize-none" />
          </div>
          {formError && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{formError}</p>}
          <div className="flex items-center gap-2 pt-1">
            <Button type="submit" variant="primary" loading={formLoading}>
              {formLoading ? t('clients.saving') : (editTarget ? t('clients.saveChanges') : t('clients.createClient'))}
            </Button>
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>{t('common.cancel')}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
