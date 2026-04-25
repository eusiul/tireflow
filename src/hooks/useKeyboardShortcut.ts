import { useEffect } from 'react'

type Key = string
type Modifier = 'ctrl' | 'meta' | 'alt' | 'shift'

interface ShortcutOptions {
  key: Key
  modifiers?: Modifier[]
  callback: (e: KeyboardEvent) => void
  enabled?: boolean
  preventDefault?: boolean
}

export function useKeyboardShortcut({
  key,
  modifiers = [],
  callback,
  enabled = true,
  preventDefault = true,
}: ShortcutOptions) {
  useEffect(() => {
    if (!enabled) return

    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      // Allow shortcuts in inputs if it's a special key combo
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'
      if (isInput && modifiers.length === 0) return

      const keyMatch = e.key.toLowerCase() === key.toLowerCase()
      const ctrlMatch = modifiers.includes('ctrl') ? e.ctrlKey : !e.ctrlKey
      const metaMatch = modifiers.includes('meta') ? e.metaKey : !e.metaKey
      const altMatch = modifiers.includes('alt') ? e.altKey : !e.altKey
      const shiftMatch = modifiers.includes('shift') ? e.shiftKey : true

      // Allow either ctrl or meta for cross-platform
      const ctrlOrMeta =
        modifiers.includes('ctrl') || modifiers.includes('meta')
          ? e.ctrlKey || e.metaKey
          : !e.ctrlKey && !e.metaKey

      if (keyMatch && (ctrlOrMeta || (ctrlMatch && metaMatch)) && altMatch && shiftMatch) {
        if (preventDefault) e.preventDefault()
        callback(e)
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [key, modifiers, callback, enabled, preventDefault])
}
