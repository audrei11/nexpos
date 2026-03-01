'use client'

import { useState, useMemo } from 'react'
import {
  Search, Plus, Filter, Package, MoreHorizontal,
  Pencil, Trash2, Eye, TrendingUp
} from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Badge } from '@/components/ui/badge'
import { cn, formatCurrency } from '@/lib/utils'
import { PRODUCTS, CATEGORIES } from '@/lib/mock-data'
import toast from 'react-hot-toast'

export default function ProductsPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [activeMenu, setActiveMenu] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let list = PRODUCTS
    if (category !== 'all') list = list.filter(p => p.category === category)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
    }
    return list
  }, [search, category])

  const stockStatus = (stock: number, min = 5) => {
    if (stock === 0) return { label: 'Out of Stock', variant: 'danger' as const }
    if (stock <= min) return { label: 'Low Stock', variant: 'warning' as const }
    return { label: 'In Stock', variant: 'success' as const }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Products"
        subtitle={`${PRODUCTS.length} products across ${CATEGORIES.length - 1} categories`}
        actions={
          <button
            onClick={() => toast.success('Add product modal coming soon!')}
            className="flex h-9 items-center gap-2 rounded-xl bg-brand-gradient px-4 text-sm font-semibold text-white shadow-brand hover:brightness-110 transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative flex-1 min-w-[240px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-xl border border-surface-200 bg-white text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={cn(
                  'flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-all',
                  category === cat.id
                    ? 'bg-brand-gradient text-white shadow-brand'
                    : 'bg-white border border-surface-200 text-surface-600 hover:border-brand-300 hover:text-brand-600'
                )}
              >
                <span>{cat.emoji}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>

          <button className="flex h-9 items-center gap-2 rounded-xl border border-surface-200 bg-white px-3 text-sm text-surface-600 hover:bg-surface-50 transition-all ml-auto">
            <Filter className="h-4 w-4" />
            Filters
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-surface-100 shadow-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-100 bg-surface-50/50">
                <th className="px-6 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">Product</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">SKU</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">Category</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-surface-500 uppercase tracking-wider">Price</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-surface-500 uppercase tracking-wider">Stock</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-surface-500 uppercase tracking-wider">Margin</th>
                <th className="px-2 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-50">
              {filtered.map(product => {
                const status = stockStatus(product.stock, product.minStock)
                const margin = product.cost
                  ? (((product.price - product.cost) / product.price) * 100).toFixed(0)
                  : null
                const cat = CATEGORIES.find(c => c.id === product.category)
                return (
                  <tr key={product.id} className="hover:bg-surface-50/50 transition-colors group">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-surface-50 text-xl group-hover:bg-brand-50 transition-colors">
                          {product.emoji}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-surface-900">{product.name}</p>
                          {product.description && (
                            <p className="text-xs text-surface-400 truncate max-w-[180px]">{product.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs font-mono text-surface-500 bg-surface-100 px-2 py-0.5 rounded-lg">{product.sku}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm text-surface-600">
                        {cat?.emoji} {cat?.name ?? product.category}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-sm font-bold text-surface-900 num-display">{formatCurrency(product.price)}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className={cn(
                        'text-sm font-bold num-display',
                        product.stock === 0 ? 'text-rose-600' : product.stock <= (product.minStock ?? 5) ? 'text-amber-600' : 'text-surface-700'
                      )}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant={status.variant} size="sm" dot>{status.label}</Badge>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {margin ? (
                        <div className="flex items-center justify-end gap-1">
                          <TrendingUp className="h-3 w-3 text-emerald-500" />
                          <span className="text-sm font-semibold text-emerald-600">{margin}%</span>
                        </div>
                      ) : (
                        <span className="text-surface-300">—</span>
                      )}
                    </td>
                    <td className="px-2 py-3.5">
                      <div className="relative">
                        <button
                          onClick={() => setActiveMenu(activeMenu === product.id ? null : product.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-surface-300 hover:bg-surface-100 hover:text-surface-600 transition-all"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        {activeMenu === product.id && (
                          <div className="absolute right-0 top-8 z-20 w-40 rounded-xl border border-surface-100 bg-white shadow-card-lg py-1 animate-scale-in">
                            {[
                              { icon: Eye,    label: 'View details' },
                              { icon: Pencil, label: 'Edit product' },
                              { icon: Trash2, label: 'Delete',       danger: true },
                            ].map(({ icon: Icon, label, danger }) => (
                              <button
                                key={label}
                                onClick={() => { setActiveMenu(null); toast.success(`${label} clicked`) }}
                                className={cn(
                                  'flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors',
                                  danger
                                    ? 'text-rose-500 hover:bg-rose-50'
                                    : 'text-surface-700 hover:bg-surface-50'
                                )}
                              >
                                <Icon className="h-3.5 w-3.5" />
                                {label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-16 text-surface-400">
              <Package className="h-10 w-10 opacity-30" />
              <p className="text-sm font-medium">No products found</p>
            </div>
          )}

          {/* Table footer */}
          <div className="flex items-center justify-between px-6 py-3 border-t border-surface-100 bg-surface-50/30">
            <p className="text-xs text-surface-500">
              Showing <span className="font-semibold text-surface-700">{filtered.length}</span> of{' '}
              <span className="font-semibold text-surface-700">{PRODUCTS.length}</span> products
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
