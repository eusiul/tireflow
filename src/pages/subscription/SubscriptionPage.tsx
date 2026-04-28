import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Check, Zap, Building2, Star, CreditCard, ArrowRight, Shield, Copy, CheckCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { useAuthStore } from '@/store/useAuthStore'
import { useUIStore } from '@/store/useUIStore'
import { payments } from '@/lib/api'
import { cn } from '@/lib/cn'

const PLAN_DEFS = [
  { id: 'starter', name: 'Starter', price: 97, descKey: 'subscription.starterDesc', icon: <Zap size={20} />, color: 'from-zinc-600 to-zinc-700', featuresKey: 'subscription.starterFeatures', ctaKey: 'subscription.starterCta' },
  { id: 'pro', name: 'Pro', price: 197, descKey: 'subscription.proDesc', icon: <Star size={20} />, color: 'from-brand-600 to-brand-700', popular: true, featuresKey: 'subscription.proFeatures', ctaKey: 'subscription.proCta' },
  { id: 'enterprise', name: 'Enterprise', price: 497, descKey: 'subscription.enterpriseDesc', icon: <Building2 size={20} />, color: 'from-red-700 to-red-800', featuresKey: 'subscription.enterpriseFeatures', ctaKey: 'subscription.enterpriseCta' },
]

interface PixCharge {
  txid: string; pixCopiaECola: string; qrCodeBase64: string
  expiresAt: string; amount: number; plan: string; _mock?: boolean
}

export function SubscriptionPage() {
  const { t } = useTranslation()
  const { tenant } = useAuthStore()
  const { addToast } = useUIStore()
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [pixCharge, setPixCharge] = useState<PixCharge | null>(null)
  const [pixOpen, setPixOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [checkingPayment, setCheckingPayment] = useState(false)

  const handleSelectPlan = async (planId: string) => {
    if (tenant?.plan === planId && tenant?.planStatus === 'active') return
    setLoadingPlan(planId)
    try {
      const charge = await payments.createPixCharge(planId as 'starter' | 'pro' | 'enterprise')
      setPixCharge(charge); setPixOpen(true)
    } catch (err: unknown) {
      const e = err as { message?: string }
      addToast({ type: 'error', title: t('subscription.errorCharge'), message: e?.message })
    } finally { setLoadingPlan(null) }
  }

  const handleCopyPix = () => {
    if (pixCharge?.pixCopiaECola) {
      navigator.clipboard.writeText(pixCharge.pixCopiaECola)
      setCopied(true); setTimeout(() => setCopied(false), 3000)
    }
  }

  const handleCheckPayment = async () => {
    if (!pixCharge) return; setCheckingPayment(true)
    try {
      const status = await payments.checkPixStatus(pixCharge.txid)
      if (status.status === 'paid') {
        setPixOpen(false)
        addToast({ type: 'success', title: t('subscription.paymentConfirmed'), message: t('subscription.planActivated', { plan: pixCharge.plan }) })
      } else {
        addToast({ type: 'info', title: t('subscription.awaitingPayment'), message: t('subscription.pixNotConfirmed') })
      }
    } catch {
      addToast({ type: 'error', title: t('subscription.errorVerify') })
    } finally { setCheckingPayment(false) }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
        <Badge variant="brand" size="sm" className="mb-4">{t('subscription.currentPlan', { plan: tenant?.plan?.toUpperCase() })}</Badge>
        <h1 className="text-3xl font-bold text-zinc-100 mb-3">
          {t('subscription.title')}{' '}
          <span className="gradient-text">{t('subscription.titleHighlight')}</span>
        </h1>
        <p className="text-zinc-400 max-w-lg mx-auto">{t('subscription.subtitle')}</p>
      </motion.div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        {PLAN_DEFS.map((plan, i) => {
          const features = t(plan.featuresKey, { returnObjects: true }) as string[]
          const isActive = tenant?.plan === plan.id && tenant?.planStatus === 'active'
          return (
            <motion.div key={plan.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className={cn('relative surface-card p-6 flex flex-col', plan.popular && 'border-brand-500/50 shadow-glow')}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="brand" size="sm" className="shadow-glow-sm">{t('subscription.popular')}</Badge>
                </div>
              )}
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-white mb-4 bg-gradient-to-br', plan.color, plan.popular && 'shadow-glow-sm')}>
                {plan.icon}
              </div>
              <h3 className="text-lg font-bold text-zinc-100">{plan.name}</h3>
              <p className="text-sm text-zinc-500 mb-4">{t(plan.descKey)}</p>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-3xl font-bold text-zinc-100">R${plan.price}</span>
                <span className="text-zinc-500 text-sm">{t('subscription.perMonth')}</span>
              </div>
              <ul className="space-y-2.5 mb-6 flex-1">
                {features.map((feat) => (
                  <li key={feat} className="flex items-center gap-2 text-sm">
                    <Check size={14} className={plan.popular ? 'text-brand-400' : 'text-emerald-400'} />
                    <span className="text-zinc-300">{feat}</span>
                  </li>
                ))}
              </ul>
              <Button
                variant={isActive ? 'outline' : plan.popular ? 'primary' : 'secondary'}
                size="md" className="w-full" loading={loadingPlan === plan.id}
                iconRight={loadingPlan === plan.id ? undefined : <ArrowRight size={14} />}
                onClick={() => handleSelectPlan(plan.id)}>
                {isActive ? t('subscription.activePlan') : t(plan.ctaKey)}
              </Button>
            </motion.div>
          )
        })}
      </div>

      {/* Payment info */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="surface-card p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-brand-500/10 text-brand-400 shrink-0"><CreditCard size={20} /></div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-zinc-100 mb-1">{t('subscription.paymentTitle')}</h3>
            <p className="text-sm text-zinc-400 mb-4">{t('subscription.paymentDesc')}</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: <Zap size={14} />, titleKey: 'subscription.featInstant', descKey: 'subscription.featInstantDesc' },
                { icon: <Shield size={14} />, titleKey: 'subscription.featSecure', descKey: 'subscription.featSecureDesc' },
                { icon: <CreditCard size={14} />, titleKey: 'subscription.featInstallment', descKey: 'subscription.featInstallmentDesc' },
              ].map(({ icon, titleKey, descKey }) => (
                <div key={titleKey} className="bg-surface-700 rounded-lg p-3">
                  <span className="text-brand-400 mb-2 block">{icon}</span>
                  <p className="text-xs font-medium text-zinc-200">{t(titleKey)}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{t(descKey)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Pix Payment Modal */}
      <Modal open={pixOpen} onClose={() => setPixOpen(false)} title={t('subscription.paymentTitle')}
        subtitle={pixCharge ? `${pixCharge.plan.charAt(0).toUpperCase() + pixCharge.plan.slice(1)} — R$ ${pixCharge.amount.toFixed(2)}` : ''} size="sm">
        {pixCharge && (
          <div className="space-y-4">
            {pixCharge._mock && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-300">
                ⚠️ {t('subscription.demoWarning')}
              </div>
            )}
            <div className="flex flex-col items-center gap-3">
              <div className="w-44 h-44 bg-white rounded-xl p-2 flex items-center justify-center">
                {pixCharge.qrCodeBase64.startsWith('data:') ? (
                  <img src={pixCharge.qrCodeBase64} alt="QR Code Pix" className="w-full h-full" />
                ) : (
                  <div className="grid grid-cols-6 gap-0.5 w-full h-full">
                    {Array.from({ length: 36 }).map((_, i) => (
                      <div key={i} className={cn('rounded-[1px]', (i * 7 + i) % 3 === 0 ? 'bg-black' : 'bg-white')} />
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-zinc-400 text-center">{t('subscription.pixScan')}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1.5">{t('subscription.pixCopyLabel')}</p>
              <div className="flex gap-2">
                <code className="flex-1 text-[10px] bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-zinc-400 truncate">
                  {pixCharge.pixCopiaECola.slice(0, 50)}...
                </code>
                <Button variant={copied ? 'success' : 'outline'} size="sm" icon={copied ? <CheckCircle size={14} /> : <Copy size={14} />} onClick={handleCopyPix}>
                  {copied ? t('subscription.copied') : t('subscription.copy')}
                </Button>
              </div>
            </div>
            <div className="border-t border-surface-700 pt-3 space-y-2">
              <Button variant="primary" size="md" className="w-full" loading={checkingPayment}
                icon={<RefreshCw size={14} className={checkingPayment ? 'animate-spin' : ''} />} onClick={handleCheckPayment}>
                {checkingPayment ? t('subscription.verifying') : t('subscription.verifyPayment')}
              </Button>
              <p className="text-[10px] text-zinc-600 text-center">{t('subscription.paymentNote')}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
