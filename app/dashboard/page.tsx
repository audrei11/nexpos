'use client'

import { useState } from 'react'
import {
  TrendingUp, TrendingDown, ShoppingCart, Package,
  Users, DollarSign, ArrowUpRight, ArrowDownRight,
  MoreHorizontal, Eye, Clock, ChevronRight,
  Activity, Boxes
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts'
import { Header } from '@/components/layout/header'
import { Badge } from '@/components/ui/badge'
import { cn, formatCurrency, formatTime } from '@/lib/utils'
import { REVENUE_DATA, RECENT_ORDERS, TOP_PRODUCTS, PRODUCTS } from '@/lib/mock-data'
import Link from 'next/link'

// ─── Stat Card ────────────────────────────────────────────────────────────
function StatCard({
  title, value, change, changeLabel, icon: Icon, accent, prefix = '',
}: {
  title: string
  value: string | number
  change: number
  changeLabel: string
  icon: React.ComponentType<{ className?: string }>
  accent: 'indigo' | 'emerald' | 'violet' | 'amber' | 'rose'
  prefix?: string
}) {
  const positive = change >= 0
  const accentMap = {
    indigo:  { bg: 'bg-brand-50',   text: 'text-brand-600',   border: 'border-t-brand-500',  icon: 'bg-brand-100',   iconText: 'text-brand-600'  },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-t-emerald-500',icon: 'bg-emerald-100', iconText: 'text-emerald-600' },
    violet:  { bg: 'bg-violet-50',  text: 'text-violet-600',  border: 'border-t-violet-500', icon: 'bg-violet-100',  iconText: 'text-violet-600'  },
    amber:   { bg: 'bg-amber-50',   text: 'text-amber-600',   border: 'border-t-amber-500',  icon: 'bg-amber-100',   iconText: 'text-amber-600'   },
    rose:    { bg: 'bg-rose-50',    text: 'text-rose-600',    border: 'border-t-rose-500',   icon: 'bg-rose-100',    iconText: 'text-rose-600'    },
  }
  const c = accentMap[accent]

  return (
    <div className={cn(
      'bg-white rounded-2xl border-t-[3px] border border-surface-100 p-6 shadow-card hover:shadow-card-md transition-all duration-200',
      c.border.replace('border-t-', 'border-t-').split(' ')[0]
    )}
    style={{ borderTopColor: accent === 'indigo' ? '#6366F1' : accent === 'emerald' ? '#10B981' : accent === 'violet' ? '#8B5CF6' : accent === 'amber' ? '#F59E0B' : '#F43F5E' }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', c.icon)}>
          <Icon className={cn('h-5 w-5', c.iconText)} />
        </div>
        <span className={cn(
          'flex items-center gap-1 text-xs font-semibold rounded-full px-2 py-1',
          positive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
        )}>
          {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {Math.abs(change)}%
        </span>
      </div>
      <div>
        <p className="text-2xl font-black text-surface-900 num-display">
          {prefix}{typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        <p className="text-sm text-surface-500 mt-1 font-medium">{title}</p>
        <p className="text-xs text-surface-400 mt-1">{changeLabel}</p>
      </div>
    </div>
  )
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-900 rounded-xl px-3 py-2 shadow-card-lg border border-white/10">
      <p className="text-xs text-surface-400 mb-1">{label}</p>
      <p className="text-sm font-bold text-white num-display">{formatCurrency(payload[0].value)}</p>
      {payload[1] && (
        <p className="text-xs text-surface-400">{payload[1].value} orders</p>
      )}
    </div>
  )
}

const statusConfig = {
  completed: { label: 'Completed', variant: 'success' as const },
  refunded:  { label: 'Refunded',  variant: 'warning' as const },
  pending:   { label: 'Pending',   variant: 'default' as const },
  cancelled: { label: 'Cancelled', variant: 'danger'  as const },
}

const paymentConfig = {
  card:   { label: 'Card',   icon: '💳' },
  cash:   { label: 'Cash',   icon: '💵' },
  mobile: { label: 'QR',    icon: '📱' },
  credit: { label: 'Credit', icon: '🏦' },
}

export default function DashboardPage() {
  const [chartPeriod, setChartPeriod] = useState<'7d' | '30d' | '90d'>('7d')

  const lowStockProducts = PRODUCTS.filter(p => p.stock <= (p.minStock ?? 5) && p.stock > 0)
  const outOfStockProducts = PRODUCTS.filter(p => p.stock === 0)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Dashboard"
        subtitle={`Welcome back, Alex · ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`}
        actions={
          <Link
            href="/dashboard/pos"
            className="flex h-9 items-center gap-2 rounded-xl bg-brand-gradient px-4 text-sm font-semibold text-white shadow-brand hover:shadow-brand-lg hover:brightness-110 transition-all"
          >
            <ShoppingCart className="h-4 w-4" />
            Open POS
          </Link>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Today's Revenue"
            value={formatCurrency(5890).replace('$', '')}
            change={+12.4}
            changeLabel="vs yesterday $5,240"
            icon={DollarSign}
            accent="indigo"
            prefix="$"
          />
          <StatCard
            title="Orders Today"
            value={52}
            change={+8.2}
            changeLabel="vs yesterday 48 orders"
            icon={ShoppingCart}
            accent="emerald"
          />
          <StatCard
            title="Avg Order Value"
            value={formatCurrency(113.27).replace('$', '')}
            change={+3.8}
            changeLabel="vs yesterday $109.15"
            icon={Activity}
            accent="violet"
            prefix="$"
          />
          <StatCard
            title="Low Stock Items"
            value={lowStockProducts.length + outOfStockProducts.length}
            change={-2}
            changeLabel={`${outOfStockProducts.length} out of stock`}
            icon={Boxes}
            accent="amber"
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
          {/* Revenue Chart — 2/3 width */}
          <div className="xl:col-span-2 bg-white rounded-2xl border border-surface-100 shadow-card p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-semibold text-surface-900">Revenue Overview</h3>
                <p className="text-sm text-surface-500 mt-0.5">Daily revenue for the last 7 days</p>
              </div>
              <div className="flex items-center gap-1 rounded-xl border border-surface-200 p-1">
                {(['7d', '30d', '90d'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setChartPeriod(p)}
                    className={cn(
                      'px-3 py-1 rounded-lg text-xs font-semibold transition-all',
                      chartPeriod === p
                        ? 'bg-brand-gradient text-white shadow-sm'
                        : 'text-surface-500 hover:text-surface-700'
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={REVENUE_DATA} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366F1" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#6366F1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#6366F1"
                  strokeWidth={2.5}
                  fill="url(#revenueGrad)"
                  dot={false}
                  activeDot={{ r: 5, fill: '#6366F1', strokeWidth: 2, stroke: '#fff' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Top Products — 1/3 width */}
          <div className="bg-white rounded-2xl border border-surface-100 shadow-card p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-surface-900">Top Products</h3>
              <button className="text-xs text-brand-600 font-semibold hover:underline">See all</button>
            </div>
            <div className="space-y-3">
              {TOP_PRODUCTS.map((p, idx) => (
                <div key={p.id} className="flex items-center gap-3 group">
                  <span className="text-xs font-bold text-surface-300 w-4 flex-shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-surface-50 text-lg group-hover:bg-brand-50 transition-colors">
                    {p.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-surface-800 truncate">{p.name}</p>
                    <p className="text-xs text-surface-400">{p.units} units sold</p>
                  </div>
                  <span className="text-sm font-bold text-surface-900 num-display flex-shrink-0">
                    {formatCurrency(p.revenue)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Recent Orders — 2/3 */}
          <div className="xl:col-span-2 bg-white rounded-2xl border border-surface-100 shadow-card">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
              <div>
                <h3 className="text-base font-semibold text-surface-900">Recent Orders</h3>
                <p className="text-xs text-surface-500 mt-0.5">Latest transactions from today</p>
              </div>
              <Link
                href="/dashboard/reports"
                className="flex items-center gap-1 text-xs text-brand-600 font-semibold hover:underline"
              >
                View all <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="divide-y divide-surface-50">
              {RECENT_ORDERS.map(order => {
                const status = statusConfig[order.status]
                const payment = paymentConfig[order.paymentMethod]
                return (
                  <div key={order.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-surface-50 transition-colors group">
                    {/* Order # */}
                    <div className="flex-shrink-0 min-w-[88px]">
                      <p className="text-sm font-semibold text-surface-900">{order.orderNumber}</p>
                      <p className="text-xs text-surface-400 flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" />
                        {formatTime(order.createdAt)}
                      </p>
                    </div>
                    {/* Customer */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-surface-700 truncate">
                        {order.customerName ?? 'Walk-in Customer'}
                      </p>
                      <p className="text-xs text-surface-400">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</p>
                    </div>
                    {/* Payment */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-base leading-none">{payment.icon}</span>
                      <span className="text-xs text-surface-500">{payment.label}</span>
                    </div>
                    {/* Status */}
                    <Badge variant={status.variant} size="sm">{status.label}</Badge>
                    {/* Total */}
                    <span className="text-sm font-bold text-surface-900 num-display flex-shrink-0 min-w-[64px] text-right">
                      {formatCurrency(order.total)}
                    </span>
                    {/* Action */}
                    <button className="flex h-7 w-7 items-center justify-center rounded-lg text-surface-300 opacity-0 group-hover:opacity-100 transition-all hover:bg-surface-100 hover:text-surface-600">
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Inventory Alerts — 1/3 */}
          <div className="bg-white rounded-2xl border border-surface-100 shadow-card">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
              <h3 className="text-base font-semibold text-surface-900">Stock Alerts</h3>
              <Badge variant="warning" dot>
                {lowStockProducts.length + outOfStockProducts.length}
              </Badge>
            </div>
            <div className="p-4 space-y-2">
              {outOfStockProducts.map(p => (
                <div key={p.id} className="flex items-center gap-3 rounded-xl bg-rose-50 border border-rose-100 px-3 py-2.5">
                  <span className="text-xl flex-shrink-0">{p.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-surface-800 truncate">{p.name}</p>
                    <p className="text-xs text-rose-600 font-medium">Out of stock</p>
                  </div>
                  <Badge variant="danger" size="sm">0</Badge>
                </div>
              ))}
              {lowStockProducts.map(p => (
                <div key={p.id} className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2.5">
                  <span className="text-xl flex-shrink-0">{p.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-surface-800 truncate">{p.name}</p>
                    <p className="text-xs text-amber-600 font-medium">Low stock</p>
                  </div>
                  <Badge variant="warning" size="sm">{p.stock}</Badge>
                </div>
              ))}
              {lowStockProducts.length + outOfStockProducts.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-8 text-center text-surface-400">
                  <Package className="h-8 w-8 opacity-30" />
                  <p className="text-sm">All stock levels OK</p>
                </div>
              )}
            </div>
            <div className="px-4 pb-4">
              <Link
                href="/dashboard/inventory"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-surface-200 py-2.5 text-sm font-semibold text-surface-600 hover:bg-surface-50 hover:text-brand-600 hover:border-brand-200 transition-all"
              >
                View Inventory <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
