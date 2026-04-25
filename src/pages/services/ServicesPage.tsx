import { motion } from 'framer-motion'
import { Wrench, Plus, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency, formatRelativeTime } from '@/lib/formatters'

const SERVICES = [
  { id: 'sv01', client: 'João Pereira', plate: 'ABC-1234', vehicle: 'Honda Civic 2020', services: ['Montagem (4x)', 'Balanceamento (4x)'], total: 260, status: 'done', time: '2024-11-28T14:00:00Z', operator: 'Carlos' },
  { id: 'sv02', client: 'Maria Santos', plate: 'GHI-9012', vehicle: 'VW Gol 2018', services: ['Alinhamento', 'Balanceamento (2x)'], total: 120, status: 'in_progress', time: '2024-11-28T15:30:00Z', operator: 'Carlos' },
  { id: 'sv03', client: 'Carlos Oliveira', plate: 'JKL-3456', vehicle: 'Toyota Corolla 2022', services: ['Montagem (4x)', 'Balanceamento (4x)', 'Alinhamento'], total: 310, status: 'pending', time: '2024-11-28T16:00:00Z', operator: '—' },
]

const STATUS_CONFIG = {
  done: { label: 'Concluído', variant: 'success' as const, icon: <CheckCircle size={13} /> },
  in_progress: { label: 'Em execução', variant: 'warning' as const, icon: <Clock size={13} /> },
  pending: { label: 'Aguardando', variant: 'outline' as const, icon: <AlertCircle size={13} /> },
}

export function ServicesPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Serviços</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Ordens de serviço do dia</p>
        </div>
        <Button variant="primary" size="sm" icon={<Plus size={14} />}>Nova OS</Button>
      </motion.div>

      <div className="space-y-3">
        {SERVICES.map((sv, i) => {
          const sc = STATUS_CONFIG[sv.status as keyof typeof STATUS_CONFIG]
          return (
            <motion.div
              key={sv.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="surface-card p-4 flex items-start gap-4 hover:border-surface-600 transition-all cursor-pointer"
            >
              <div className={`p-2.5 rounded-xl mt-0.5 ${sv.status === 'done' ? 'bg-emerald-500/10 text-emerald-400' : sv.status === 'in_progress' ? 'bg-amber-500/10 text-amber-400' : 'bg-surface-700 text-zinc-500'}`}>
                <Wrench size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-zinc-100">{sv.client}</p>
                  <span className="text-xs font-mono bg-surface-700 px-2 py-0.5 rounded text-zinc-400">{sv.plate}</span>
                  <Badge variant={sc.variant} size="sm">{sc.label}</Badge>
                </div>
                <p className="text-xs text-zinc-500 mb-2">{sv.vehicle}</p>
                <div className="flex flex-wrap gap-1.5">
                  {sv.services.map((s) => (
                    <span key={s} className="text-xs bg-surface-700 border border-surface-600 rounded-md px-2 py-0.5 text-zinc-400">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-zinc-100 tabular">{formatCurrency(sv.total)}</p>
                <p className="text-xs text-zinc-500">{formatRelativeTime(sv.time)}</p>
                <p className="text-xs text-zinc-600 mt-0.5">{sv.operator}</p>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
