import { useEffect, useRef, useCallback } from 'react'

interface BarcodeScanOptions {
  onScan: (code: string) => void
  enabled?: boolean
  minLength?: number
  maxIntervalMs?: number
}

export function useBarcodeScan({
  onScan,
  enabled = true,
  minLength = 4,
  maxIntervalMs = 80,
}: BarcodeScanOptions) {
  const bufferRef = useRef('')
  const lastKeyTimeRef = useRef(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return

      const now = Date.now()
      const target = e.target as HTMLElement

      // Check if the key comes from a focused input that isn't the barcode field
      if (
        target.dataset.barcodeInput === 'true' ||
        target.tagName === 'TEXTAREA'
      ) {
        return
      }

      const interval = now - lastKeyTimeRef.current
      lastKeyTimeRef.current = now

      // Clear buffer if gap is too large (human typing)
      if (interval > maxIntervalMs && bufferRef.current.length > 0) {
        bufferRef.current = ''
      }

      if (e.key === 'Enter') {
        const code = bufferRef.current.trim()
        if (code.length >= minLength) {
          onScan(code)
          e.preventDefault()
        }
        bufferRef.current = ''
        return
      }

      if (e.key.length === 1) {
        bufferRef.current += e.key
      }

      // Auto-clear buffer after timeout
      clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => {
        bufferRef.current = ''
      }, 500)
    },
    [enabled, minLength, maxIntervalMs, onScan]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      clearTimeout(timeoutRef.current)
    }
  }, [handleKeyDown])
}
