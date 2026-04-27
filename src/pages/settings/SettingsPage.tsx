import { useState } from 'react'
import { motion } from 'framer-motion'
import { Building2, Users, Shield, Bell, Globe, Save } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuthStore } from '@/store/useAuthStore'
import { useThemeStore } from '@/store/useThemeStore'
import { useUIStore } from '@/store/useUIStore'
import { cn } from '@/lib/cn'

export function SettingsPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState('company')
  const { tenant } = useAuthStore()
  const { locale, setLocale } = useThemeStore()
  const { addToast } = useUIStore()

  const TABS = [
    { id: 'company', label: t('settings.tabs.company'), icon: <Building2 size={15} /> },
    { id: 'appearance', label: t('settings.tabs.appearance'), icon: <Globe size={15} /> },
    { id: 'users', label: t('settings.tabs.users'), icon: <Users size={15} /> },
    { id: 'security', label: t('settings.tabs.security'), icon: <Shield size={15} /> },
  ]

  const handleSave = () => {
    addToast({ type: 'success', title: t('settings.company.saved'), message: t('settings.company.savedMessage') })
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-xl font-bold text-zinc-100">{t('settings.title')}</h1>
        <p className="text-sm text-zinc-500 mt-0.5">{t('settings.subtitle')}</p>
      </motion.div>

      <div className="flex gap-6">
        {/* Sidebar tabs */}
        <div className="w-44 shrink-0">
          <nav className="space-y-0.5">
            {TABS.map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={cn(
                  'flex items-center gap-2.5 w-full h-9 px-3 rounded-lg text-sm font-medium transition-all',
                  tab === id
                    ? 'bg-brand-500/15 text-brand-300 border border-brand-500/20'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-surface-700 border border-transparent'
                )}
              >
                {icon}
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 surface-card p-5">
          {tab === 'company' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <h2 className="text-sm font-semibold text-zinc-100 mb-4">{t('settings.company.title')}</h2>
              <div className="grid grid-cols-2 gap-4">
                <Input label={t('settings.company.name')} defaultValue={tenant?.name} />
                <Input label={t('settings.company.cnpj')} defaultValue={tenant?.cnpj} />
                <Input label={t('settings.company.phone')} defaultValue={tenant?.phone} />
                <Input label={t('settings.company.email')} defaultValue={tenant?.email} />
              </div>
              <Input label={t('settings.company.address')} defaultValue={tenant?.address} />
              <div>
                <p className="text-sm font-medium text-zinc-300 mb-2">{t('settings.company.logo')}</p>
                <div className="border-2 border-dashed border-surface-600 rounded-xl p-6 text-center hover:border-brand-500/50 transition-colors cursor-pointer">
                  <Building2 size={24} className="text-zinc-600 mx-auto mb-2" />
                  <p className="text-sm text-zinc-500">{t('settings.company.logoHint')}</p>
                  <p className="text-xs text-zinc-600 mt-1">{t('settings.company.logoFormat')}</p>
                </div>
              </div>
              <Button variant="primary" size="sm" icon={<Save size={14} />} onClick={handleSave}>
                {t('settings.company.save')}
              </Button>
            </motion.div>
          )}

          {tab === 'appearance' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <h2 className="text-sm font-semibold text-zinc-100 mb-4">{t('settings.appearance.title')}</h2>
              <div>
                <p className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                  <Globe size={14} /> {t('settings.appearance.language')}
                </p>
                <div className="flex gap-2">
                  {([['pt-BR', 'Português (BR)'], ['es', 'Español'], ['en', 'English']] as const).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setLocale(val)}
                      className={cn(
                        'px-3 py-2 rounded-lg border text-sm transition-all',
                        locale === val
                          ? 'border-brand-500 bg-brand-500/10 text-brand-300'
                          : 'border-surface-600 text-zinc-400 hover:border-surface-500 hover:text-zinc-300'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {tab === 'users' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-zinc-100">{t('settings.users.title')}</h2>
                <Button variant="primary" size="sm">{t('settings.users.invite')}</Button>
              </div>
              <div className="space-y-2">
                {[
                  { name: 'Carlos Silva', email: 'carlos@pneusmax.com.br', role: 'Admin' },
                  { name: 'Ana Souza', email: 'ana@pneusmax.com.br', role: 'Vendedor' },
                ].map((u) => (
                  <div key={u.email} className="flex items-center gap-3 p-3 bg-surface-700 rounded-xl border border-surface-600">
                    <div className="w-8 h-8 rounded-full bg-brand-gradient flex items-center justify-center text-white text-xs font-bold">
                      {u.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-zinc-200">{u.name}</p>
                      <p className="text-xs text-zinc-500">{u.email}</p>
                    </div>
                    <span className="text-xs bg-surface-600 px-2 py-1 rounded-md text-zinc-400">{u.role}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {tab === 'security' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <h2 className="text-sm font-semibold text-zinc-100 mb-4">{t('settings.security.title')}</h2>
              <Input label={t('settings.security.currentPass')} type="password" placeholder="••••••••" />
              <Input label={t('settings.security.newPass')} type="password" placeholder="••••••••" />
              <Input label={t('settings.security.confirmPass')} type="password" placeholder="••••••••" />
              <div className="flex items-center gap-3 p-3 bg-surface-700 rounded-xl border border-surface-600">
                <Bell size={15} className="text-zinc-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-zinc-200">{t('settings.security.twoFactor')}</p>
                  <p className="text-xs text-zinc-500">{t('settings.security.twoFactorDesc')}</p>
                </div>
                <Button variant="outline" size="sm">{t('settings.security.enable')}</Button>
              </div>
              <Button variant="primary" size="sm" icon={<Save size={14} />} onClick={handleSave}>
                {t('settings.security.changePass')}
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
