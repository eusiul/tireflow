import { cn } from '@/lib/cn'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'outline'
  size?: 'sm' | 'md'
  dot?: boolean
  className?: string
}

const variants = {
  default: 'bg-zinc-700/60 text-zinc-300 border-zinc-600/40',
  brand: 'bg-brand-500/15 text-brand-300 border-brand-500/20',
  success: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  warning: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
  danger: 'bg-red-500/15 text-red-400 border-red-500/20',
  info: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
  outline: 'bg-transparent text-zinc-400 border-zinc-600',
}

const dotColors = {
  default: 'bg-zinc-400',
  brand: 'bg-brand-400',
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  danger: 'bg-red-400',
  info: 'bg-blue-400',
  outline: 'bg-zinc-400',
}

export function Badge({ children, variant = 'default', size = 'md', dot, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium border rounded-full',
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs',
        variants[variant],
        className
      )}
    >
      {dot && (
        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColors[variant])} />
      )}
      {children}
    </span>
  )
}
