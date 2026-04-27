import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Locale = 'pt-BR' | 'es' | 'en'

interface ThemeState {
  locale: Locale
  setLocale: (locale: Locale) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      locale: 'pt-BR',
      setLocale: (locale) => {
        import('@/lib/i18n').then((mod) => mod.default.changeLanguage(locale))
        set({ locale })
      },
    }),
    {
      name: 'tireflow-theme',
      onRehydrateStorage: () => (state) => {
        if (state?.locale) {
          import('@/lib/i18n').then((mod) => mod.default.changeLanguage(state.locale))
        }
      },
    }
  )
)
