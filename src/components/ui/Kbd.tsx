import { cn } from '@/lib/cn'

interface KbdProps {
  children: React.ReactNode
  className?: string
}

export function Kbd({ children, className }: KbdProps) {
  return (
    <kbd
      className={cn(
        'inline-flex items-center justify-center',
        'font-mono text-[10px] font-medium',
        'bg-surface-700 border border-surface-600 text-zinc-400',
        'rounded px-1.5 py-0.5 min-w-[20px]',
        className
      )}
    >
      {children}
    </kbd>
  )
}
