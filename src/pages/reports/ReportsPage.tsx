import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { BarChart2, TrendingUp, Package, Users, DollarSign } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Card, CardHeader } from '@/components/ui/Card'
import { formatCurrency } from '@/lib/formatters'
import { reports as reportsApi } from '@/lib/api'

interface Summary {
  revenue: number
  salesCount: number
  avgTicket: number
  productsCount: number
  clientsCount: number
}

interface RevenueItem { month: string; revenue: number; salesCount: number }
interface ProductItem { name: string; sold: number; revenue: number }
interface ClientItem { id: string; name: string; totalSpent: number; totalVisits: number }
interface PaymentItem { method: string; amount: number; count: number; pct: number }

const METHOD_COLORS: Record<string, string> = {
  pix: '#ef4444',
  card: '#b91c1c',
  cash: '#f87171',
  transfer: '#fca5a5',
  mixed: '#7f1d1d',
}
const METHOD_LABELS: Record<string, string> = {
  pix: 'Pix',
  card: 'Cartão / Card',
  cash: 'Dinheiro / Cash',
  transfer: 'Transferência',
  mixed: 'Misto / Mixed',
}

export function ReportsPage() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [revenue, setRevenue] = useState<RevenueItem[]>([])
  const [topProducts, setTopProducts] = useState<ProductItem[]>([])
  const [topClients, setTopClients] = useState<ClientItem[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentItem[]>([])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      reportsApi.summary(),
      reportsApi.revenue(),
      reportsApi.topProducts(),
      reportsApi.topClients(),
      reportsApi.paymentMethods(),
    ])
      .then(([s, r, tp, tc, pm]) => {
        setSummary(s)
        setRevenue(r.data)
        setTopProducts(tp.data)
        setTopClients(tc.data)
        setPaymentMethods(pm.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const kpis = [
    { label: t('reports.kpi.revenue'), value: summary ? formatCurrency(summary.revenue) : '—', icon: <DollarSign size={16} /> },
    { label: t('reports.kpi.sales'), value: summary ? String(summary.salesCount) : '—', icon: <BarChart2 size={16} /> },
    { label: t('reports.kpi.products'), value: summary ? String(summary.productsCount) : '—', icon: <Package size={16} /> },
    { label: t('reports.kpi.clients'), value: summary ? String(summary.clientsCount) : '—', icon: <Users size={16} /> },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500 text-sm">
        {t('reports.loading')}
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div>
          <h1 className="text-xl font-bold text-zinc-100">{t('reports.title')}</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{t('reports.subtitle')}</p>
        </div>
      </motion.div>

      {/* KPIs */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-4 gap-3 mb-6"
      >
        {kpis.map((kpi) => (
          <div key={kpi.label} className="surface-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="p-1.5 rounded-lg bg-surface-700 text-zinc-400">{kpi.icon}</div>
            </div>
            <p className="text-xl font-bold text-zinc-100 tabular">{kpi.value}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{kpi.label}</p>
          </div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly Revenue */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader title={t('reports.monthlyRevenue')} subtitle={t('reports.monthlySubtitle')} icon={<TrendingUp size={15} />} />
            {revenue.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-8">{t('reports.noData')}</p>
            ) : (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenue} barSize={28}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#71717a' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#71717a' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ background: '#1c1c1f', border: '1px solid #27272a', borderRadius: 12 }}
                      labelStyle={{ color: '#a1a1aa', fontSize: 11 }}
                      formatter={(v: number) => [formatCurrency(v), t('reports.revenue_label')]}
                    />
                    <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                      {revenue.map((_, i) => (
                        <Cell key={i} fill={i === revenue.length - 1 ? '#ef4444' : '#3f3f46'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Top Products */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card>
            <CardHeader title={t('reports.topProducts')} subtitle={t('reports.topProductsSub')} icon={<Package size={15} />} />
            {topProducts.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-8">{t('reports.noData')}</p>
            ) : (
              <div className="space-y-3">
                {topProducts.map((p, i) => (
                  <div key={p.name} className="flex items-center gap-3">
                    <span className="text-xs font-mono text-zinc-600 w-4">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-zinc-300 truncate">{p.name}</span>
                        <span className="text-zinc-500 shrink-0 ml-2">{t('reports.units', { count: p.sold })}</span>
                      </div>
                      <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-brand-500"
                          style={{ width: `${(p.sold / (topProducts[0]?.sold || 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-medium text-zinc-400 tabular w-24 text-right">{formatCurrency(p.revenue)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>

        {/* Top Clients */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardHeader title={t('reports.topClients')} subtitle={t('reports.topClientsSub')} icon={<Users size={15} />} />
            {topClients.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-8">{t('reports.noData')}</p>
            ) : (
              <div className="space-y-3">
                {topClients.map((c, i) => (
                  <div key={c.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-gradient flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-200 truncate">{c.name}</p>
                      <p className="text-xs text-zinc-500">{t('reports.visits', { count: c.totalVisits })}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-zinc-100 tabular">{formatCurrency(c.totalSpent)}</p>
                      <span className={`text-[10px] font-medium ${i === 0 ? 'text-brand-400' : 'text-zinc-600'}`}>
                        #{i + 1}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>

        {/* Payment Methods */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card>
            <CardHeader title={t('reports.paymentMethods')} subtitle={t('reports.paymentMethodsSub')} icon={<DollarSign size={15} />} />
            {paymentMethods.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-8">{t('reports.noData')}</p>
            ) : (
              <div className="space-y-3">
                {paymentMethods.map((m) => {
                  const color = METHOD_COLORS[m.method] ?? '#52525b'
                  const label = METHOD_LABELS[m.method] ?? m.method
                  return (
                    <div key={m.method} className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-zinc-300">{label}</span>
                          <span className="text-zinc-500">{m.pct}%</span>
                        </div>
                        <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${m.pct}%`, background: color }} />
                        </div>
                      </div>
                      <span className="text-xs text-zinc-400 tabular w-20 text-right">{formatCurrency(m.amount)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
