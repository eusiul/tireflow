import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Building2, Users, Shield, Globe, Save, Upload, X, Eye, EyeOff, Check, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuthStore } from '@/store/useAuthStore'
import { useThemeStore } from '@/store/useThemeStore'
import { useUIStore } from '@/store/useUIStore'
import { settings } from '@/lib/api'
import { cn } from '@/lib/cn'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resizeImageToBase64(file: File, maxPx = 400): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/webp', 0.85))
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// ─── Company Tab ──────────────────────────────────────────────────────────────

function CompanyTab() {
  const { t } = useTranslation()
  const { tenant, updateTenant } = useAuthStore()
  const { addToast } = useUIStore()
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    name: tenant?.name ?? '',
    cnpj: tenant?.cnpj ?? '',
    phone: tenant?.phone ?? '',
    address: tenant?.address ?? '',
    email: (tenant as any)?.email ?? '',
  })
  const [logo, setLogo] = useState<string | null>(tenant?.logoUrl ?? null)
  const [logoFile, setLogoFile] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)

  const field = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5_000_000) {
      addToast({ type: 'error', title: 'Imagem muito grande', message: 'Máximo 5 MB.' })
      return
    }
    try {
      const base64 = await resizeImageToBase64(file, 400)
      setLogoFile(base64)
    } catch {
      addToast({ type: 'error', title: 'Erro ao processar imagem', message: 'Tente outro arquivo.' })
    }
    e.target.value = ''
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      addToast({ type: 'error', title: 'Nome obrigatório', message: 'O nome da empresa não pode estar vazio.' })
      return
    }
    setSaving(true)
    try {
      // 1. Update tenant info
      const updatedTenant = await settings.updateTenant({
        name: form.name.trim(),
        cnpj: form.cnpj || null,
        phone: form.phone || null,
        address: form.address || null,
        email: form.email || null,
      }) as any

      // 2. Upload logo if changed
      let newLogoUrl = logo
      if (logoFile) {
        setLogoUploading(true)
        const res = await settings.uploadLogo(logoFile)
        newLogoUrl = res.logoUrl
        setLogo(newLogoUrl)
        setLogoFile(null)
        setLogoUploading(false)
      }

      // 3. Sync auth store
      updateTenant({
        name: updatedTenant.name,
        cnpj: updatedTenant.cnpj,
        phone: updatedTenant.phone,
        address: updatedTenant.address,
        logoUrl: newLogoUrl ?? undefined,
      })

      addToast({ type: 'success', title: 'Salvo!', message: 'Dados da empresa atualizados com sucesso.' })
    } catch (err: any) {
      addToast({ type: 'error', title: 'Erro ao salvar', message: err?.message ?? 'Tente novamente.' })
    } finally {
      setSaving(false)
      setLogoUploading(false)
    }
  }

  const handleRemoveLogo = async () => {
    if (logoFile) { setLogoFile(null); return }
    try {
      await settings.deleteLogo()
      setLogo(null)
      updateTenant({ logoUrl: undefined })
      addToast({ type: 'success', title: 'Logo removido', message: '' })
    } catch (err: any) {
      addToast({ type: 'error', title: 'Erro', message: err?.message ?? 'Tente novamente.' })
    }
  }

  const previewLogo = logoFile ?? logo

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <h2 className="text-sm font-semibold text-zinc-100">{t('settings.company.title')}</h2>

      {/* Logo */}
      <div>
        <p className="text-sm font-medium text-zinc-300 mb-2">{t('settings.company.logo')}</p>
        <div className="flex items-center gap-4">
          {previewLogo ? (
            <div className="relative group">
              <img
                src={previewLogo}
                alt="Logo"
                className="w-20 h-20 object-contain rounded-xl border border-surface-600 bg-surface-800 p-1"
              />
              <button
                onClick={handleRemoveLogo}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={10} />
              </button>
            </div>
          ) : (
            <div className="w-20 h-20 rounded-xl border-2 border-dashed border-surface-600 flex items-center justify-center bg-surface-800">
              <Building2 size={24} className="text-zinc-600" />
            </div>
          )}
          <div>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-surface-600 text-sm text-zinc-300 hover:border-brand-500/50 hover:text-zinc-100 transition-colors"
            >
              <Upload size={14} />
              {previewLogo ? 'Trocar logo' : 'Enviar logo'}
            </button>
            <p className="text-xs text-zinc-600 mt-1">PNG, JPG ou WebP · máx. 5 MB</p>
            {logoFile && (
              <p className="text-xs text-brand-400 mt-0.5 flex items-center gap-1">
                <Check size={10} /> Novo logo selecionado — clique em Salvar
              </p>
            )}
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={handleLogoChange}
        />
      </div>

      {/* Form fields */}
      <div className="grid grid-cols-2 gap-4">
        <Input label={t('settings.company.name')} value={form.name} onChange={field('name')} required />
        <Input label={t('settings.company.cnpj')} value={form.cnpj} onChange={field('cnpj')} placeholder="00.000.000/0001-00" />
        <Input label={t('settings.company.phone')} value={form.phone} onChange={field('phone')} placeholder="(00) 00000-0000" />
        <Input label="E-mail" type="email" value={form.email} onChange={field('email')} placeholder="contato@empresa.com" />
      </div>
      <Input label={t('settings.company.address')} value={form.address} onChange={field('address')} placeholder="Rua, número, bairro, cidade" />

      <Button
        variant="primary"
        size="sm"
        icon={saving || logoUploading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        onClick={handleSave}
        loading={saving}
      >
        {saving ? 'Salvando...' : t('settings.company.save')}
      </Button>
    </motion.div>
  )
}

// ─── Security Tab ─────────────────────────────────────────────────────────────

function SecurityTab() {
  const { t } = useTranslation()
  const { addToast } = useUIStore()
  const [form, setForm] = useState({ current: '', newPass: '', confirm: '' })
  const [show, setShow] = useState({ current: false, new: false, confirm: false })
  const [saving, setSaving] = useState(false)

  const handleChange = async () => {
    if (form.newPass.length < 8) {
      addToast({ type: 'error', title: 'Senha muito curta', message: 'A nova senha deve ter pelo menos 8 caracteres.' })
      return
    }
    if (form.newPass !== form.confirm) {
      addToast({ type: 'error', title: 'Senhas não coincidem', message: 'A nova senha e a confirmação devem ser iguais.' })
      return
    }
    setSaving(true)
    try {
      await settings.changePassword(form.current, form.newPass)
      setForm({ current: '', newPass: '', confirm: '' })
      addToast({ type: 'success', title: 'Senha alterada!', message: 'Use a nova senha no próximo login.' })
    } catch (err: any) {
      const msg = err?.message === 'Incorrect current password' ? 'Senha atual incorreta.' : (err?.message ?? 'Tente novamente.')
      addToast({ type: 'error', title: 'Erro ao alterar senha', message: msg })
    } finally {
      setSaving(false)
    }
  }

  const pw = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const ToggleIcon = ({ k }: { k: 'current' | 'new' | 'confirm' }) => (
    <button type="button" onClick={() => setShow((s) => ({ ...s, [k]: !s[k] }))}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
      {show[k] ? <EyeOff size={14} /> : <Eye size={14} />}
    </button>
  )

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <h2 className="text-sm font-semibold text-zinc-100">{t('settings.security.title')}</h2>
      <div className="relative">
        <Input label={t('settings.security.currentPass')} type={show.current ? 'text' : 'password'}
          value={form.current} onChange={pw('current')} placeholder="••••••••" />
        <ToggleIcon k="current" />
      </div>
      <div className="relative">
        <Input label={t('settings.security.newPass')} type={show.new ? 'text' : 'password'}
          value={form.newPass} onChange={pw('newPass')} placeholder="••••••••" />
        <ToggleIcon k="new" />
      </div>
      <div className="relative">
        <Input label={t('settings.security.confirmPass')} type={show.confirm ? 'text' : 'password'}
          value={form.confirm} onChange={pw('confirm')} placeholder="••••••••" />
        <ToggleIcon k="confirm" />
      </div>
      {form.newPass && form.confirm && form.newPass !== form.confirm && (
        <p className="text-xs text-red-400">As senhas não coincidem.</p>
      )}
      <Button variant="primary" size="sm" icon={<Save size={14} />} onClick={handleChange} loading={saving}>
        {saving ? 'Alterando...' : t('settings.security.changePass')}
      </Button>
    </motion.div>
  )
}

// ─── Users Tab ────────────────────────────────────────────────────────────────

function UsersTab() {
  const { t } = useTranslation()
  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string; role: string; is_active: boolean; last_login_at: string | null }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    settings.listUsers()
      .then((r) => setUsers(r.users))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const roleLabel: Record<string, string> = { admin: 'Admin', seller: 'Vendedor', cashier: 'Caixa' }
  const roleBadge: Record<string, string> = {
    admin: 'bg-brand-500/15 text-brand-300 border-brand-500/20',
    seller: 'bg-green-500/15 text-green-300 border-green-500/20',
    cashier: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-zinc-100">{t('settings.users.title')}</h2>
        <Button variant="primary" size="sm">{t('settings.users.invite')}</Button>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 size={20} className="animate-spin text-zinc-500" />
        </div>
      ) : users.length === 0 ? (
        <p className="text-sm text-zinc-500 py-8 text-center">Nenhum usuário encontrado.</p>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-3 p-3 bg-surface-700 rounded-xl border border-surface-600">
              <div className="w-8 h-8 rounded-full bg-brand-gradient flex items-center justify-center text-white text-xs font-bold shrink-0">
                {u.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-200 truncate">{u.name}</p>
                <p className="text-xs text-zinc-500 truncate">{u.email}</p>
              </div>
              <span className={cn('text-xs px-2 py-0.5 rounded-md border', roleBadge[u.role] ?? 'bg-surface-600 text-zinc-400 border-surface-500')}>
                {roleLabel[u.role] ?? u.role}
              </span>
              {!u.is_active && (
                <span className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-md">Inativo</span>
              )}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

// ─── Appearance Tab ───────────────────────────────────────────────────────────

function AppearanceTab() {
  const { t } = useTranslation()
  const { locale, setLocale } = useThemeStore()

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <h2 className="text-sm font-semibold text-zinc-100">{t('settings.appearance.title')}</h2>
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
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState('company')

  const TABS = [
    { id: 'company', label: t('settings.tabs.company'), icon: <Building2 size={15} /> },
    { id: 'appearance', label: t('settings.tabs.appearance'), icon: <Globe size={15} /> },
    { id: 'users', label: t('settings.tabs.users'), icon: <Users size={15} /> },
    { id: 'security', label: t('settings.tabs.security'), icon: <Shield size={15} /> },
  ]

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-xl font-bold text-zinc-100">{t('settings.title')}</h1>
        <p className="text-sm text-zinc-500 mt-0.5">{t('settings.subtitle')}</p>
      </motion.div>

      <div className="flex gap-6">
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

        <div className="flex-1 surface-card p-5">
          {tab === 'company' && <CompanyTab />}
          {tab === 'appearance' && <AppearanceTab />}
          {tab === 'users' && <UsersTab />}
          {tab === 'security' && <SecurityTab />}
        </div>
      </div>
    </div>
  )
}
