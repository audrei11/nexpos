'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Zap, ArrowRight, Check } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    businessName: '',
    businessType: '',
  })

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (step === 1) { setStep(2); return }
    setLoading(true)
    await new Promise(r => setTimeout(r, 1400))
    toast.success('Account created! Welcome to NEXPOS.')
    router.push('/dashboard')
  }

  const PLAN_FEATURES = [
    '14-day free trial, no credit card',
    'Unlimited POS transactions',
    'Inventory management',
    'Sales analytics & reports',
    'Up to 3 users',
  ]

  return (
    <div className="min-h-screen flex bg-surface-50">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-[48%] flex-col relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #0F172A 0%, #1E293B 50%, #312E81 100%)' }}
      >
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #8B5CF6, transparent)' }} />
        <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #6366F1, transparent)' }} />

        <div className="relative z-10 flex flex-col h-full p-12 justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-gradient shadow-brand-lg">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-black text-white">NEXPOS</span>
          </div>

          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-500/20 px-4 py-1.5 mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-brand-300 uppercase tracking-wider">Free 14-day trial</span>
            </div>
            <h1 className="text-4xl font-black text-white leading-tight mb-4">
              Start selling in
              <br />
              <span className="gradient-text">minutes, not days.</span>
            </h1>
            <p className="text-surface-400 mb-8 leading-relaxed">
              Set up your store, add products, and start processing payments right away.
            </p>
            <div className="space-y-3">
              {PLAN_FEATURES.map(f => (
                <div key={f} className="flex items-center gap-3">
                  <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-gradient">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-sm text-surface-300">{f}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-xs text-surface-600">
            By signing up you agree to our{' '}
            <span className="text-surface-400 underline cursor-pointer">Terms of Service</span>
            {' '}and{' '}
            <span className="text-surface-400 underline cursor-pointer">Privacy Policy</span>.
          </div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex flex-1 flex-col items-center justify-center px-8 py-12">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-gradient">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-black text-surface-900">NEXPOS</span>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-3 mb-8">
            {[1, 2].map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  step >= s
                    ? 'bg-brand-gradient text-white shadow-brand'
                    : 'bg-surface-100 text-surface-400'
                }`}>
                  {step > s ? <Check className="h-3.5 w-3.5" /> : s}
                </div>
                <span className={`text-xs font-medium ${step >= s ? 'text-surface-700' : 'text-surface-400'}`}>
                  {s === 1 ? 'Your Account' : 'Your Business'}
                </span>
                {s < 2 && <div className="h-px w-8 bg-surface-200" />}
              </div>
            ))}
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-black text-surface-900">
              {step === 1 ? 'Create your account' : 'Set up your store'}
            </h2>
            <p className="text-surface-500 mt-1 text-sm">
              {step === 1 ? 'Start your free 14-day trial.' : 'Tell us about your business.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 1 ? (
              <>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-surface-700">Full name</label>
                  <input
                    type="text" required value={form.name} onChange={update('name')}
                    placeholder="Alex Chen"
                    className="w-full h-11 rounded-xl border border-surface-200 bg-white px-4 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-surface-700">Work email</label>
                  <input
                    type="email" required value={form.email} onChange={update('email')}
                    placeholder="you@company.com"
                    className="w-full h-11 rounded-xl border border-surface-200 bg-white px-4 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-surface-700">Password</label>
                  <input
                    type="password" required value={form.password} onChange={update('password')}
                    placeholder="Min. 8 characters"
                    className="w-full h-11 rounded-xl border border-surface-200 bg-white px-4 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-surface-700">Business name</label>
                  <input
                    type="text" required value={form.businessName} onChange={update('businessName')}
                    placeholder="My Awesome Store"
                    className="w-full h-11 rounded-xl border border-surface-200 bg-white px-4 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-surface-700">Business type</label>
                  <select
                    required value={form.businessType} onChange={update('businessType')}
                    className="w-full h-11 rounded-xl border border-surface-200 bg-white px-4 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all appearance-none"
                  >
                    <option value="">Select a type...</option>
                    <option value="retail">Retail Store</option>
                    <option value="cafe">Café / Coffee Shop</option>
                    <option value="restaurant">Restaurant</option>
                    <option value="grocery">Grocery / Market</option>
                    <option value="fashion">Fashion / Apparel</option>
                    <option value="electronics">Electronics</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </>
            )}

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
                  Creating account...
                </>
              ) : step === 1 ? (
                <>Continue <ArrowRight className="h-4 w-4" /></>
              ) : (
                <>Launch my store <Zap className="h-4 w-4" /></>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-surface-500">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-brand-600 hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
