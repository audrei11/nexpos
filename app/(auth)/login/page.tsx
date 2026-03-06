'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Zap, ArrowRight, AlertCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { STORE_HINTS } from '@/lib/auth'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()

  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const result = await login(email.trim(), password)

    setLoading(false)

    if (!result.ok) {
      setError(result.error ?? 'Login failed.')
      return
    }

    toast.success('Welcome back! Loading your store...')
    router.push('/dashboard')
  }

  /** Fill the form with a demo account on click */
  const fillDemo = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail)
    setPassword(demoPassword)
    setError(null)
  }

  return (
    <div className="min-h-screen flex bg-surface-50">

      {/* ── Left Panel — Branding ─────────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[52%] flex-col relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #0F172A 0%, #1E293B 50%, #312E81 100%)' }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #6366F1, transparent)' }} />
        <div className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #8B5CF6, transparent)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, #6366F1, transparent)' }} />

        <div className="relative z-10 flex flex-col h-full p-12">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-auto">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-gradient shadow-brand-lg">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-black text-white tracking-tight">NEXPOS</span>
            <span className="rounded-full bg-brand-500/20 px-2 py-0.5 text-[10px] font-bold text-brand-400 uppercase tracking-wider">Pro</span>
          </div>

          {/* Main copy */}
          <div className="mb-auto">
            <h1 className="text-5xl font-black text-white leading-[1.1] mb-6">
              The POS system
              <br />
              <span className="gradient-text">built for growth.</span>
            </h1>
            <p className="text-surface-400 text-lg leading-relaxed max-w-sm">
              Sell faster, manage smarter, and scale with confidence. NEXPOS powers modern retail from day one.
            </p>

            {/* Features */}
            <div className="mt-10 space-y-3">
              {[
                'Lightning-fast POS terminal',
                'Real-time inventory tracking',
                'Smart analytics & reports',
                'Multi-store support',
              ].map((feat) => (
                <div key={feat} className="flex items-center gap-3">
                  <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand-gradient">
                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm text-surface-300 font-medium">{feat}</span>
                </div>
              ))}
            </div>

            {/* Demo store quick-login cards */}
            <div className="mt-10">
              <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">
                Demo stores — click to fill
              </p>
              <div className="space-y-2">
                {STORE_HINTS.map(store => (
                  <button
                    key={store.email}
                    type="button"
                    onClick={() => fillDemo(store.email, store.password)}
                    className="w-full flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-left hover:bg-white/10 hover:border-white/20 transition-all group"
                  >
                    <span className="text-xl">{store.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white group-hover:text-brand-300 transition-colors">{store.name}</p>
                      <p className="text-[11px] text-surface-500 font-mono">{store.email} / {store.password}</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-surface-600 group-hover:text-brand-400 transition-colors flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Social proof */}
          <div className="flex items-center gap-4 pt-8 border-t border-white/10">
            <div className="flex -space-x-2">
              {['AC', 'MK', 'EW', 'JL'].map((init, i) => (
                <div
                  key={i}
                  className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface-800 bg-brand-gradient text-[10px] font-bold text-white"
                >
                  {init}
                </div>
              ))}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">2,400+ businesses</p>
              <p className="text-xs text-surface-400">trust NEXPOS daily</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Panel — Login Form ──────────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center px-8 py-12">
        <div className="w-full max-w-[400px]">

          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-gradient">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-black text-surface-900">NEXPOS</span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-black text-surface-900">Welcome back</h2>
            <p className="text-surface-500 mt-2">Sign in to your store dashboard</p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-5 flex items-center gap-3 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 animate-slide-up">
              <AlertCircle className="h-4 w-4 text-rose-500 flex-shrink-0" />
              <p className="text-sm font-medium text-rose-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-surface-700">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(null) }}
                required
                autoComplete="email"
                autoFocus
                className="w-full h-11 rounded-xl border border-surface-200 bg-white px-4 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
                placeholder="store@test.com"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-surface-700">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(null) }}
                  required
                  autoComplete="current-password"
                  className="w-full h-11 rounded-xl border border-surface-200 bg-white px-4 pr-11 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full h-12 rounded-xl bg-brand-gradient text-white text-sm font-bold shadow-brand hover:shadow-brand-lg hover:brightness-110 transition-all active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Mobile store hints */}
          <div className="mt-8 lg:hidden">
            <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3 text-center">
              Demo accounts
            </p>
            <div className="space-y-2">
              {STORE_HINTS.map(store => (
                <button
                  key={store.email}
                  type="button"
                  onClick={() => fillDemo(store.email, store.password)}
                  className="w-full flex items-center gap-3 rounded-xl border border-surface-200 bg-white px-4 py-2.5 text-left hover:border-brand-300 hover:bg-brand-50 transition-all"
                >
                  <span className="text-lg">{store.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-surface-800">{store.name}</p>
                    <p className="text-[11px] text-surface-400 font-mono">{store.email} / {store.password}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
