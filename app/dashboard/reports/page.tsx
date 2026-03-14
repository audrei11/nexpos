'use client'

import { useState, useMemo } from 'react'
import {
  BarChart3, TrendingUp, Download,
  DollarSign, ShoppingCart,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { Header } from '@/components/layout/header'
import { cn, formatCurrency, formatDateTime, guessIngredientEmoji } from '@/lib/utils'
import { CATEGORIES } from '@/lib/mock-data'
import { useTransactions } from '@/lib/transactions-context'
import { useProducts } from '@/lib/products-context'
import { useIngredientUsage } from '@/lib/ingredient-usage-context'
import { useIngredients } from '@/lib/ingredients-context'
import toast from 'react-hot-toast'

// Category colour palette (keyed by category id)
const CAT_COLORS: Record<string, string> = {
  electronics: '#6366F1',
  clothing:    '#8B5CF6',
  food:        '#10B981',
  beverages:   '#F59E0B',
  accessories: '#F43F5E',
  home:        '#3B82F6',
}

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
          {p.name === 'revenue' ? formatCurrency(p.value) : p.value}
        </p>
      ))}
    </div>
  )
}

type Period = 'today' | '7d' | '30d' | '90d'

function getPeriodStart(period: Period): Date {
  const d = new Date()
  if (period === 'today') {
    d.setHours(0, 0, 0, 0)
  } else {
    const offset = period === '7d' ? 6 : period === '30d' ? 29 : 89
    d.setDate(d.getDate() - offset)
    d.setHours(0, 0, 0, 0)
  }
  return d
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>('7d')
  const { transactions } = useTransactions()
  const { products } = useProducts()
  const { usageEntries } = useIngredientUsage()
  const { ingredients } = useIngredients()

  // ── Ingredient usage — follows selected period ───────────────────────────
  const ingUsageFiltered = useMemo(() => {
    const start = getPeriodStart(period)
    return usageEntries.filter(e => new Date(e.timestamp) >= start)
  }, [usageEntries, period])

  // A. Top Used Ingredients — bar chart (aggregate by ingredient, selected period)
  const topUsedIngredients = useMemo(() => {
    const map = new Map<string, { name: string; total: number; unit: string }>()
    ingUsageFiltered.forEach(e => {
      const cur = map.get(e.ingredient_id)
      if (cur) { cur.total += e.quantity_used }
      else { map.set(e.ingredient_id, { name: e.ingredient_name, total: e.quantity_used, unit: e.unit }) }
    })
    return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 8)
  }, [ingUsageFiltered])

  // B. Ingredient Usage Trend — line chart (per top-3 ingredients, selected period)
  const ingTrendData = useMemo(() => {
    const top3 = topUsedIngredients.slice(0, 3).map(i => i.name)

    if (period === 'today') {
      // Hourly buckets (business hours 7–21)
      const slots = Array.from({ length: 15 }, (_, i) => `${i + 7}:00`)
      const buckets: Record<string, Record<string, number>> = {}
      slots.forEach(s => { buckets[s] = {} })
      ingUsageFiltered.forEach(e => {
        if (!top3.includes(e.ingredient_name)) return
        const key = `${new Date(e.timestamp).getHours()}:00`
        if (!buckets[key]) return
        buckets[key][e.ingredient_name] = (buckets[key][e.ingredient_name] ?? 0) + e.quantity_used
      })
      return slots.map(s => ({ date: s, ...buckets[s] }))
    }

    if (period === '90d') {
      // Weekly buckets — 13 weeks
      const weeks = Array.from({ length: 13 }, (_, w) => {
        const d = new Date(); d.setDate(d.getDate() - (12 - w) * 7); d.setHours(0, 0, 0, 0)
        return { label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), start: new Date(d) }
      })
      const result = weeks.map(({ label, start }) => {
        const entry: Record<string, number> = { date: label as unknown as number }
        const end = new Date(start); end.setDate(end.getDate() + 7)
        ingUsageFiltered.forEach(e => {
          if (!top3.includes(e.ingredient_name)) return
          const t = new Date(e.timestamp)
          if (t >= start && t < end) {
            entry[e.ingredient_name] = ((entry[e.ingredient_name] as number) ?? 0) + e.quantity_used
          }
        })
        return entry
      })
      return result as Array<{ date: string } & Record<string, number>>
    }

    // Daily buckets (7d or 30d)
    const days = period === '7d' ? 7 : 30
    const labels = Array.from({ length: days }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (days - 1 - i))
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    })
    const buckets: Record<string, Record<string, number>> = {}
    labels.forEach(l => { buckets[l] = {} })
    ingUsageFiltered.forEach(e => {
      if (!top3.includes(e.ingredient_name)) return
      const day = new Date(e.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      if (!buckets[day]) return
      buckets[day][e.ingredient_name] = (buckets[day][e.ingredient_name] ?? 0) + e.quantity_used
    })
    return labels.map(day => ({ date: day, ...buckets[day] }))
  }, [ingUsageFiltered, topUsedIngredients, period])

  const ingTrendLines = useMemo(() => topUsedIngredients.slice(0, 3).map((ing, i) => ({
    name: ing.name,
    color: ['#6366F1', '#10B981', '#F59E0B'][i],
  })), [topUsedIngredients])

  // Only completed orders within the selected period
  const filteredTx = useMemo(() => {
    const start = getPeriodStart(period)
    return transactions.filter(
      tx => tx.status === 'completed' && new Date(tx.createdAt) >= start
    )
  }, [transactions, period])

  // ── KPI metrics ─────────────────────────────────────────────────────────
  const totalRevenue = filteredTx.reduce((s, tx) => s + tx.total, 0)
  const totalOrders  = filteredTx.length
  const avgOrder     = totalOrders > 0 ? totalRevenue / totalOrders : 0

  // ── Revenue trend chart ─────────────────────────────────────────────────
  const revenueTrend = useMemo(() => {
    if (period === 'today') {
      // Hourly buckets for business hours 7–21
      const hours: Record<number, { revenue: number; orders: number }> = {}
      for (let h = 7; h <= 21; h++) hours[h] = { revenue: 0, orders: 0 }
      filteredTx.forEach(tx => {
        const h = new Date(tx.createdAt).getHours()
        if (hours[h]) {
          hours[h].revenue += tx.total
          hours[h].orders  += 1
        }
      })
      return Object.entries(hours).map(([h, data]) => ({
        date: `${h}:00`,
        ...data,
      }))
    }

    // Daily buckets
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
    const map: Record<string, { revenue: number; orders: number }> = {}
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      map[key] = { revenue: 0, orders: 0 }
    }
    filteredTx.forEach(tx => {
      const key = new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      if (map[key]) {
        map[key].revenue += tx.total
        map[key].orders  += 1
      }
    })
    return Object.entries(map).map(([date, data]) => ({ date, ...data }))
  }, [filteredTx, period])

  // ── Category breakdown ──────────────────────────────────────────────────
  const categoryData = useMemo(() => {
    const catMap: Record<string, { revenue: number; color: string }> = {}
    filteredTx.forEach(tx => {
      tx.items.forEach(item => {
        const product = products.find(p => p.id === item.productId)
        const catId   = product?.category ?? 'other'
        const catName = CATEGORIES.find(c => c.id === catId)?.name ?? catId
        if (!catMap[catName]) {
          catMap[catName] = { revenue: 0, color: CAT_COLORS[catId] ?? '#94A3B8' }
        }
        catMap[catName].revenue += item.total
      })
    })
    return Object.entries(catMap)
      .map(([name, { revenue, color }]) => ({ name, value: revenue, color }))
      .sort((a, b) => b.value - a.value)
  }, [filteredTx, products])

  const topCategoryName = categoryData[0]?.name ?? '—'

  // ── Best sellers ────────────────────────────────────────────────────────
  const bestSellers = useMemo(() => {
    const map: Record<string, { name: string; emoji: string; revenue: number; units: number }> = {}
    filteredTx.forEach(tx => {
      tx.items.forEach(item => {
        const product = products.find(p => p.id === item.productId)
        if (!map[item.productId]) {
          map[item.productId] = {
            name: item.productName,
            emoji: product?.emoji ?? '📦',
            revenue: 0,
            units: 0,
          }
        }
        map[item.productId].revenue += item.total
        map[item.productId].units   += item.quantity
      })
    })
    return Object.values(map)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
  }, [filteredTx, products])

  // ── Product Sales breakdown ──────────────────────────────────────────────
  const productSales = useMemo(() => {
    const map: Record<string, { name: string; emoji: string; qty: number; revenue: number }> = {}
    filteredTx.forEach(tx => {
      tx.items.forEach(item => {
        const product = products.find(p => p.id === item.productId)
        if (!map[item.productId]) {
          map[item.productId] = { name: item.productName, emoji: product?.emoji ?? '📦', qty: 0, revenue: 0 }
        }
        map[item.productId].qty     += item.quantity
        map[item.productId].revenue += item.total
      })
    })
    return Object.values(map).sort((a, b) => b.qty - a.qty)
  }, [filteredTx, products])

  // ── Ingredient consumption (from sales only — entries that have a product_id) ──
  const ingredientConsumption = useMemo(() => {
    const map: Record<string, { name: string; emoji: string; total: number; unit: string }> = {}
    ingUsageFiltered
      .filter(e => e.product_id)
      .forEach(e => {
        if (!map[e.ingredient_id]) {
          const ing = ingredients.find(i => i.id === e.ingredient_id)
          map[e.ingredient_id] = {
            name:  e.ingredient_name,
            emoji: ing?.emoji || guessIngredientEmoji(e.ingredient_name),
            total: 0,
            unit:  e.unit,
          }
        }
        map[e.ingredient_id].total += e.quantity_used
      })
    return Object.values(map).sort((a, b) => b.total - a.total)
  }, [ingUsageFiltered, ingredients])

  const hasData = filteredTx.length > 0

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
            { label: 'Total Revenue',   value: formatCurrency(totalRevenue), icon: DollarSign,   color: 'text-brand-600',   bg: 'bg-brand-50' },
            { label: 'Total Orders',    value: totalOrders,                  icon: ShoppingCart, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Avg Order Value', value: formatCurrency(avgOrder),     icon: BarChart3,    color: 'text-violet-600',  bg: 'bg-violet-50' },
            { label: 'Top Category',    value: topCategoryName,              icon: TrendingUp,   color: 'text-amber-600',   bg: 'bg-amber-50' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-2xl border border-surface-100 shadow-card p-5">
              <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl mb-4', bg)}>
                <Icon className={cn('h-5 w-5', color)} />
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
            <p className="text-sm text-surface-500 mb-5">
              {period === 'today' ? 'Hourly revenue today' : `Daily revenue — last ${period}`}
            </p>
            {!hasData ? (
              <div className="flex items-center justify-center h-[220px] text-surface-400 text-sm">
                No sales in this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={revenueTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366F1" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={v => `₱${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#6366F1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                  <Area type="monotone" dataKey="revenue" stroke="#6366F1" strokeWidth={2.5} fill="url(#revGrad)" dot={false} activeDot={{ r: 5, fill: '#6366F1', stroke: '#fff', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Category breakdown */}
          <div className="bg-white rounded-2xl border border-surface-100 shadow-card p-6">
            <h3 className="text-base font-semibold text-surface-900 mb-1">By Category</h3>
            <p className="text-sm text-surface-500 mb-4">Revenue distribution</p>
            {!hasData ? (
              <div className="flex items-center justify-center h-[140px] text-surface-400 text-sm">
                No data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={42} outerRadius={62} dataKey="value" strokeWidth={2} stroke="#fff">
                    {categoryData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="mt-2 space-y-2">
              {categoryData.map(cat => (
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
          {/* Orders volume bar chart */}
          <div className="bg-white rounded-2xl border border-surface-100 shadow-card p-6">
            <h3 className="text-base font-semibold text-surface-900 mb-1">Orders Volume</h3>
            <p className="text-sm text-surface-500 mb-5">
              {period === 'today' ? 'Hourly order count today' : `Daily order count — last ${period}`}
            </p>
            {!hasData ? (
              <div className="flex items-center justify-center h-[180px] text-surface-400 text-sm">
                No orders in this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={revenueTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.05)' }} />
                  <Bar dataKey="orders" fill="#6366F1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Best sellers */}
          <div className="bg-white rounded-2xl border border-surface-100 shadow-card p-6">
            <h3 className="text-base font-semibold text-surface-900 mb-1">Best Sellers</h3>
            <p className="text-sm text-surface-500 mb-5">Top products by revenue</p>
            {bestSellers.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-surface-400 text-sm">
                No sales in this period
              </div>
            ) : (
              <div className="space-y-3">
                {bestSellers.map((p, idx) => {
                  const pct = (p.revenue / bestSellers[0].revenue) * 100
                  return (
                    <div key={p.name} className="flex items-center gap-3">
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
            )}
          </div>
        </div>

        {/* Transaction history */}
        <div className="bg-white rounded-2xl border border-surface-100 shadow-card">
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
            <div>
              <h3 className="text-base font-semibold text-surface-900">Transaction History</h3>
              <p className="text-xs text-surface-500 mt-0.5">
                {filteredTx.length} sale{filteredTx.length !== 1 ? 's' : ''} in selected period
              </p>
            </div>
            <button
              onClick={() => toast.success('Exporting transactions...')}
              className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:underline"
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </button>
          </div>
          {filteredTx.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-surface-400 text-sm">
              No transactions in this period
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-50 bg-surface-50/30">
                    <th className="px-6 py-2.5 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">Order #</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">Date / Time</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">Customer</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">Items</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">Payment</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-surface-400 uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-50">
                  {filteredTx.map(order => (
                    <tr key={order.id} className="hover:bg-surface-50/50 transition-colors">
                      <td className="px-6 py-3 text-sm font-semibold text-surface-900">{order.orderNumber}</td>
                      <td className="px-4 py-3 text-xs text-surface-500">{formatDateTime(order.createdAt)}</td>
                      <td className="px-4 py-3 text-sm text-surface-600">{order.customerName ?? 'Walk-in'}</td>
                      <td className="px-4 py-3 text-sm text-surface-500">{order.items.length}</td>
                      <td className="px-4 py-3 text-sm text-surface-600 capitalize">{order.paymentMethod}</td>
                      <td className="px-4 py-3 text-sm font-bold text-surface-900 text-right num-display">{formatCurrency(order.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Product Sales + Ingredient Consumption ──────────────────── */}
        <div>
          <h3 className="text-base font-semibold text-surface-900 mb-4">
            Products Sold &amp; Ingredients Used — {period === 'today' ? 'Today' : period === '7d' ? 'Last 7 Days' : period === '30d' ? 'Last 30 Days' : 'Last 90 Days'}
          </h3>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

            {/* Products Sold */}
            <div className="bg-white rounded-2xl border border-surface-100 shadow-card p-6">
              <div className="flex items-center gap-2 mb-1">
                <ShoppingCart className="h-4 w-4 text-brand-500" />
                <h4 className="text-sm font-semibold text-surface-900">Products Sold</h4>
              </div>
              <p className="text-xs text-surface-500 mb-5">Units sold per product in this period</p>
              {productSales.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-surface-400 text-sm">
                  No sales in this period
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {productSales.map((p, idx) => {
                    const pct = Math.round((p.qty / productSales[0].qty) * 100)
                    return (
                      <div key={p.name} className="flex items-center gap-3 group">
                        <span className="text-xs font-bold text-surface-300 w-4 flex-shrink-0">{idx + 1}</span>
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-surface-50 text-lg">
                          {p.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs font-semibold text-surface-800 truncate">{p.name}</p>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                              <span className="text-xs font-bold text-brand-600 num-display">{p.qty}x</span>
                              <span className="text-xs text-surface-400 num-display">{formatCurrency(p.revenue)}</span>
                            </div>
                          </div>
                          <div className="h-1.5 rounded-full bg-surface-100 overflow-hidden">
                            <div className="h-full rounded-full bg-brand-gradient transition-all duration-500" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              {productSales.length > 0 && (
                <div className="mt-4 pt-3 border-t border-surface-100 flex items-center justify-between">
                  <span className="text-xs text-surface-500">Total units sold</span>
                  <span className="text-sm font-black text-surface-900 num-display">
                    {productSales.reduce((s, p) => s + p.qty, 0)}
                  </span>
                </div>
              )}
            </div>

            {/* Ingredients Consumed */}
            <div className="bg-white rounded-2xl border border-surface-100 shadow-card p-6">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                <h4 className="text-sm font-semibold text-surface-900">Ingredients Consumed</h4>
              </div>
              <p className="text-xs text-surface-500 mb-5">Total ingredients used from all sales</p>
              {ingredientConsumption.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 gap-2 text-surface-400 text-sm text-center">
                  <span>No ingredient usage recorded</span>
                  <span className="text-xs text-surface-300">Set up recipes on your products to track this</span>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {ingredientConsumption.map((ing, idx) => {
                    const pct = Math.round((ing.total / ingredientConsumption[0].total) * 100)
                    return (
                      <div key={ing.name} className="flex items-center gap-3">
                        <span className="text-xs font-bold text-surface-300 w-4 flex-shrink-0">{idx + 1}</span>
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-lg">
                          {ing.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs font-semibold text-surface-800 truncate">{ing.name}</p>
                            <span className="text-xs font-bold text-emerald-600 num-display flex-shrink-0 ml-2">
                              {ing.total % 1 === 0 ? ing.total : ing.total.toFixed(2)} {ing.unit}
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-surface-100 overflow-hidden">
                            <div className="h-full rounded-full bg-emerald-400 transition-all duration-500" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              {ingredientConsumption.length > 0 && (
                <div className="mt-4 pt-3 border-t border-surface-100 flex items-center justify-between">
                  <span className="text-xs text-surface-500">Unique ingredients used</span>
                  <span className="text-sm font-black text-surface-900 num-display">
                    {ingredientConsumption.length}
                  </span>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ── Ingredient Usage ────────────────────────────────────────── */}
        <div>
          <h3 className="text-base font-semibold text-surface-900 mb-4">
            Ingredient Usage — {period === 'today' ? 'Today' : period === '7d' ? 'Last 7 Days' : period === '30d' ? 'Last 30 Days' : 'Last 90 Days'}
          </h3>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

            {/* A. Top Used Ingredients — bar chart */}
            <div className="bg-white rounded-2xl border border-surface-100 shadow-card p-6">
              <h4 className="text-sm font-semibold text-surface-900 mb-1">Top Used Ingredients</h4>
              <p className="text-xs text-surface-500 mb-5">Total quantity consumed per ingredient</p>
              {topUsedIngredients.length === 0 ? (
                <div className="flex items-center justify-center h-[200px] text-surface-400 text-sm">
                  No ingredient usage recorded in this period
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={topUsedIngredients} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} width={110} />
                    <Tooltip
                      formatter={(v: number, _: string, props: { payload?: { unit?: string } }) =>
                        [`${v} ${props.payload?.unit ?? ''}`, 'Used']
                      }
                      contentStyle={{ background: '#0F172A', border: 'none', borderRadius: 10, color: '#fff', fontSize: 12 }}
                    />
                    <Bar dataKey="total" fill="#6366F1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* B. Ingredient Usage Trend — line chart (top 3) */}
            <div className="bg-white rounded-2xl border border-surface-100 shadow-card p-6">
              <h4 className="text-sm font-semibold text-surface-900 mb-1">Usage Trend</h4>
              <p className="text-xs text-surface-500 mb-5">
                {period === 'today' ? 'Hourly' : period === '90d' ? 'Weekly' : 'Daily'} usage for top 3 ingredients
              </p>
              {ingTrendLines.length === 0 ? (
                <div className="flex items-center justify-center h-[200px] text-surface-400 text-sm">
                  No usage trend data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={ingTrendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#0F172A', border: 'none', borderRadius: 10, color: '#fff', fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                    {ingTrendLines.map(line => (
                      <Line
                        key={line.name}
                        type="monotone"
                        dataKey={line.name}
                        stroke={line.color}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}
