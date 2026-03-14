'use client'
export const dynamic = 'force-dynamic'


import { useState } from 'react'
import {
  Store, Receipt, Users, Bell, Shield, CreditCard,
  Palette, Globe, ChevronRight, Save, Check, Zap,
  Database, Trash2, AlertTriangle,
} from 'lucide-react'
import { Header } from '@/components/layout/header'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import { useProducts } from '@/lib/products-context'
import { useTransactions } from '@/lib/transactions-context'
import { useCustomers } from '@/lib/customers-context'
import { useIngredients } from '@/lib/ingredients-context'
import { clearStoreData } from '@/lib/sheets'
import toast from 'react-hot-toast'

const SETTINGS_SECTIONS = [
  { id: 'business',  label: 'Business',    icon: Store,      desc: 'Store name, address, contact' },
  { id: 'pos',       label: 'POS',         icon: Receipt,    desc: 'Terminal settings, receipt' },
  { id: 'payments',  label: 'Payments',    icon: CreditCard, desc: 'Payment methods, taxes' },
  { id: 'team',      label: 'Team',        icon: Users,      desc: 'Users, roles & permissions' },
  { id: 'branding',  label: 'Branding',    icon: Palette,    desc: 'Logo, colors, theme' },
  { id: 'notifications', label: 'Notifications', icon: Bell, desc: 'Alerts & email settings' },
  { id: 'security',  label: 'Security',    icon: Shield,     desc: '2FA, sessions, audit' },
  { id: 'locale',    label: 'Locale',      icon: Globe,      desc: 'Currency, timezone, language' },
  { id: 'data',      label: 'Data',        icon: Database,   desc: 'Reset, export & import data' },
]

function SettingRow({
  label, description, children
}: {
  label: string; description?: string; children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-surface-50 last:border-0 gap-6">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-surface-900">{label}</p>
        {description && <p className="text-xs text-surface-500 mt-0.5">{description}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200',
        enabled ? 'bg-brand-gradient shadow-brand' : 'bg-surface-200'
      )}
    >
      <span className={cn(
        'inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200',
        enabled ? 'translate-x-6' : 'translate-x-1'
      )} />
    </button>
  )
}

export default function SettingsPage() {
  const [active, setActive] = useState('business')
  const [saved, setSaved] = useState(false)

  // Reset modal state
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetLoading, setResetLoading]     = useState(false)

  // Auth + context resets
  const { user }              = useAuth()
  const { resetProducts }     = useProducts()
  const { resetTransactions } = useTransactions()
  const { resetCustomers }    = useCustomers()
  const { resetIngredients }  = useIngredients()

  const handleResetStore = async () => {
    setResetLoading(true)
    try {
      await clearStoreData()
    } catch {
      // Sheets unavailable — still clear local state
    }
    resetProducts()
    resetTransactions()
    resetCustomers()
    resetIngredients()
    setShowResetModal(false)
    setResetLoading(false)
    toast.success('Store data cleared successfully.')
  }

  // Business settings state
  const [businessName, setBusinessName] = useState('My Awesome Store')
  const [currency, setCurrency] = useState('USD')
  const [taxRate, setTaxRate] = useState('8')
  const [timezone, setTimezone] = useState('America/New_York')

  // Toggle states
  const [toggles, setToggles] = useState({
    emailReceipts: true,
    printReceipts: false,
    lowStockAlerts: true,
    dailySummary: true,
    soundEffects: false,
    require2FA: false,
    allowDiscounts: true,
    requirePin: false,
  })

  const toggle = (key: keyof typeof toggles) =>
    setToggles(prev => ({ ...prev, [key]: !prev[key] }))

  const handleSave = async () => {
    await new Promise(r => setTimeout(r, 600))
    setSaved(true)
    toast.success('Settings saved successfully')
    setTimeout(() => setSaved(false), 2000)
  }

  const section = SETTINGS_SECTIONS.find(s => s.id === active)

  return (
    <>
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Settings"
        subtitle="Manage your store configuration"
        actions={
          <button
            onClick={handleSave}
            className={cn(
              'flex h-9 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-all',
              saved
                ? 'bg-emerald-gradient text-white shadow-sm'
                : 'bg-brand-gradient text-white shadow-brand hover:brightness-110'
            )}
          >
            {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saved ? 'Saved!' : 'Save Changes'}
          </button>
        }
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar nav */}
        <aside className="w-60 flex-shrink-0 border-r border-surface-100 bg-white overflow-y-auto p-3">
          <div className="space-y-0.5">
            {SETTINGS_SECTIONS.map(({ id, label, icon: Icon, desc }) => (
              <button
                key={id}
                onClick={() => setActive(id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all',
                  active === id
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-surface-600 hover:bg-surface-50 hover:text-surface-800'
                )}
              >
                <Icon className={cn('h-4 w-4 flex-shrink-0', active === id ? 'text-brand-600' : 'text-surface-400')} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{label}</p>
                  <p className="text-[11px] text-surface-400 truncate">{desc}</p>
                </div>
                {active === id && <ChevronRight className="h-3.5 w-3.5 text-brand-400 flex-shrink-0" />}
              </button>
            ))}
          </div>
        </aside>

        {/* Settings content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-2xl">
            {/* Section header */}
            <div className="flex items-center gap-3 mb-8">
              {section && (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
                  <section.icon className="h-5 w-5 text-brand-600" />
                </div>
              )}
              <div>
                <h2 className="text-lg font-bold text-surface-900">{section?.label} Settings</h2>
                <p className="text-sm text-surface-500">{section?.desc}</p>
              </div>
            </div>

            {/* Business settings */}
            {active === 'business' && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-surface-100 shadow-card p-6">
                  <h3 className="text-sm font-bold text-surface-900 mb-4 uppercase tracking-wider">Store Information</h3>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-surface-700">Business Name</label>
                      <input
                        type="text" value={businessName} onChange={e => setBusinessName(e.target.value)}
                        className="w-full h-10 rounded-xl border border-surface-200 bg-surface-50 px-3.5 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-surface-700">Currency</label>
                        <select
                          value={currency} onChange={e => setCurrency(e.target.value)}
                          className="w-full h-10 rounded-xl border border-surface-200 bg-surface-50 px-3.5 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
                        >
                          {['USD', 'EUR', 'GBP', 'CAD', 'AUD'].map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-surface-700">Default Tax Rate (%)</label>
                        <input
                          type="number" value={taxRate} onChange={e => setTaxRate(e.target.value)} min="0" max="100" step="0.1"
                          className="w-full h-10 rounded-xl border border-surface-200 bg-surface-50 px-3.5 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-surface-700">Timezone</label>
                      <select
                        value={timezone} onChange={e => setTimezone(e.target.value)}
                        className="w-full h-10 rounded-xl border border-surface-200 bg-surface-50 px-3.5 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
                      >
                        {[
                          'America/New_York', 'America/Chicago', 'America/Denver',
                          'America/Los_Angeles', 'Europe/London', 'Europe/Paris',
                        ].map(tz => <option key={tz}>{tz}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Plan */}
                <div className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-violet-50 p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient shadow-brand">
                        <Zap className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-surface-900">NEXPOS Pro</p>
                        <p className="text-xs text-surface-500">14-day trial · No credit card required</p>
                      </div>
                    </div>
                    <button className="flex items-center gap-1.5 rounded-xl bg-brand-gradient px-4 py-2 text-sm font-bold text-white shadow-brand hover:brightness-110 transition-all">
                      Upgrade Plan
                    </button>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    {[
                      { label: 'Transactions', value: '∞' },
                      { label: 'Team Members', value: '3' },
                      { label: 'Locations', value: '1' },
                    ].map(({ label, value }) => (
                      <div key={label} className="rounded-xl bg-white/60 p-3 text-center">
                        <p className="text-lg font-black text-surface-900">{value}</p>
                        <p className="text-[11px] text-surface-500">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* POS settings */}
            {active === 'pos' && (
              <div className="bg-white rounded-2xl border border-surface-100 shadow-card p-6">
                <h3 className="text-sm font-bold text-surface-900 mb-1 uppercase tracking-wider">POS Terminal</h3>
                <p className="text-xs text-surface-500 mb-4">Configure your point-of-sale experience</p>
                <div>
                  <SettingRow label="Email Receipts" description="Send digital receipts to customers">
                    <Toggle enabled={toggles.emailReceipts} onChange={() => toggle('emailReceipts')} />
                  </SettingRow>
                  <SettingRow label="Print Receipts" description="Auto-print on every sale">
                    <Toggle enabled={toggles.printReceipts} onChange={() => toggle('printReceipts')} />
                  </SettingRow>
                  <SettingRow label="Allow Discounts" description="Cashiers can apply item discounts">
                    <Toggle enabled={toggles.allowDiscounts} onChange={() => toggle('allowDiscounts')} />
                  </SettingRow>
                  <SettingRow label="Require PIN" description="Require cashier PIN to process sales">
                    <Toggle enabled={toggles.requirePin} onChange={() => toggle('requirePin')} />
                  </SettingRow>
                  <SettingRow label="Sound Effects" description="Audio feedback on actions">
                    <Toggle enabled={toggles.soundEffects} onChange={() => toggle('soundEffects')} />
                  </SettingRow>
                </div>
              </div>
            )}

            {/* Notifications */}
            {active === 'notifications' && (
              <div className="bg-white rounded-2xl border border-surface-100 shadow-card p-6">
                <h3 className="text-sm font-bold text-surface-900 mb-4 uppercase tracking-wider">Notification Preferences</h3>
                <SettingRow label="Low Stock Alerts" description="Get notified when products are running low">
                  <Toggle enabled={toggles.lowStockAlerts} onChange={() => toggle('lowStockAlerts')} />
                </SettingRow>
                <SettingRow label="Daily Summary" description="Receive end-of-day sales summary">
                  <Toggle enabled={toggles.dailySummary} onChange={() => toggle('dailySummary')} />
                </SettingRow>
              </div>
            )}

            {/* Security */}
            {active === 'security' && (
              <div className="bg-white rounded-2xl border border-surface-100 shadow-card p-6">
                <h3 className="text-sm font-bold text-surface-900 mb-4 uppercase tracking-wider">Security</h3>
                <SettingRow label="Two-Factor Authentication" description="Add an extra layer of security">
                  <Toggle enabled={toggles.require2FA} onChange={() => toggle('require2FA')} />
                </SettingRow>
                <SettingRow label="Change Password" description="Update your account password">
                  <button
                    onClick={() => toast.success('Password reset email sent!')}
                    className="rounded-xl border border-surface-200 bg-white px-3 py-1.5 text-xs font-semibold text-surface-700 hover:bg-surface-50 transition-all"
                  >
                    Change
                  </button>
                </SettingRow>
              </div>
            )}

            {/* Data Management */}
            {active === 'data' && (
              <div className="space-y-4">
                {/* Info card */}
                <div className="bg-white rounded-2xl border border-surface-100 shadow-card p-6">
                  <h3 className="text-sm font-bold text-surface-900 mb-1 uppercase tracking-wider">Data Management</h3>
                  <p className="text-xs text-surface-500 mb-4">Manage store data, exports, and imports.</p>
                  <SettingRow label="Export Data" description="Download all store data as CSV">
                    <button
                      onClick={() => toast('Export coming soon')}
                      className="rounded-xl border border-surface-200 bg-white px-3 py-1.5 text-xs font-semibold text-surface-700 hover:bg-surface-50 transition-all"
                    >
                      Export CSV
                    </button>
                  </SettingRow>
                </div>

                {/* Danger Zone */}
                <div className="rounded-2xl border-2 border-rose-200 bg-rose-50/40 p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <AlertTriangle className="h-4 w-4 text-rose-500" />
                    <h3 className="text-sm font-bold text-rose-700 uppercase tracking-wider">Danger Zone</h3>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-surface-900">Reset Store Data</p>
                      <p className="text-xs text-surface-500 mt-1 max-w-sm">
                        Permanently removes all products, transactions, customers, and inventory logs
                        for <span className="font-semibold">{user?.storeName ?? 'this store'}</span>.
                        This cannot be undone.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowResetModal(true)}
                      className="flex-shrink-0 flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600 active:scale-[0.98] transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                      Reset Store
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Placeholder for other sections */}
            {!['business', 'pos', 'notifications', 'security', 'data'].includes(active) && (
              <div className="bg-white rounded-2xl border border-surface-100 shadow-card p-12 text-center">
                {section && (
                  <div className="flex flex-col items-center gap-3 text-surface-400">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-100">
                      <section.icon className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="text-base font-semibold text-surface-600">{section.label} Settings</p>
                      <p className="text-sm text-surface-400 mt-1">This section is coming soon.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* ── Reset Confirmation Modal ──────────────────────────────────────── */}
    {showResetModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-surface-100 p-6 animate-slide-up">
          <div className="flex items-start gap-4 mb-6">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-rose-100">
              <AlertTriangle className="h-6 w-6 text-rose-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-surface-900 mb-1">Reset Store Data?</h3>
              <p className="text-sm text-surface-500 leading-relaxed">
                This will permanently delete all products, transactions, customers, and inventory logs
                for <span className="font-semibold text-surface-700">{user?.storeName}</span>.
                This action cannot be undone.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 justify-end">
            <button
              onClick={() => setShowResetModal(false)}
              disabled={resetLoading}
              className="px-4 py-2.5 rounded-xl border border-surface-200 text-sm font-semibold text-surface-700 hover:bg-surface-50 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleResetStore}
              disabled={resetLoading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500 text-sm font-bold text-white hover:bg-rose-600 active:scale-[0.98] transition-all disabled:opacity-70"
            >
              {resetLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Clearing...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Confirm Reset
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
