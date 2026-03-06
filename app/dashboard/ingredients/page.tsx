'use client'

import { useState, useCallback } from 'react'
import { Plus, Search, FlaskConical, ArrowUpDown } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Badge } from '@/components/ui/badge'
import { IngredientModal } from '@/components/ingredients/ingredient-modal'
import { cn, formatCurrency } from '@/lib/utils'
import { useIngredients } from '@/lib/ingredients-context'
import { saveIngredientToSheets, logIngredientUsage } from '@/lib/sheets'
import type { Ingredient } from '@/lib/types'
import toast from 'react-hot-toast'

export default function IngredientsPage() {
  const { ingredients, setIngredients } = useIngredients()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null)
  const [restockQtys, setRestockQtys] = useState<Record<string, string>>({})

  const filtered = ingredients.filter(i =>
    !search.trim() || i.name.toLowerCase().includes(search.toLowerCase())
  )

  const totalValue   = ingredients.reduce((sum, i) => sum + i.costPerUnit * i.stock, 0)
  const lowStock     = ingredients.filter(i => i.stock > 0 && i.stock <= i.minStock)
  const outOfStock   = ingredients.filter(i => i.stock === 0)
  const healthyStock = ingredients.filter(i => i.stock > i.minStock)

  const stockPct = (stock: number, min: number) =>
    Math.min(100, Math.round((stock / Math.max(min * 4, 1)) * 100))

  const handleSave = useCallback((data: Omit<Ingredient, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    const now = new Date().toISOString()

    if (data.id) {
      // Edit
      const existing = ingredients.find(i => i.id === data.id)
      const updated: Ingredient = { ...(existing!), ...data, id: data.id, updatedAt: now }
      setIngredients(prev => prev.map(i => i.id === data.id ? updated : i))
      saveIngredientToSheets('updateIngredient', {
        id: updated.id, name: updated.name, unit: updated.unit,
        stock: updated.stock, min_stock: updated.minStock,
        cost_per_unit: updated.costPerUnit,
        created_at: updated.createdAt, updated_at: now,
      }).catch(console.error)
      if (existing && data.stock !== existing.stock) {
        logIngredientUsage({
          ingredient_id: updated.id, ingredient_name: updated.name,
          change_type: 'adjustment',
          quantity_before: existing.stock, quantity_after: updated.stock,
          note: 'Manual edit',
        }).catch(console.error)
      }
      toast.success(`${updated.name} updated`)
    } else {
      // Add
      const newIngredient: Ingredient = {
        id: `ing_${Date.now()}`,
        name: data.name, unit: data.unit, stock: data.stock,
        minStock: data.minStock, costPerUnit: data.costPerUnit,
        createdAt: now, updatedAt: now,
      }
      setIngredients(prev => [newIngredient, ...prev])
      saveIngredientToSheets('saveIngredient', {
        id: newIngredient.id, name: newIngredient.name, unit: newIngredient.unit,
        stock: newIngredient.stock, min_stock: newIngredient.minStock,
        cost_per_unit: newIngredient.costPerUnit,
        created_at: now, updated_at: now,
      }).catch(console.error)
      logIngredientUsage({
        ingredient_id: newIngredient.id, ingredient_name: newIngredient.name,
        change_type: 'initial_stock',
        quantity_before: 0, quantity_after: newIngredient.stock,
        note: 'Initial stock',
      }).catch(console.error)
      toast.success(`${newIngredient.name} added`)
    }

    setModalOpen(false)
    setEditingIngredient(null)
  }, [ingredients, setIngredients])

  const handleRestock = useCallback((ingredient: Ingredient) => {
    const raw = restockQtys[ingredient.id] ?? ''
    const qty = parseFloat(raw)
    if (!raw.trim() || isNaN(qty) || qty <= 0) {
      toast.error('Enter a valid restock quantity')
      return
    }
    const now = new Date().toISOString()
    const quantityAfter = ingredient.stock + qty
    setIngredients(prev => prev.map(i =>
      i.id === ingredient.id ? { ...i, stock: quantityAfter, updatedAt: now } : i
    ))
    setRestockQtys(prev => ({ ...prev, [ingredient.id]: '' }))
    saveIngredientToSheets('updateIngredient', {
      id: ingredient.id, name: ingredient.name, unit: ingredient.unit,
      stock: quantityAfter, min_stock: ingredient.minStock,
      cost_per_unit: ingredient.costPerUnit,
      created_at: ingredient.createdAt, updated_at: now,
    }).catch(console.error)
    logIngredientUsage({
      ingredient_id: ingredient.id, ingredient_name: ingredient.name,
      change_type: 'restock',
      quantity_before: ingredient.stock, quantity_after: quantityAfter,
      note: `Manual restock +${qty}`,
    }).catch(console.error)
    toast.success(`Restocked ${ingredient.name} — ${ingredient.stock} → ${quantityAfter} ${ingredient.unit}`)
  }, [restockQtys, setIngredients])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Ingredients"
        subtitle="Manage raw ingredients for recipe-based products"
        actions={
          <button
            onClick={() => { setEditingIngredient(null); setModalOpen(true) }}
            className="flex h-9 items-center gap-2 rounded-xl bg-brand-gradient px-4 text-sm font-semibold text-white shadow-brand hover:brightness-110 transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Ingredient
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Inventory Value', value: formatCurrency(totalValue), color: 'text-brand-600', bg: 'bg-brand-50', icon: '💰', sub: 'Total ingredient cost' },
            { label: 'Healthy Stock',   value: healthyStock.length,        color: 'text-emerald-600', bg: 'bg-emerald-50', icon: '✅', sub: 'Well-stocked' },
            { label: 'Low Stock',       value: lowStock.length,            color: 'text-amber-600',   bg: 'bg-amber-50',   icon: '⚠️', sub: 'Needs reorder' },
            { label: 'Out of Stock',    value: outOfStock.length,          color: 'text-rose-600',    bg: 'bg-rose-50',    icon: '🚫', sub: 'Immediate action' },
          ].map(({ label, value, color, bg, icon, sub }) => (
            <div key={label} className="bg-white rounded-2xl border border-surface-100 shadow-card p-5">
              <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl text-xl mb-3', bg)}>
                {icon}
              </div>
              <p className={cn('text-2xl font-black', color)}>{value}</p>
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
              placeholder="Search ingredients..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-xl border border-surface-200 bg-white text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
            />
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-surface-100 shadow-card p-16 text-center">
            <div className="flex flex-col items-center gap-3 text-surface-400">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-100">
                <FlaskConical className="h-7 w-7" />
              </div>
              <div>
                <p className="text-base font-semibold text-surface-600">
                  {search ? 'No ingredients found' : 'No ingredients yet'}
                </p>
                <p className="text-sm text-surface-400 mt-1">
                  {search ? 'Try a different search term' : 'Add ingredients to track stock and build product recipes'}
                </p>
              </div>
              {!search && (
                <button
                  onClick={() => { setEditingIngredient(null); setModalOpen(true) }}
                  className="mt-2 flex items-center gap-2 rounded-xl bg-brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-brand"
                >
                  <Plus className="h-4 w-4" /> Add First Ingredient
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-surface-100 shadow-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-100 bg-surface-50/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">Ingredient</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">Unit</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-surface-500 uppercase tracking-wider">
                    <button className="flex items-center gap-1 ml-auto hover:text-surface-700">
                      In Stock <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-surface-500 uppercase tracking-wider">Min Level</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">Stock Level</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-surface-500 uppercase tracking-wider">Cost/Unit</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-surface-500 uppercase tracking-wider">Restock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-50">
                {filtered.map(ingredient => {
                  const isOut  = ingredient.stock === 0
                  const isLow  = !isOut && ingredient.stock <= ingredient.minStock
                  const pct    = stockPct(ingredient.stock, ingredient.minStock)
                  const barColor = isOut ? 'bg-rose-400' : isLow ? 'bg-amber-400' : 'bg-emerald-500'
                  const restockVal = restockQtys[ingredient.id] ?? ''
                  return (
                    <tr
                      key={ingredient.id}
                      className="hover:bg-surface-50/50 transition-colors cursor-pointer"
                      onClick={() => { setEditingIngredient(ingredient); setModalOpen(true) }}
                    >
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                            <FlaskConical className="h-4 w-4" />
                          </div>
                          <p className="text-sm font-semibold text-surface-900">{ingredient.name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs font-mono text-surface-500 bg-surface-100 px-2 py-0.5 rounded-lg">{ingredient.unit}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className={cn(
                          'text-sm font-bold num-display',
                          isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-surface-800'
                        )}>
                          {ingredient.stock}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="text-sm text-surface-500 num-display">{ingredient.minStock}</span>
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
                          ₱{ingredient.costPerUnit.toFixed(2)}
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
                      <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <input
                            type="number" min="0.1" step="0.1"
                            placeholder="Qty"
                            value={restockVal}
                            onChange={e => setRestockQtys(prev => ({ ...prev, [ingredient.id]: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && handleRestock(ingredient)}
                            className="w-16 h-7 rounded-lg border border-surface-200 bg-surface-50 px-2 text-xs text-center text-surface-800 num-display focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
                          />
                          <button
                            onClick={() => handleRestock(ingredient)}
                            disabled={!restockVal.trim() || parseFloat(restockVal) <= 0}
                            className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600 hover:bg-emerald-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
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
        )}
      </div>

      <IngredientModal
        isOpen={modalOpen}
        ingredient={editingIngredient}
        onClose={() => { setModalOpen(false); setEditingIngredient(null) }}
        onSave={handleSave}
      />
    </div>
  )
}
