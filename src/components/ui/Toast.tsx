import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { useUIStore } from '@/store/useUIStore'
import { cn } from '@/lib/cn'

const icons = {
  success: <CheckCircle size={16} className="text-emerald-400" />,
  error: <XCircle size={16} className="text-red-400" />,
  warning: <AlertTriangle size={16} className="text-amber-400" />,
  info: <Info size={16} className="text-blue-400" />,
}

const borders = {
  success: 'border-l-emerald-500',
  error: 'border-l-red-500',
  warning: 'border-l-amber-500',
  info: 'border-l-blue-500',
}

export function ToastContainer() {
  const { toasts, removeToast } = useUIStore()

  return createPortal(
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 40, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'pointer-events-auto w-80 rounded-xl border border-surface-600',
              'bg-surface-800 shadow-modal border-l-2 p-4',
              borders[toast.type]
            )}
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 shrink-0">{icons[toast.type]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-100">{toast.title}</p>
                {toast.message && (
                  <p className="text-xs text-zinc-400 mt-0.5">{toast.message}</p>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors shrink-0 ml-1 mt-0.5"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>,
    document.body
  )
}
