import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, ShoppingCart, Package, DollarSign, AlertTriangle, ArrowRight, Zap, RefreshCw } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { Link } from 'react-router-dom'
import { sales as salesApi, products as productsApi } from '@/lib/api'
import { formatCurrency, formatRelativeTime } from '@/lib/formatters'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { Sale, Product } from '@/types'

const CATEGORY_COLORS: Record<string, string> = {
  tire: '#8b5cf6',
  rim: '#3b82f6',
  service: '#10b981',
  accessory: '#f59e0b',
}
const CATEGORY_LABELS: Record<string, string> = {
  tire: 'Pneus', rim: 'Rodas', service: 'Serviços', accessory: 'Acessórios',
}

const containerVariants = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }
const itemVariants = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } } }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-700 border border-surface-600 rounded-xl px-3 py-2 shadow-card-hover">
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      {payload.map((p: { name: string; color: string; value: number }) => (
        <p key={p.name} className="text-sm font-medium" style={{ color: p.color }}>
          Receita: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  )
}

export function DashboardPage() {
  const [summary, setSummary] = useState<{ revenue: number; sales_count: number; avg_ticket: number } | null>(null)
  const [recentSales, setRecentSales] = useState<Sale[]>([])
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [sumRes, salesRes, stockRes] = await Promise.all([
        salesApi.summary('month'),
        salesApi.list({ limit: '8' }),
        productsApi.list({ lowStock: 'true', limit: '10' }),
      ])
      setSummary(sumRes)
      setRecentSales(salesRes.sales)
      setLowStockProducts(stockRes.products)
    } catch {
      // keep previous data
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const kpis = summary ? [
    { label: 'Receita (30 dias)', value: summary.revenue, format: 'currency' as const, icon: DollarSign, change: null },
    { label: 'Vendas (30 dias)', value: summary.sales_count, format: 'number' as const, icon: ShoppingCart, change: null },
    { label: 'Ticket médio', value: summary.avg_ticket, format: 'currency' as const, icon: TrendingUp, change: null },
    { label: 'Baixo estoque', value: lowStockProducts.length, format: 'number' as const, icon: Package, change: null },
  ] : []

  // Category breakdown from recent sales
  const categoryMap: Record<string, number> = {}
  lowStockProducts.forEach((p) => {
    categoryMap[p.category] = (categoryMap[p.category] || 0) + 1
  })
  const categoryData = Object.entries(categoryMap).map(([cat, count]) => ({
    name: CATEGORY_LABELS[cat] || cat,
    value: count,
    color: CATEGORY_COLORS[cat] || '#71717a',
  }))

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Visão geral do negócio</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={<RefreshCw size={14} />} onClick={fetchData}>Atualizar</Button>
          <Link to="/pos">
            <Button variant="primary" size="sm" icon={<Zap size={14} />}>
              Nova Venda
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* KPIs */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="surface-card h-24 animate-pulse" />
          ))}
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
        >
          {kpis.map((kpi) => {
            const Icon = kpi.icon
            return (
              <motion.div key={kpi.label} variants={itemVariants}>
                <Card className="relative overflow-hidden group hover:border-surface-600 transition-all duration-200">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-brand-500/5 rounded-full blur-2xl" />
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 rounded-lg bg-surface-700 text-zinc-400 group-hover:bg-brand-500/10 group-hover:text-brand-400 transition-all">
                      <Icon size={16} />
                    </div>
                    <span className="flex items-center gap-1 text-xs font-medium text-zinc-500">—</span>
                  </div>
                  <div className="mb-1">
                    <p className="text-2xl font-bold text-zinc-100 tabular">
                      {kpi.format === 'currency' ? formatCurrency(kpi.value) : kpi.value.toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <p className="text-xs text-zinc-500">{kpi.label}</p>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Sales */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2"
        >
          <Card padding="none">
            <div className="flex items-center justify-between p-4 border-b border-surface-700">
              <h3 className="text-sm font-semibold text-zinc-100">Vendas Recentes</h3>
              <Link to="/pos">
                <Button variant="ghost" size="xs" iconRight={<ArrowRight size={12} />}>Ver todas</Button>
              </Link>
            </div>
            {loading ? (
              <div className="p-4 space-y-3">
                {[0, 1, 2, 3].map((i) => <div key={i} className="h-10 bg-surface-700/50 rounded-lg animate-pulse" />)}
              </div>
            ) : recentSales.length === 0 ? (
              <div className="py-8 text-center">
                <ShoppingCart size={24} className="text-zinc-700 mx-auto mb-2" />
                <p className="text-xs text-zinc-500">Nenhuma venda ainda</p>
                <Link to="/pos">
                  <Button variant="outline" size="sm" className="mt-2">Fazer primeira venda</Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-surface-700">
                {recentSales.map((sale) => (
                  <div key={sale.id} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-700/30 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-surface-700 flex items-center justify-center shrink-0 text-xs font-bold text-zinc-400">
                      {(sale.clientName || 'A').charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-200 truncate">
                        {sale.clientName || 'Cliente avulso'}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {Array.isArray(sale.items) ? sale.items.length : 0} item{Array.isArray(sale.items) && sale.items.length !== 1 ? 's' : ''} · {formatRelativeTime(sale.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-zinc-100 tabular">{formatCurrency(sale.total)}</p>
                      <Badge variant={sale.paymentMethod === 'pix' ? 'brand' : 'default'} size="sm">
                        {sale.paymentMethod?.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>

        {/* Low stock alerts */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card padding="none" className="h-full">
            <div className="flex items-center justify-between p-4 border-b border-surface-700">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-zinc-100">Estoque Baixo</h3>
                {lowStockProducts.length > 0 && (
                  <Badge variant="danger" size="sm">{lowStockProducts.length}</Badge>
                )}
              </div>
              <Link to="/inventory">
                <Button variant="ghost" size="xs" iconRight={<ArrowRight size={12} />}>Estoque</Button>
              </Link>
            </div>
            {loading ? (
              <div className="p-4 space-y-3">
                {[0, 1, 2].map((i) => <div key={i} className="h-10 bg-surface-700/50 rounded-lg animate-pulse" />)}
              </div>
            ) : lowStockProducts.length === 0 ? (
              <div className="py-8 text-center">
                <Package size={24} className="text-zinc-700 mx-auto mb-2" />
                <p className="text-xs text-zinc-500">Estoque em dia</p>
              </div>
            ) : (
              <div className="divide-y divide-surface-700">
                {lowStockProducts.map((p) => (
                  <div key={p.id} className="flex items-start gap-3 px-4 py-3">
                    <AlertTriangle
                      size={15}
                      className={`mt-0.5 shrink-0 ${p.stock === 0 ? 'text-red-400' : 'text-amber-400'}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-zinc-200 leading-snug truncate">{p.name}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{p.brand} · {p.size}</p>
                    </div>
                    <Badge variant={p.stock === 0 ? 'danger' : 'warning'} size="sm">
                      {p.stock === 0 ? 'Zerado' : `${p.stock} un`}
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            {/* Mini chart if data */}
            {categoryData.length > 0 && (
              <div className="p-4 border-t border-surface-700">
                <p className="text-xs text-zinc-500 mb-3 font-medium">Por categoria</p>
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width={80} height={80}>
                    <PieChart>
                      <Pie data={categoryData} cx="50%" cy="50%" innerRadius={24} outerRadius={38} paddingAngle={3} dataKey="value">
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1 flex-1">
                    {categoryData.map((d) => (
                      <div key={d.name} className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                        <span className="text-xs text-zinc-400 flex-1">{d.name}</span>
                        <span className="text-xs font-medium text-zinc-300">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      {/* Revenue chart placeholder — shows real data when sales exist */}
      {!loading && recentSales.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="mt-4"
        >
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">Receita Recente</h3>
                <p className="text-xs text-zinc-500">Últimas {recentSales.length} vendas</p>
              </div>
            </div>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={recentSales.slice().reverse().map((s, i) => ({ i: i + 1, revenue: s.total }))}
                  margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
                >
                  <defs>
                    <linearGradient id="rev-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="i" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#71717a' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#71717a' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={2} fill="url(#rev-gradient)" dot={false} activeDot={{ r: 4, fill: '#8b5cf6', strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
