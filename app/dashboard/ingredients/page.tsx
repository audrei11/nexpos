'use client'

import { useState, useCallback } from 'react'
import { Plus, Search, FlaskConical, LayoutGrid, List } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Badge } from '@/components/ui/badge'
import { IngredientModal } from '@/components/ingredients/ingredient-modal'
import { cn, formatCurrency } from '@/lib/utils'
import { useIngredients } from '@/lib/ingredients-context'
import { useAuth } from '@/lib/auth-context'
import { saveIngredientToSheets, logIngredientUsage } from '@/lib/sheets'
import type { Ingredient } from '@/lib/types'
import toast from 'react-hot-toast'

// ─── Ingredient Card (grid view) ─────────────────────────────────────────
function IngredientCard({
  ingredient,
  onEdit,
  restockVal,
  onRestockChange,
  onRestock,
}: {
  ingredient: Ingredient
  onEdit: () => void
  restockVal: string
  onRestockChange: (val: string) => void
  onRestock: () => void
}) {
  const isOut  = ingredient.stock === 0
  const isLow  = !isOut && ingredient.stock <= ingredient.minStock
  const pct    = Math.min(100, Math.round((ingredient.stock / Math.max(ingredient.minStock * 4, 1)) * 100))
  const barColor = isOut ? 'bg-rose-400' : isLow ? 'bg-amber-400' : 'bg-emerald-500'

  return (
    <div className="bg-white rounded-2xl border border-surface-100 shadow-card flex flex-col overflow-hidden group/card">
      {/* Image / Emoji / Icon — clickable to edit */}
      <button
        type="button"
        onClick={onEdit}
        className="relative w-full aspect-square bg-emerald-50 hover:bg-emerald-100/70 transition-colors overflow-hidden"
      >
        {ingredient.imageUrl ? (
          <img
            src={ingredient.imageUrl}
            alt={ingredient.name}
            className="h-full w-full object-cover group-hover/card:scale-105 transition-transform duration-300"
            onError={e => {
              e.currentTarget.style.display = 'none'
              const span = document.createElement('span')
              span.className = 'absolute inset-0 flex items-center justify-center text-4xl'
              span.textContent = ingredient.emoji ?? '🧪'
              e.currentTarget.parentElement?.appendChild(span)
            }}
          />
        ) : ingredient.emoji ? (
          <span className="absolute inset-0 flex items-center justify-center text-4xl group-hover/card:scale-110 transition-transform duration-300">
            {ingredient.emoji}
          </span>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <FlaskConical className="h-10 w-10 text-emerald-300 group-hover/card:scale-110 transition-transform duration-300" />
          </div>
        )}

        {/* Status pill */}
        <span className={cn(
          'absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full text-white shadow-sm',
          isOut ? 'bg-rose-500' : isLow ? 'bg-amber-400' : 'bg-emerald-500'
        )}>
          {isOut ? 'Out' : isLow ? 'Low' : 'OK'}
        </span>
      </button>

      {/* Info + restock */}
      <div className="p-3 flex flex-col gap-2">
        <div>
          <button
            type="button"
            onClick={onEdit}
            className="text-left w-full"
          >
            <p className="text-sm font-bold text-surface-900 leading-tight line-clamp-2 hover:text-brand-600 transition-colors">
              {ingredient.name}
            </p>
          </button>
          <p className={cn(
            'text-xs font-semibold num-display mt-0.5',
            isOut ? 'text-rose-500' : isLow ? 'text-amber-500' : 'text-surface-400'
          )}>
            {ingredient.stock} {ingredient.unit}
          </p>
        </div>

        {/* Stock bar */}
        <div className="h-1 rounded-full bg-surface-100 overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500', barColor)}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Restock row */}
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <input
            type="number" min="0.1" step="0.1"
            placeholder="Qty"
            value={restockVal}
            onChange={e => onRestockChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onRestock()}
            className="flex-1 min-w-0 h-7 rounded-lg border border-surface-200 bg-surface-50 px-2 text-xs text-center text-surface-800 num-display focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
          />
          <button
            onClick={onRestock}
            disabled={!restockVal.trim() || parseFloat(restockVal) <= 0}
            className="flex items-center gap-0.5 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-600 hover:bg-emerald-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <Plus className="h-3 w-3" />+
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function IngredientsPage() {
  const { ingredients, setIngredients } = useIngredients()
  const { user } = useAuth()
  const canDelete = user?.role === 'admin' || user?.role === 'owner'
  const [search, setSearch]             = useState('')
  const [modalOpen, setModalOpen]       = useState(false)
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null)
  const [restockQtys, setRestockQtys]   = useState<Record<string, string>>({})
  const [viewMode, setViewMode]         = useState<'grid' | 'table'>('grid')

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
      // Duplicate name check (case-insensitive)
      const duplicate = ingredients.find(
        i => i.name.toLowerCase() === data.name.trim().toLowerCase()
      )
      if (duplicate) {
        toast.error('Ingredient already exists.')
        return
      }
      // Add
      const newIngredient: Ingredient = {
        id: crypto.randomUUID(),
        name: data.name, unit: data.unit, stock: data.stock,
        minStock: data.minStock, costPerUnit: data.costPerUnit,
        emoji: data.emoji, imageUrl: data.imageUrl,
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

  const handleDelete = useCallback((ingredient: Ingredient) => {
    setIngredients(prev => prev.filter(i => i.id !== ingredient.id))
    setModalOpen(false)
    setEditingIngredient(null)
    toast.success(`${ingredient.name} deleted`)
  }, [setIngredients])

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

  const openEdit = (ingredient: Ingredient) => {
    setEditingIngredient(ingredient)
    setModalOpen(true)
  }

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
            { label: 'Inventory Value', value: formatCurrency(totalValue), color: 'text-brand-600',   bg: 'bg-brand-50',   icon: '💰', sub: 'Total ingredient cost' },
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

        {/* Search + View Toggle */}
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

          {/* View mode toggle */}
          <div className="flex items-center rounded-xl border border-surface-200 bg-white p-1 gap-1">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-lg transition-all',
                viewMode === 'grid'
                  ? 'bg-brand-gradient text-white shadow-sm'
                  : 'text-surface-400 hover:text-surface-700 hover:bg-surface-50'
              )}
              title="Grid view"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-lg transition-all',
                viewMode === 'table'
                  ? 'bg-brand-gradient text-white shadow-sm'
                  : 'text-surface-400 hover:text-surface-700 hover:bg-surface-50'
              )}
              title="List view"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
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
        )}

        {/* ── Grid View ──────────────────────────────────────────────────── */}
        {filtered.length > 0 && viewMode === 'grid' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {filtered.map(ingredient => (
              <IngredientCard
                key={ingredient.id}
                ingredient={ingredient}
                onEdit={() => openEdit(ingredient)}
                restockVal={restockQtys[ingredient.id] ?? ''}
                onRestockChange={val => setRestockQtys(prev => ({ ...prev, [ingredient.id]: val }))}
                onRestock={() => handleRestock(ingredient)}
              />
            ))}
          </div>
        )}

        {/* ── Table View ─────────────────────────────────────────────────── */}
        {filtered.length > 0 && viewMode === 'table' && (
          <div className="bg-white rounded-2xl border border-surface-100 shadow-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-100 bg-surface-50/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">Ingredient</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">Unit</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-surface-500 uppercase tracking-wider">In Stock</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-surface-500 uppercase tracking-wider">Min Level</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">Stock Level</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-surface-500 uppercase tracking-wider">Cost/Unit</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-surface-500 uppercase tracking-wider">Restock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-50">
                {filtered.map(ingredient => {
                  const isOut    = ingredient.stock === 0
                  const isLow    = !isOut && ingredient.stock <= ingredient.minStock
                  const pct      = stockPct(ingredient.stock, ingredient.minStock)
                  const barColor = isOut ? 'bg-rose-400' : isLow ? 'bg-amber-400' : 'bg-emerald-500'
                  const restockVal = restockQtys[ingredient.id] ?? ''
                  return (
                    <tr
                      key={ingredient.id}
                      className="hover:bg-surface-50/50 transition-colors cursor-pointer"
                      onClick={() => openEdit(ingredient)}
                    >
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          {/* Image / emoji / icon */}
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50 overflow-hidden text-lg">
                            {ingredient.imageUrl ? (
                              <img
                                src={ingredient.imageUrl}
                                alt={ingredient.name}
                                className="h-full w-full object-cover"
                                onError={e => {
                                  e.currentTarget.style.display = 'none'
                                  const span = document.createElement('span')
                                  span.textContent = ingredient.emoji ?? '🧪'
                                  e.currentTarget.parentElement?.appendChild(span)
                                }}
                              />
                            ) : ingredient.emoji ? (
                              ingredient.emoji
                            ) : (
                              <FlaskConical className="h-4 w-4 text-emerald-600" />
                            )}
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
                          <Badge variant="danger"  size="sm" dot>Out of Stock</Badge>
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
        onDelete={canDelete && editingIngredient ? () => handleDelete(editingIngredient) : undefined}
      />
    </div>
  )
}
