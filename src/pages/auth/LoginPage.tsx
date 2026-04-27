import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Layers, ArrowRight, Eye, EyeOff, Zap, Building2 } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { auth } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'

export function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Register modal state
  const [registerOpen, setRegisterOpen] = useState(false)
  const [regLoading, setRegLoading] = useState(false)
  const [regError, setRegError] = useState('')
  const [regForm, setRegForm] = useState({ tenantName: '', name: '', email: '', password: '', cnpj: '' })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await auth.login(email, password)
      const { user, tenant } = await auth.me()
      login(user, tenant, localStorage.getItem('tf_access_token') || '')
      navigate('/dashboard')
    } catch (err: unknown) {
      const e = err as { message?: string; status?: number }
      if (e?.message === 'Invalid credentials') {
        setError('E-mail ou senha incorretos.')
      } else if (e?.status === 429) {
        setError('Muitas tentativas. Aguarde 1 minuto e tente novamente.')
      } else if (!navigator.onLine) {
        setError('Sem conexão com a internet.')
      } else {
        setError(`Erro ao conectar com o servidor. ${e?.message ? `(${e.message})` : ''}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const fillDemoCredentials = () => {
    setEmail('admin@tireflow.com')
    setPassword('Admin123!')
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setRegLoading(true)
    setRegError('')
    try {
      await auth.register({
        tenantName: regForm.tenantName,
        name: regForm.name,
        email: regForm.email,
        password: regForm.password,
        cnpj: regForm.cnpj || undefined,
      })
      // Auto-login after register
      await auth.login(regForm.email, regForm.password)
      const { user, tenant } = await auth.me()
      login(user, tenant, localStorage.getItem('tf_access_token') || '')
      navigate('/dashboard')
    } catch (err: unknown) {
      const e = err as { message?: string }
      setRegError(e?.message === 'Email already registered' ? 'Este e-mail já está cadastrado.' : 'Erro ao criar conta. Tente novamente.')
    } finally {
      setRegLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-950 flex">
      {/* Left — Branding */}
      <div className="hidden lg:flex flex-col w-1/2 relative overflow-hidden bg-surface-900 border-r border-surface-700">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-radial from-brand-900/30 via-transparent to-transparent" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl" />

        <div className="relative flex-1 flex flex-col justify-between p-12">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-gradient flex items-center justify-center shadow-glow">
              <Layers size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold text-zinc-100">TireFlow</span>
          </div>

          {/* Main copy */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h1 className="text-4xl font-bold text-zinc-100 leading-tight mb-4">
                Gestão de pneus{' '}
                <span className="gradient-text">do futuro</span>
              </h1>
              <p className="text-zinc-400 text-lg leading-relaxed max-w-md">
                Sistema completo para caucheiras e lojas de pneus. Controle de estoque, vendas, clientes e relatórios em um único lugar.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="mt-10 grid grid-cols-3 gap-4"
            >
              {[
                { value: '500+', label: 'Lojas ativas' },
                { value: 'R$ 2M+', label: 'Processados/mês' },
                { value: '99.9%', label: 'Uptime' },
              ].map((stat) => (
                <div key={stat.label} className="bg-surface-800 border border-surface-700 rounded-xl p-4">
                  <p className="text-xl font-bold gradient-text">{stat.value}</p>
                  <p className="text-xs text-zinc-500 mt-1">{stat.label}</p>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="space-y-2"
          >
            {['POS ultrarrápido com leitor de código de barras', 'IA integrada para sugestões e análises', 'Emissão de NF-e preparada', 'Multiusuário com controle de acesso'].map((feat) => (
              <div key={feat} className="flex items-center gap-2 text-sm text-zinc-400">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-400 shrink-0" />
                {feat}
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Right — Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-xl bg-brand-gradient flex items-center justify-center shadow-glow-sm">
              <Layers size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold text-zinc-100">TireFlow</span>
          </div>

          <h2 className="text-2xl font-bold text-zinc-100">Entrar na conta</h2>
          <p className="text-sm text-zinc-500 mt-1">Bem-vindo de volta. Acesse seu painel.</p>

          <form onSubmit={handleLogin} className="mt-8 space-y-4">
            <Input
              label="E-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-300">Senha</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full h-9 rounded-lg border bg-surface-800 text-zinc-100 placeholder:text-zinc-500 border-surface-600 hover:border-surface-500 focus:border-brand-500 transition-colors duration-150 outline-none px-3 pr-10 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded" />
                <span className="text-sm text-zinc-400">Lembrar</span>
              </label>
              <button type="button" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
                Esqueci a senha
              </button>
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full"
              iconRight={!loading ? <ArrowRight size={16} /> : undefined}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <button
            type="button"
            onClick={fillDemoCredentials}
            className="mt-4 w-full p-3 rounded-xl bg-brand-500/8 border border-brand-500/15 hover:bg-brand-500/15 transition-colors text-left"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Zap size={13} className="text-brand-400" />
                <span className="text-xs font-medium text-brand-300">Acesso Admin — clique para preencher</span>
              </div>
            </div>
            <p className="text-xs text-zinc-400 font-mono">admin@tireflow.com</p>
            <p className="text-xs text-zinc-400 font-mono">Admin123!</p>
          </button>

          <p className="text-center text-xs text-zinc-600 mt-6">
            Não tem conta?{' '}
            <button
              type="button"
              onClick={() => setRegisterOpen(true)}
              className="text-brand-400 hover:text-brand-300 transition-colors"
            >
              Começar gratuitamente
            </button>
          </p>
        </motion.div>
      </div>

      {/* Register Modal */}
      <Modal
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        title="Criar nova conta"
        subtitle="Configure sua empresa no TireFlow"
        size="md"
      >
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="flex items-center gap-2 text-xs text-zinc-500 bg-surface-700 rounded-lg p-3">
            <Building2 size={14} className="text-brand-400 shrink-0" />
            Dados da empresa e do administrador
          </div>
          <Input
            label="Nome da empresa"
            value={regForm.tenantName}
            onChange={(e) => setRegForm((f) => ({ ...f, tenantName: e.target.value }))}
            placeholder="PneusMax Ltda"
            required
          />
          <Input
            label="CNPJ (opcional)"
            value={regForm.cnpj}
            onChange={(e) => setRegForm((f) => ({ ...f, cnpj: e.target.value }))}
            placeholder="00.000.000/0001-00"
          />
          <div className="h-px bg-surface-700" />
          <Input
            label="Seu nome"
            value={regForm.name}
            onChange={(e) => setRegForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="João Silva"
            required
          />
          <Input
            label="E-mail"
            type="email"
            value={regForm.email}
            onChange={(e) => setRegForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="joao@empresa.com"
            required
          />
          <Input
            label="Senha (mín. 8 caracteres)"
            type="password"
            value={regForm.password}
            onChange={(e) => setRegForm((f) => ({ ...f, password: e.target.value }))}
            placeholder="••••••••"
            required
          />
          {regError && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{regError}</p>
          )}
          <Button type="submit" variant="primary" className="w-full" loading={regLoading}>
            {regLoading ? 'Criando conta...' : 'Criar conta e entrar'}
          </Button>
        </form>
      </Modal>
    </div>
  )
}
