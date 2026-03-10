'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Trash2, ChefHat } from 'lucide-react'
import type { Product, Ingredient, RecipeItem } from '@/lib/types'
import { cn } from '@/lib/utils'

// ─── Unit compatibility map ───────────────────────────────────────────────────
// Defines which units are selectable based on the ingredient's stock unit.
// Only units within the same family are offered (no cross-family conversion).
const UNIT_OPTIONS: Record<string, string[]> = {
  kg:  ['kg', 'g'],
  g:   ['g', 'kg'],
  L:   ['L', 'ml'],
  ml:  ['ml', 'L'],
  // All others (pcs, loaf, pack, etc.) → single option only
}

function getUnitOptions(stockUnit: string): string[] {
  return UNIT_OPTIONS[stockUnit] ?? [stockUnit]
}

// ─── Local row state ──────────────────────────────────────────────────────────
interface RecipeRow {
  ingredientId: string
  quantity: string
  unit: string
}

interface RecipeModalProps {
  isOpen: boolean
  product: Product | null
  ingredients: Ingredient[]
  onClose: () => void
  onSave: (productId: string, recipe: RecipeItem[]) => void
}

export function RecipeModal({ isOpen, product, ingredients, onClose, onSave }: RecipeModalProps) {
  const [rows, setRows] = useState<RecipeRow[]>([])

  useEffect(() => {
    if (isOpen && product) {
      setRows(
        (product.recipe ?? []).map(r => {
          const ing = ingredients.find(i => i.id === r.ingredientId)
          return {
            ingredientId: r.ingredientId,
            quantity: String(r.quantityRequired),
            // Prefer saved unit; fall back to ingredient's stock unit
            unit: r.unit ?? ing?.unit ?? '',
          }
        })
      )
    }
  }, [isOpen, product])

  if (!isOpen || !product) return null

  const addRow = () => {
    const first = ingredients[0]
    if (!first) return
    setRows(prev => [...prev, { ingredientId: first.id, quantity: '1', unit: first.unit }])
  }

  const removeRow = (idx: number) => setRows(prev => prev.filter((_, i) => i !== idx))

  const updateRow = (idx: number, field: keyof RecipeRow, value: string) => {
    setRows(prev => prev.map((row, i) => {
      if (i !== idx) return row
      // When ingredient changes, reset unit to that ingredient's stock unit
      if (field === 'ingredientId') {
        const ing = ingredients.find(g => g.id === value)
        return { ...row, ingredientId: value, unit: ing?.unit ?? row.unit }
      }
      return { ...row, [field]: value }
    }))
  }

  const handleSave = () => {
    const recipe: RecipeItem[] = rows
      .filter(r => r.ingredientId && parseFloat(r.quantity) > 0)
      .map(r => ({
        ingredientId: r.ingredientId,
        quantityRequired: parseFloat(r.quantity),
        unit: r.unit || undefined,
      }))
    onSave(product.id, recipe)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full sm:max-w-lg bg-white sm:rounded-3xl rounded-t-3xl shadow-[0_30px_80px_rgba(0,0,0,0.25)] flex flex-col max-h-[90vh] animate-slide-up">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-xl flex-shrink-0">
              {product.emoji ?? '📦'}
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-surface-900">{product.name}</h2>
              <p className="text-xs text-surface-500 mt-0.5">Ingredients used per unit sold</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface-100 text-surface-500 hover:bg-surface-200 transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {rows.length > 0 && (
            <div className="grid grid-cols-[1fr_80px_76px_32px] gap-2 px-1 mb-1">
              <span className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider">Ingredient</span>
              <span className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider">Qty</span>
              <span className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider">Unit</span>
              <span />
            </div>
          )}

          {rows.map((row, idx) => {
            const ing = ingredients.find(i => i.id === row.ingredientId)
            const unitOpts = getUnitOptions(ing?.unit ?? row.unit)

            return (
              <div key={idx} className="grid grid-cols-[1fr_80px_76px_32px] gap-2 items-center">
                {/* Ingredient selector */}
                <select
                  value={row.ingredientId}
                  onChange={e => updateRow(idx, 'ingredientId', e.target.value)}
                  className="h-9 rounded-xl border border-surface-200 bg-white px-3 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all truncate"
                >
                  {ingredients.map(i => (
                    <option key={i.id} value={i.id}>
                      {i.emoji ? `${i.emoji} ` : ''}{i.name}
                    </option>
                  ))}
                </select>

                {/* Quantity */}
                <input
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={row.quantity}
                  onChange={e => updateRow(idx, 'quantity', e.target.value)}
                  className="h-9 rounded-xl border border-surface-200 bg-white px-2 text-sm text-center text-surface-900 num-display focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
                />

                {/* Unit — editable dropdown */}
                <select
                  value={row.unit}
                  onChange={e => updateRow(idx, 'unit', e.target.value)}
                  className="h-9 rounded-xl border border-surface-200 bg-white px-2 text-sm font-mono text-surface-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
                >
                  {unitOpts.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => removeRow(idx)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-surface-300 hover:bg-rose-50 hover:text-rose-500 transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          })}

          {rows.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-10 text-surface-400">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-100">
                <ChefHat className="h-7 w-7 opacity-60" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-surface-600">No recipe yet</p>
                <p className="text-xs text-surface-400 mt-0.5">
                  Add ingredients to define this product's recipe.
                  <br />Ingredient stock deducts automatically on every sale.
                </p>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={addRow}
            disabled={ingredients.length === 0}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-surface-200 py-2.5',
              'text-sm font-semibold text-surface-500',
              'hover:border-brand-300 hover:text-brand-600 hover:bg-brand-50/50 transition-all',
              'disabled:opacity-40 disabled:pointer-events-none'
            )}
          >
            <Plus className="h-4 w-4" /> Add Ingredient
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-surface-100 bg-surface-50/60 rounded-b-3xl flex-shrink-0">
          <div className="text-xs text-surface-400">
            {rows.length > 0
              ? `${rows.length} ingredient${rows.length > 1 ? 's' : ''} in recipe`
              : 'No ingredients — sales will not deduct stock'}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-xl border border-surface-200 bg-white px-5 text-sm font-semibold text-surface-700 hover:bg-surface-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="h-10 rounded-xl bg-brand-gradient px-6 text-sm font-bold text-white shadow-brand hover:brightness-110 transition-all active:scale-[0.98]"
            >
              Save Recipe
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
