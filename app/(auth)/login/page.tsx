'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Zap, ArrowRight, Shield } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('demo@nexpos.app')
  const [password, setPassword] = useState('demo1234')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    // Simulate auth
    await new Promise(r => setTimeout(r, 1200))
    toast.success('Welcome back, Alex!')
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex bg-surface-50">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-[52%] flex-col relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #0F172A 0%, #1E293B 50%, #312E81 100%)' }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #6366F1, transparent)' }}
        />
        <div className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #8B5CF6, transparent)' }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, #6366F1, transparent)' }}
        />

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
                'Multi-location support',
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

      {/* Right Panel — Login Form */}
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
            <p className="text-surface-500 mt-2">Sign in to your POS dashboard</p>
          </div>

          {/* Demo notice */}
          <div className="mb-6 flex items-start gap-3 rounded-xl bg-brand-50 border border-brand-100 p-4">
            <Shield className="h-4 w-4 text-brand-500 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-surface-600">
              <p className="font-semibold text-brand-700 mb-0.5">Demo mode active</p>
              <p>Credentials pre-filled. Click Sign In to explore the app.</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-surface-700">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full h-11 rounded-xl border border-surface-200 bg-white px-4 text-sm text-surface-900 placeholder:text-surface-400 shadow-inner-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
                placeholder="you@business.com"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-surface-700">Password</label>
                <button type="button" className="text-xs text-brand-600 font-semibold hover:underline">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full h-11 rounded-xl border border-surface-200 bg-white px-4 pr-11 text-sm text-surface-900 placeholder:text-surface-400 shadow-inner-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
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

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-surface-100" />
            <span className="text-xs text-surface-400 font-medium">or continue with</span>
            <div className="flex-1 h-px bg-surface-100" />
          </div>

          {/* SSO buttons */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Google', icon: 'G' },
              { label: 'Microsoft', icon: 'M' },
            ].map(({ label, icon }) => (
              <button
                key={label}
                className="flex h-11 items-center justify-center gap-2.5 rounded-xl border border-surface-200 bg-white text-sm font-semibold text-surface-700 hover:bg-surface-50 hover:border-surface-300 transition-all active:scale-[0.98]"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-100 text-xs font-black">
                  {icon}
                </span>
                {label}
              </button>
            ))}
          </div>

          {/* Footer */}
          <p className="mt-8 text-center text-sm text-surface-500">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-semibold text-brand-600 hover:underline">
              Start free trial
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
