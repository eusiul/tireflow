import { motion } from 'framer-motion'
import { BarChart2, Download, TrendingUp, Package, Users, DollarSign } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { MOCK_PRODUCTS, MOCK_CLIENTS, REVENUE_CHART_DATA } from '@/data/mockData'
import { formatCurrency } from '@/lib/formatters'

const TOP_PRODUCTS = MOCK_PRODUCTS
  .filter((p) => p.category !== 'service')
  .map((p) => ({ name: p.name.split(' ')[0] + ' ' + p.size, sold: Math.floor(Math.random() * 40 + 5), revenue: p.salePrice * Math.floor(Math.random() * 40 + 5) }))
  .sort((a, b) => b.sold - a.sold)
  .slice(0, 5)

const TOP_CLIENTS = MOCK_CLIENTS.sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 4)

export function ReportsPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Relatórios</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Análises detalhadas do seu negócio</p>
        </div>
        <Button variant="ghost" size="sm" icon={<Download size={14} />}>Exportar PDF</Button>
      </motion.div>

      {/* Summary KPIs */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-4 gap-3 mb-6"
      >
        {[
          { label: 'Receita Nov', value: 'R$ 42.850', change: '+12.4%', icon: <DollarSign size={16} />, pos: true },
          { label: 'Qtd Vendas', value: '34', change: '+6', icon: <BarChart2 size={16} />, pos: true },
          { label: 'Produtos ativos', value: String(MOCK_PRODUCTS.length), change: '', icon: <Package size={16} />, pos: null },
          { label: 'Clientes', value: String(MOCK_CLIENTS.length), change: '+3', icon: <Users size={16} />, pos: true },
        ].map((kpi) => (
          <div key={kpi.label} className="surface-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="p-1.5 rounded-lg bg-surface-700 text-zinc-400">{kpi.icon}</div>
              {kpi.change && (
                <span className={`text-xs font-medium ${kpi.pos ? 'text-emerald-400' : 'text-red-400'}`}>
                  {kpi.change}
                </span>
              )}
            </div>
            <p className="text-xl font-bold text-zinc-100 tabular">{kpi.value}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{kpi.label}</p>
          </div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly Revenue Bar */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader title="Receita Mensal" subtitle="Comparativo por mês" icon={<TrendingUp size={15} />} />
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={REVENUE_CHART_DATA} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#71717a' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#71717a' }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: '#1c1c1f', border: '1px solid #27272a', borderRadius: 12 }}
                    labelStyle={{ color: '#a1a1aa', fontSize: 11 }}
                    formatter={(v: number) => [formatCurrency(v), 'Receita']}
                  />
                  <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                    {REVENUE_CHART_DATA.map((_, i) => (
                      <Cell key={i} fill={i === REVENUE_CHART_DATA.length - 1 ? '#8b5cf6' : '#3f3f46'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>

        {/* Top Products */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card>
            <CardHeader title="Produtos Mais Vendidos" subtitle="Por unidades (novembro)" icon={<Package size={15} />} />
            <div className="space-y-3">
              {TOP_PRODUCTS.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="text-xs font-mono text-zinc-600 w-4">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-zinc-300 truncate">{p.name}</span>
                      <span className="text-zinc-500 shrink-0 ml-2">{p.sold} un</span>
                    </div>
                    <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-brand-500"
                        style={{ width: `${(p.sold / TOP_PRODUCTS[0].sold) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-medium text-zinc-400 tabular w-24 text-right">{formatCurrency(p.revenue)}</span>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Top Clients */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardHeader title="Melhores Clientes" subtitle="Por volume de compras" icon={<Users size={15} />} />
            <div className="space-y-3">
              {TOP_CLIENTS.map((c, i) => (
                <div key={c.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-gradient flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {c.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">{c.name}</p>
                    <p className="text-xs text-zinc-500">{c.totalVisits} visitas</p>
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
          </Card>
        </motion.div>

        {/* Payment Methods */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card>
            <CardHeader title="Formas de Pagamento" subtitle="Distribuição do mês" icon={<DollarSign size={15} />} />
            <div className="space-y-3">
              {[
                { method: 'Pix', pct: 52, amount: 22282, color: '#8b5cf6' },
                { method: 'Cartão', pct: 31, amount: 13283, color: '#6d28d9' },
                { method: 'Dinheiro', pct: 12, amount: 5142, color: '#a78bfa' },
                { method: 'Transferência', pct: 5, amount: 2143, color: '#c4b5fd' },
              ].map((m) => (
                <div key={m.method} className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: m.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-zinc-300">{m.method}</span>
                      <span className="text-zinc-500">{m.pct}%</span>
                    </div>
                    <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${m.pct}%`, background: m.color }} />
                    </div>
                  </div>
                  <span className="text-xs text-zinc-400 tabular w-20 text-right">{formatCurrency(m.amount)}</span>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
