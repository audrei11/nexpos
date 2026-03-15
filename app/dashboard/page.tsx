'use client'
export const dynamic = 'force-dynamic'


import { useState, useMemo } from 'react'
import {
  TrendingUp, TrendingDown, ShoppingCart, Package,
  DollarSign,
  Clock, ChevronRight,
  Activity, Boxes, FlaskConical
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts'
import { Header } from '@/components/layout/header'
import { Badge } from '@/components/ui/badge'
import { cn, formatCurrency, formatDateTime, convertToStockUnit } from '@/lib/utils'
import { useProducts } from '@/lib/products-context'
import { useTransactions } from '@/lib/transactions-context'
import { useIngredients } from '@/lib/ingredients-context'
import { useIngredientUsage } from '@/lib/ingredient-usage-context'
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
  payload?: Array<{ value: number; dataKey: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  const rev  = payload.find(p => p.dataKey === 'revenue')?.value ?? 0
  const cost = payload.find(p => p.dataKey === 'cost')?.value ?? 0
  const profit = rev - cost
  return (
    <div className="bg-surface-900 rounded-xl px-3 py-2.5 shadow-card-lg border border-white/10 min-w-[160px]">
      <p className="text-xs text-surface-400 mb-2">{label}</p>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-xs text-surface-400">
            <span className="inline-block w-2 h-2 rounded-full bg-indigo-400" />Revenue
          </span>
          <span className="text-xs font-bold text-white num-display">{formatCurrency(rev)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-xs text-surface-400">
            <span className="inline-block w-2 h-2 rounded-full bg-rose-400" />Ing. Cost
          </span>
          <span className="text-xs font-bold text-rose-300 num-display">{formatCurrency(cost)}</span>
        </div>
        <div className="border-t border-white/10 pt-1.5 flex items-center justify-between gap-4">
          <span className="text-xs text-surface-400">Gross Profit</span>
          <span className={`text-xs font-bold num-display ${profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatCurrency(profit)}
          </span>
        </div>
      </div>
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

type Period = 'today' | '7d' | '30d' | '90d'

function getPeriodBounds(period: Period): { start: Date; prevStart: Date } {
  const now = new Date()
  const start = new Date(now)
  if (period === 'today') {
    start.setHours(0, 0, 0, 0)
    const prevStart = new Date(start); prevStart.setDate(prevStart.getDate() - 1)
    return { start, prevStart }
  }
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
  start.setDate(start.getDate() - days); start.setHours(0, 0, 0, 0)
  const prevStart = new Date(start); prevStart.setDate(prevStart.getDate() - days)
  return { start, prevStart }
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>('today')
  const { products } = useProducts()
  const { transactions } = useTransactions()
  const { ingredients, lowStockIngredients } = useIngredients()
  const { usageEntries } = useIngredientUsage()

  // ── Period labels ─────────────────────────────────────────────────────
  const periodLabel    = period === 'today' ? 'Today' : period === '7d' ? '7-Day' : period === '30d' ? '30-Day' : '90-Day'
  const prevLabel      = period === 'today' ? 'yesterday' : period === '7d' ? 'prev 7d' : period === '30d' ? 'prev 30d' : 'prev 90d'

  // ── Ingredient usage (always today — for the usage table at the bottom) ──
  const todayUsage = useMemo(() => {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const map = new Map<string, { name: string; unit: string; total: number }>()
    usageEntries
      .filter(e => new Date(e.timestamp) >= todayStart)
      .forEach(e => {
        const cur = map.get(e.ingredient_id)
        if (cur) { cur.total += e.quantity_used }
        else { map.set(e.ingredient_id, { name: e.ingredient_name, unit: e.unit, total: e.quantity_used }) }
      })
    return Array.from(map.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.total - a.total)
  }, [usageEntries])

  // ── Ingredient cost for selected period ───────────────────────────────
  const ingredientCostPeriod = useMemo(() => {
    const { start } = getPeriodBounds(period)
    return usageEntries
      .filter(e => new Date(e.timestamp) >= start)
      .reduce((sum, e) => {
        const ing = ingredients.find(i => i.id === e.ingredient_id)
        if (!ing) return sum
        const qty = convertToStockUnit(e.quantity_used, e.unit, ing.unit)
        return sum + qty * ing.costPerUnit
      }, 0)
  }, [usageEntries, ingredients, period])

  // ── Filtered transactions (follows period) ────────────────────────────
  const filteredTx = useMemo(() => {
    const { start } = getPeriodBounds(period)
    return transactions
      .filter(tx => tx.status === 'completed' && new Date(tx.createdAt) >= start)
      .slice(0, 20)
  }, [transactions, period])

  const lowStockProducts   = products.filter(p => p.stock <= (p.minStock ?? 5) && p.stock > 0)
  const outOfStockProducts = products.filter(p => p.stock === 0)

  // ── KPIs — follow selected period ────────────────────────────────────
  const kpis = useMemo(() => {
    const { start, prevStart } = getPeriodBounds(period)
    const curTx = transactions.filter(
      tx => tx.status === 'completed' && new Date(tx.createdAt) >= start
    )
    const prevTx = transactions.filter(tx => {
      const d = new Date(tx.createdAt)
      return tx.status === 'completed' && d >= prevStart && d < start
    })
    const curRev  = curTx.reduce((s, tx) => s + tx.total, 0)
    const prevRev = prevTx.reduce((s, tx) => s + tx.total, 0)
    const curOrd  = curTx.length
    const prevOrd = prevTx.length
    const curAvg  = curOrd  > 0 ? curRev  / curOrd  : 0
    const prevAvg = prevOrd > 0 ? prevRev / prevOrd : 0
    const pct = (a: number, b: number) => b > 0 ? Math.round(((a - b) / b) * 100) : 0
    return {
      revenue: curRev,  revenueChange: pct(curRev,  prevRev),  prevRevenue: prevRev,
      orders:  curOrd,  ordersChange:  pct(curOrd,  prevOrd),  prevOrders:  prevOrd,
      avg:     curAvg,  avgChange:     pct(curAvg,  prevAvg),  prevAvg,
    }
  }, [transactions, period])

  // ── Revenue + Ingredient Cost chart data ─────────────────────────────
  const chartData = useMemo(() => {
    // Helper: ingredient cost for a given time window
    function costInWindow(start: Date, end: Date) {
      return usageEntries
        .filter(e => { const t = new Date(e.timestamp); return t >= start && t < end })
        .reduce((sum, e) => {
          const ing = ingredients.find(i => i.id === e.ingredient_id)
          if (!ing) return sum
          const qty = convertToStockUnit(e.quantity_used, e.unit, ing.unit)
          return sum + qty * ing.costPerUnit
        }, 0)
    }

    if (period === 'today') {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
      return Array.from({ length: 24 }, (_, hour) => {
        const hStart = new Date(todayStart); hStart.setHours(hour)
        const hEnd   = new Date(todayStart); hEnd.setHours(hour + 1)
        const rev = transactions
          .filter(tx => tx.status === 'completed')
          .filter(tx => { const t = new Date(tx.createdAt); return t >= hStart && t < hEnd })
          .reduce((s, tx) => s + tx.total, 0)
        const cost = Math.round(costInWindow(hStart, hEnd) * 100) / 100
        const label = hour === 0 ? '12am' : hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour - 12}pm`
        return { date: label, revenue: rev, cost }
      })
    }
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (days - 1 - i)); d.setHours(0, 0, 0, 0)
      const dayEnd = new Date(d); dayEnd.setDate(dayEnd.getDate() + 1)
      const rev = transactions
        .filter(tx => tx.status === 'completed')
        .filter(tx => { const t = new Date(tx.createdAt); return t >= d && t < dayEnd })
        .reduce((s, tx) => s + tx.total, 0)
      const cost = Math.round(costInWindow(d, dayEnd) * 100) / 100
      return { date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), revenue: rev, cost }
    })
  }, [transactions, period, usageEntries, ingredients])

  // ── Top products by revenue ───────────────────────────────────────────
  const topProducts = useMemo(() => {
    const map = new Map<string, { id: string; name: string; emoji: string; units: number; revenue: number }>()
    transactions.filter(tx => tx.status === 'completed').forEach(tx => {
      tx.items.forEach(item => {
        const cur = map.get(item.productId)
        if (cur) {
          cur.units   += item.quantity
          cur.revenue += item.total
        } else {
          const prod = products.find(p => p.id === item.productId)
          map.set(item.productId, {
            id: item.productId, name: item.productName,
            emoji: prod?.emoji ?? '📦', units: item.quantity, revenue: item.total,
          })
        }
      })
    })
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5)
  }, [transactions, products])

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
        <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4 mb-6">
          <StatCard
            title={`${periodLabel} Revenue`}
            value={formatCurrency(kpis.revenue)}
            change={kpis.revenueChange}
            changeLabel={`vs ${prevLabel} ${formatCurrency(kpis.prevRevenue)}`}
            icon={DollarSign}
            accent="indigo"
          />
          <StatCard
            title={`${periodLabel} Orders`}
            value={kpis.orders}
            change={kpis.ordersChange}
            changeLabel={`vs ${prevLabel} ${kpis.prevOrders} order${kpis.prevOrders !== 1 ? 's' : ''}`}
            icon={ShoppingCart}
            accent="emerald"
          />
          <StatCard
            title="Avg Order Value"
            value={formatCurrency(kpis.avg)}
            change={kpis.avgChange}
            changeLabel={`vs ${prevLabel} ${formatCurrency(kpis.prevAvg)}`}
            icon={Activity}
            accent="violet"
          />
          <StatCard
            title="Low Stock Items"
            value={lowStockProducts.length + outOfStockProducts.length}
            change={-2}
            changeLabel={`${outOfStockProducts.length} out of stock`}
            icon={Boxes}
            accent="amber"
          />
          <StatCard
            title="Low Ingredients"
            value={lowStockIngredients.filter(i => i.stock > 0).length}
            change={0}
            changeLabel={`${lowStockIngredients.filter(i => i.stock === 0).length} out of stock`}
            icon={FlaskConical}
            accent="violet"
          />
          <StatCard
            title="Out of Ingredients"
            value={lowStockIngredients.filter(i => i.stock === 0).length}
            change={0}
            changeLabel="Needs restocking"
            icon={FlaskConical}
            accent="rose"
          />
          <StatCard
            title={`Ingredient Cost ${periodLabel}`}
            value={formatCurrency(ingredientCostPeriod)}
            change={0}
            changeLabel={`Based on usage (${periodLabel.toLowerCase()})`}
            icon={DollarSign}
            accent="emerald"
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
          {/* Revenue Chart — 2/3 width */}
          <div className="xl:col-span-2 bg-white rounded-2xl border border-surface-100 shadow-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-surface-900">Revenue Overview</h3>
                <p className="text-sm text-surface-500 mt-0.5">
                  {period === 'today' ? 'Today\'s revenue · by hour' : `Daily revenue · last ${period === '7d' ? '7 days' : period === '30d' ? '30 days' : '90 days'}`}
                </p>
              </div>
              <div className="flex items-center gap-1 rounded-xl border border-surface-200 p-1">
                {(['today', '7d', '30d', '90d'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={cn(
                      'px-3 py-1 rounded-lg text-xs font-semibold transition-all',
                      period === p
                        ? 'bg-brand-gradient text-white shadow-sm'
                        : 'text-surface-500 hover:text-surface-700'
                    )}
                  >
                    {p === 'today' ? 'Today' : p}
                  </button>
                ))}
              </div>
            </div>
            {/* Legend */}
            <div className="flex items-center gap-4 mb-4">
              <span className="flex items-center gap-1.5 text-xs text-surface-500">
                <span className="inline-block w-3 h-[2.5px] rounded-full bg-indigo-500" />Revenue
              </span>
              <span className="flex items-center gap-1.5 text-xs text-surface-500">
                <span className="inline-block w-3 h-[2px] rounded-full bg-rose-400 opacity-80" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #F43F5E 0 5px, transparent 5px 8px)' }} />Ingredient Cost
              </span>
            </div>
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366F1" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F43F5E" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#F43F5E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                  interval={period === '90d' ? 9 : period === '30d' ? 4 : 'preserveStartEnd'}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => `₱${(v / 1000).toFixed(0)}k`}
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
                <Area
                  type="monotone"
                  dataKey="cost"
                  stroke="#F43F5E"
                  strokeWidth={2}
                  fill="url(#costGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#F43F5E', strokeWidth: 2, stroke: '#fff' }}
                  strokeDasharray="5 3"
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
              {topProducts.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-surface-400">
                  <Package className="h-8 w-8 opacity-30" />
                  <p className="text-sm">No sales data yet</p>
                </div>
              ) : (
                topProducts.map((p, idx) => (
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
                ))
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Recent Transactions — 2/3 */}
          <div className="xl:col-span-2 bg-white rounded-2xl border border-surface-100 shadow-card">
            {/* Header + period filter */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 gap-3 flex-wrap">
              <div>
                <h3 className="text-base font-semibold text-surface-900">Recent Transactions</h3>
                <p className="text-xs text-surface-500 mt-0.5">
                  {filteredTx.length} sale{filteredTx.length !== 1 ? 's' : ''} in selected period
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* Period toggle */}
                <div className="flex items-center gap-0.5 rounded-lg border border-surface-200 bg-surface-50 p-0.5">
                  {(['today', '7d', '30d', '90d'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setPeriod(p)}
                      className={cn(
                        'px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all',
                        period === p
                          ? 'bg-white text-brand-600 shadow-sm'
                          : 'text-surface-500 hover:text-surface-700'
                      )}
                    >
                      {p === 'today' ? 'Today' : p}
                    </button>
                  ))}
                </div>
                <Link
                  href="/dashboard/reports"
                  className="flex items-center gap-1 text-xs text-brand-600 font-semibold hover:underline whitespace-nowrap"
                >
                  View all <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </div>

            {/* Transaction rows */}
            <div className="divide-y divide-surface-50 max-h-[420px] overflow-y-auto">
              {filteredTx.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-surface-400">
                  <ShoppingCart className="h-8 w-8 opacity-30" />
                  <p className="text-sm">No transactions in this period</p>
                </div>
              ) : (
                filteredTx.map(order => {
                  const status  = statusConfig[order.status]  ?? statusConfig.completed
                  const payment = paymentConfig[order.paymentMethod] ?? paymentConfig.card
                  return (
                    <div key={order.id} className="px-6 py-4 hover:bg-surface-50/70 transition-colors">
                      {/* Top row: ID · time · status · payment · total */}
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-surface-900">{order.orderNumber}</p>
                            <Badge variant={status.variant} size="sm">{status.label}</Badge>
                          </div>
                          <p className="text-[11px] text-surface-400 flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3" />
                            {formatDateTime(order.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                          <span className="text-sm leading-none">{payment.icon}</span>
                          <span className="text-xs text-surface-500">{payment.label}</span>
                          <span className="text-sm font-bold text-surface-900 num-display">
                            {formatCurrency(order.total)}
                          </span>
                        </div>
                      </div>
                      {/* Items row */}
                      <p className="text-xs text-surface-500 leading-relaxed">
                        <span className="font-medium text-surface-400">Items: </span>
                        {order.items.map(i => `${i.productName} (${i.quantity})`).join(' · ')}
                      </p>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Right column — product alerts + ingredient alerts stacked */}
          <div className="flex flex-col gap-4">

            {/* Product Stock Alerts */}
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

            {/* Low Stock Ingredients */}
            <div className="bg-white rounded-2xl border border-surface-100 shadow-card">
              <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
                <h3 className="text-base font-semibold text-surface-900">Low Stock Ingredients</h3>
                {lowStockIngredients.length > 0 && (
                  <Badge variant="warning" dot>{lowStockIngredients.length}</Badge>
                )}
              </div>
              <div className="p-4 space-y-2 max-h-[240px] overflow-y-auto">
                {lowStockIngredients.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-8 text-center text-surface-400">
                    <FlaskConical className="h-8 w-8 opacity-30" />
                    <p className="text-sm">All ingredients are sufficiently stocked.</p>
                  </div>
                ) : (
                  lowStockIngredients.map(i => {
                    const isOut = i.stock === 0
                    return (
                      <div
                        key={i.id}
                        className={cn(
                          'flex items-center gap-3 rounded-xl px-3 py-2.5 border',
                          isOut
                            ? 'bg-rose-50 border-rose-100'
                            : 'bg-amber-50 border-amber-100'
                        )}
                      >
                        <span className="text-lg flex-shrink-0">{i.emoji ?? '🧪'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-surface-800 truncate">{i.name}</p>
                          <p className={cn('text-xs font-medium', isOut ? 'text-rose-600' : 'text-amber-600')}>
                            {isOut ? 'Out of stock' : `${i.stock} ${i.unit} remaining`}
                          </p>
                        </div>
                        {isOut
                          ? <Badge variant="danger"  size="sm">0</Badge>
                          : <Badge variant="warning" size="sm">{i.stock}</Badge>
                        }
                      </div>
                    )
                  })
                )}
              </div>
              <div className="px-4 pb-4">
                <Link
                  href="/dashboard/ingredients"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-surface-200 py-2.5 text-sm font-semibold text-surface-600 hover:bg-surface-50 hover:text-brand-600 hover:border-brand-200 transition-all"
                >
                  View Ingredients <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

          </div>
        </div>

        {/* Ingredient Usage Today */}
        <div className="bg-white rounded-2xl border border-surface-100 shadow-card">
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
            <div>
              <h3 className="text-base font-semibold text-surface-900">Ingredient Usage Today</h3>
              <p className="text-xs text-surface-500 mt-0.5">Aggregated from completed sales</p>
            </div>
            <Link
              href="/dashboard/reports"
              className="flex items-center gap-1 text-xs text-brand-600 font-semibold hover:underline"
            >
              Full report <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          {todayUsage.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-surface-400">
              <FlaskConical className="h-8 w-8 opacity-30" />
              <p className="text-sm">No ingredient usage recorded today</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-50 bg-surface-50/30">
                    <th className="px-6 py-2.5 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">Ingredient</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-surface-400 uppercase tracking-wider">Used Today</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">Unit</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-surface-400 uppercase tracking-wider">Est. Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-50">
                  {todayUsage.map(entry => {
                    const ing = ingredients.find(i => i.id === entry.id)
                    const qtyInStockUnit = ing ? convertToStockUnit(entry.total, entry.unit, ing.unit) : entry.total
                    const cost = qtyInStockUnit * (ing?.costPerUnit ?? 0)
                    return (
                      <tr key={entry.id} className="hover:bg-surface-50/50 transition-colors">
                        <td className="px-6 py-3 text-sm font-semibold text-surface-800">{entry.name}</td>
                        <td className="px-4 py-3 text-sm font-bold text-surface-900 text-right num-display">{entry.total}</td>
                        <td className="px-4 py-3 text-sm text-surface-500">{entry.unit}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-emerald-600 text-right num-display">
                          {cost > 0 ? formatCurrency(cost) : <span className="text-surface-300">—</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
