'use client'

import { useState, useCallback } from 'react'
import {
  Search, ArrowUpDown, AlertTriangle,
  Package, TrendingDown, TrendingUp, Plus, Download
} from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Badge } from '@/components/ui/badge'
import { cn, formatCurrency } from '@/lib/utils'
import { useProducts } from '@/lib/products-context'
import { saveProductToSheets, logInventoryChange } from '@/lib/sheets'
import type { Product } from '@/lib/types'
import toast from 'react-hot-toast'

export default function InventoryPage() {
  const { products, setProducts } = useProducts()
  const [search, setSearch] = useState('')
  const [restockQtys, setRestockQtys] = useState<Record<string, string>>({})

  const filtered = products.filter(p =>
    !search.trim() || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())
  )

  const totalValue   = products.reduce((sum, p) => sum + p.price * p.stock, 0)
  const lowStock     = products.filter(p => p.stock > 0 && p.stock <= (p.minStock ?? 5))
  const outOfStock   = products.filter(p => p.stock === 0)
  const healthyStock = products.filter(p => p.stock > (p.minStock ?? 5))

  const stockPct = (stock: number, max: number) =>
    Math.min(100, Math.round((stock / Math.max(max, 1)) * 100))

  const handleRestock = useCallback((product: Product) => {
    const raw = restockQtys[product.id] ?? ''
    const qty = parseInt(raw, 10)

    if (!raw.trim() || isNaN(qty) || qty <= 0) {
      toast.error('Enter a valid restock quantity')
      return
    }

    const now = new Date().toISOString()
    const quantityBefore = product.stock
    const quantityAfter  = quantityBefore + qty

    // Update shared context
    setProducts(prev => prev.map(p =>
      p.id === product.id ? { ...p, stock: quantityAfter, updatedAt: now } : p
    ))

    // Clear this row's input
    setRestockQtys(prev => ({ ...prev, [product.id]: '' }))

    // Sync to Google Sheets
    saveProductToSheets('updateProduct', {
      id: product.id,
      name: product.name,
      sku: product.sku,
      category: product.category,
      price: product.price,
      cost: product.cost,
      stock: quantityAfter,
      min_stock: product.minStock,
      description: product.description,
      emoji: product.emoji,
      barcode: product.barcode,
      unit: product.unit,
      tax_rate: product.taxRate,
      is_active: product.isActive,
      created_at: product.createdAt ?? now,
      updated_at: now,
    }).catch(console.error)

    logInventoryChange({
      product_id: product.id,
      product_name: product.name,
      change_type: 'restock',
      quantity_before: quantityBefore,
      quantity_after: quantityAfter,
      note: `Manual restock +${qty}`,
    }).catch(console.error)

    toast.success(`Restocked ${product.name} — ${quantityBefore} → ${quantityAfter}`)
  }, [restockQtys, products, setProducts])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Inventory"
        subtitle="Track stock levels and manage reorders"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => toast.success('Export feature coming soon!')}
              className="flex h-9 items-center gap-2 rounded-xl border border-surface-200 bg-white px-3 text-sm text-surface-600 hover:bg-surface-50 transition-all"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {[
            {
              label: 'Total Value',
              value: formatCurrency(totalValue),
              icon: TrendingUp,
              color: 'text-brand-600',
              bg: 'bg-brand-50',
              sub: 'Retail inventory value',
            },
            {
              label: 'Healthy Stock',
              value: healthyStock.length,
              icon: Package,
              color: 'text-emerald-600',
              bg: 'bg-emerald-50',
              sub: 'Products well-stocked',
            },
            {
              label: 'Low Stock',
              value: lowStock.length,
              icon: AlertTriangle,
              color: 'text-amber-600',
              bg: 'bg-amber-50',
              sub: 'Needs reorder soon',
            },
            {
              label: 'Out of Stock',
              value: outOfStock.length,
              icon: TrendingDown,
              color: 'text-rose-600',
              bg: 'bg-rose-50',
              sub: 'Immediate action needed',
            },
          ].map(({ label, value, icon: Icon, color, bg, sub }) => (
            <div key={label} className="bg-white rounded-2xl border border-surface-100 shadow-card p-5">
              <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl mb-3', bg)}>
                <Icon className={cn('h-5 w-5', color)} />
              </div>
              <p className="text-2xl font-black text-surface-900">{value}</p>
              <p className="text-sm font-semibold text-surface-700 mt-0.5">{label}</p>
              <p className="text-xs text-surface-400 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
            <input
              type="text"
              placeholder="Search inventory..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-xl border border-surface-200 bg-white text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
            />
          </div>
        </div>

        {/* Inventory Table */}
        <div className="bg-white rounded-2xl border border-surface-100 shadow-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-100 bg-surface-50/50">
                <th className="px-6 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">Product</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">SKU</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-surface-500 uppercase tracking-wider">
                  <button className="flex items-center gap-1 ml-auto hover:text-surface-700">
                    In Stock <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-surface-500 uppercase tracking-wider">Min Level</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">Stock Level</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-surface-500 uppercase tracking-wider">Value</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-surface-500 uppercase tracking-wider">Restock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-50">
              {filtered.map(product => {
                const min = product.minStock ?? 5
                const max = min * 10
                const pct = stockPct(product.stock, max)
                const isOut  = product.stock === 0
                const isLow  = !isOut && product.stock <= min
                const barColor = isOut ? 'bg-rose-400' : isLow ? 'bg-amber-400' : 'bg-emerald-500'
                const restockVal = restockQtys[product.id] ?? ''
                return (
                  <tr key={product.id} className="hover:bg-surface-50/50 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-50 overflow-hidden text-xl">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                          ) : (
                            product.emoji
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-surface-900">{product.name}</p>
                          <p className="text-xs text-surface-400">{product.unit ?? 'unit'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs font-mono text-surface-500 bg-surface-100 px-2 py-0.5 rounded-lg">{product.sku}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className={cn(
                        'text-sm font-bold num-display',
                        isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-surface-800'
                      )}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-sm text-surface-500 num-display">{min}</span>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2 min-w-[100px]">
                        <div className="flex-1 h-1.5 rounded-full bg-surface-100 overflow-hidden">
                          <div
                            className={cn('h-full rounded-full transition-all duration-500', barColor)}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-surface-400 w-8 text-right num-display">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-sm font-semibold text-surface-700 num-display">
                        {formatCurrency(product.price * product.stock)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {isOut ? (
                        <Badge variant="danger" size="sm" dot>Out of Stock</Badge>
                      ) : isLow ? (
                        <Badge variant="warning" size="sm" dot>Low Stock</Badge>
                      ) : (
                        <Badge variant="success" size="sm" dot>In Stock</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <input
                          type="number"
                          min="1"
                          placeholder="Qty"
                          value={restockVal}
                          onChange={e => setRestockQtys(prev => ({ ...prev, [product.id]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && handleRestock(product)}
                          className="w-16 h-7 rounded-lg border border-surface-200 bg-surface-50 px-2 text-xs text-center text-surface-800 num-display focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
                        />
                        <button
                          onClick={() => handleRestock(product)}
                          disabled={!restockVal.trim() || parseInt(restockVal, 10) <= 0}
                          className="flex items-center gap-1 rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Plus className="h-3 w-3" /> Apply
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
