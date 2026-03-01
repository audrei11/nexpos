'use client'

import { useState } from 'react'
import {
  BarChart3, TrendingUp, Download, Calendar,
  DollarSign, ShoppingCart, Users, ArrowUpRight
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import { Header } from '@/components/layout/header'
import { cn, formatCurrency } from '@/lib/utils'
import { REVENUE_DATA, RECENT_ORDERS, TOP_PRODUCTS } from '@/lib/mock-data'
import toast from 'react-hot-toast'

const CATEGORY_REVENUE = [
  { name: 'Electronics', value: 4520, color: '#6366F1' },
  { name: 'Clothing',    value: 2880, color: '#8B5CF6' },
  { name: 'Food',        value: 1940, color: '#10B981' },
  { name: 'Beverages',   value: 1230, color: '#F59E0B' },
  { name: 'Accessories', value: 890,  color: '#F43F5E' },
  { name: 'Home',        value: 430,  color: '#3B82F6' },
]

const HOURLY_DATA = Array.from({ length: 12 }, (_, i) => ({
  hour: `${8 + i}:00`,
  orders: Math.floor(Math.random() * 18) + 2,
  revenue: Math.floor(Math.random() * 800) + 100,
}))

function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ value: number; name: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-900 rounded-xl px-3 py-2 shadow-card-lg border border-white/10">
      <p className="text-xs text-surface-400 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} className="text-sm font-bold text-white num-display">
          {p.name === 'revenue' || p.name === 'Revenue' ? formatCurrency(p.value) : p.value}
        </p>
      ))}
    </div>
  )
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<'today' | '7d' | '30d' | '90d'>('7d')

  const totalRevenue = REVENUE_DATA.reduce((s, d) => s + d.revenue, 0)
  const totalOrders  = REVENUE_DATA.reduce((s, d) => s + d.orders, 0)
  const avgOrder     = totalRevenue / totalOrders
  const topCategory  = CATEGORY_REVENUE[0]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Reports & Analytics"
        subtitle="Insights from your sales data"
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-xl border border-surface-200 bg-white p-1">
              {(['today', '7d', '30d', '90d'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                    period === p
                      ? 'bg-brand-gradient text-white shadow-sm'
                      : 'text-surface-500 hover:text-surface-700'
                  )}
                >
                  {p === 'today' ? 'Today' : p}
                </button>
              ))}
            </div>
            <button
              onClick={() => toast.success('Report exported!')}
              className="flex h-9 items-center gap-2 rounded-xl border border-surface-200 bg-white px-3 text-sm text-surface-600 hover:bg-surface-50 transition-all"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* KPI Row */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: 'Total Revenue', value: formatCurrency(totalRevenue), change: +12.4, icon: DollarSign, color: 'text-brand-600', bg: 'bg-brand-50' },
            { label: 'Total Orders',  value: totalOrders,                  change: +8.2,  icon: ShoppingCart, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Avg Order Value', value: formatCurrency(avgOrder),   change: +3.8,  icon: BarChart3, color: 'text-violet-600', bg: 'bg-violet-50' },
            { label: 'Top Category',  value: topCategory.name,             change: +5.1,  icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
          ].map(({ label, value, change, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-2xl border border-surface-100 shadow-card p-5">
              <div className="flex items-start justify-between mb-4">
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', bg)}>
                  <Icon className={cn('h-5 w-5', color)} />
                </div>
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5">
                  <ArrowUpRight className="h-3 w-3" />{change}%
                </span>
              </div>
              <p className="text-xl font-black text-surface-900 num-display">{value}</p>
              <p className="text-sm text-surface-500 mt-1">{label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Revenue trend */}
          <div className="xl:col-span-2 bg-white rounded-2xl border border-surface-100 shadow-card p-6">
            <h3 className="text-base font-semibold text-surface-900 mb-1">Revenue Trend</h3>
            <p className="text-sm text-surface-500 mb-5">Daily revenue over the selected period</p>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={REVENUE_DATA} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366F1" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#6366F1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area type="monotone" dataKey="revenue" stroke="#6366F1" strokeWidth={2.5} fill="url(#revGrad)" dot={false} activeDot={{ r: 5, fill: '#6366F1', stroke: '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Category breakdown */}
          <div className="bg-white rounded-2xl border border-surface-100 shadow-card p-6">
            <h3 className="text-base font-semibold text-surface-900 mb-1">By Category</h3>
            <p className="text-sm text-surface-500 mb-4">Revenue distribution</p>
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={CATEGORY_REVENUE} cx="50%" cy="50%" innerRadius={42} outerRadius={62} dataKey="value" strokeWidth={2} stroke="#fff">
                  {CATEGORY_REVENUE.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 space-y-2">
              {CATEGORY_REVENUE.map(cat => (
                <div key={cat.name} className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                  <span className="text-xs text-surface-600 flex-1">{cat.name}</span>
                  <span className="text-xs font-semibold text-surface-800 num-display">{formatCurrency(cat.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Orders by hour */}
          <div className="bg-white rounded-2xl border border-surface-100 shadow-card p-6">
            <h3 className="text-base font-semibold text-surface-900 mb-1">Orders by Hour</h3>
            <p className="text-sm text-surface-500 mb-5">Today&apos;s order distribution</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={HOURLY_DATA} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.05)' }} />
                <Bar dataKey="orders" fill="#6366F1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top products */}
          <div className="bg-white rounded-2xl border border-surface-100 shadow-card p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-semibold text-surface-900">Best Sellers</h3>
                <p className="text-sm text-surface-500 mt-0.5">Top 5 products by revenue</p>
              </div>
            </div>
            <div className="space-y-3">
              {TOP_PRODUCTS.map((p, idx) => {
                const maxRev = TOP_PRODUCTS[0].revenue
                const pct = (p.revenue / maxRev) * 100
                return (
                  <div key={p.id} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-surface-300 w-4 flex-shrink-0">{idx + 1}</span>
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-surface-50 text-lg">
                      {p.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-semibold text-surface-800 truncate">{p.name}</p>
                        <span className="text-xs font-bold text-surface-900 num-display ml-2 flex-shrink-0">{formatCurrency(p.revenue)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-surface-100 overflow-hidden">
                        <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Recent transactions */}
        <div className="bg-white rounded-2xl border border-surface-100 shadow-card">
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
            <div>
              <h3 className="text-base font-semibold text-surface-900">Transaction History</h3>
              <p className="text-xs text-surface-500 mt-0.5">All sales from the selected period</p>
            </div>
            <button
              onClick={() => toast.success('Exporting transactions...')}
              className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:underline"
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-50 bg-surface-50/30">
                  <th className="px-6 py-2.5 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">Order #</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">Customer</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">Items</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">Payment</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-surface-400 uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-50">
                {RECENT_ORDERS.map(order => (
                  <tr key={order.id} className="hover:bg-surface-50/50 transition-colors">
                    <td className="px-6 py-3 text-sm font-semibold text-surface-900">{order.orderNumber}</td>
                    <td className="px-4 py-3 text-sm text-surface-600">{order.customerName ?? 'Walk-in'}</td>
                    <td className="px-4 py-3 text-sm text-surface-500">{order.items.length}</td>
                    <td className="px-4 py-3 text-sm text-surface-600 capitalize">{order.paymentMethod}</td>
                    <td className="px-4 py-3 text-sm font-bold text-surface-900 text-right num-display">{formatCurrency(order.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
