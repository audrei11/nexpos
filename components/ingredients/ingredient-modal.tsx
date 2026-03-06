'use client'

import { useState, useEffect } from 'react'
import { X, FlaskConical } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Ingredient } from '@/lib/types'

const UNITS = ['g', 'kg', 'ml', 'L', 'pcs', 'tsp', 'tbsp', 'cup', 'oz', 'lb']

type FormState = {
  name: string
  unit: string
  stock: string
  minStock: string
  costPerUnit: string
}

const EMPTY_FORM: FormState = {
  name: '', unit: 'g', stock: '0', minStock: '10', costPerUnit: '0',
}

interface IngredientModalProps {
  isOpen: boolean
  ingredient?: Ingredient | null
  onClose: () => void
  onSave: (data: Omit<Ingredient, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => void
}

export function IngredientModal({ isOpen, ingredient, onClose, onSave }: IngredientModalProps) {
  const isEdit = !!ingredient
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})

  useEffect(() => {
    if (isOpen) {
      setErrors({})
      if (ingredient) {
        setForm({
          name: ingredient.name,
          unit: ingredient.unit,
          stock: String(ingredient.stock),
          minStock: String(ingredient.minStock),
          costPerUnit: String(ingredient.costPerUnit),
        })
      } else {
        setForm(EMPTY_FORM)
      }
    }
  }, [isOpen, ingredient])

  const set = (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm(prev => ({ ...prev, [field]: e.target.value }))
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }

  const validate = (): boolean => {
    const e: typeof errors = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (form.stock === '' || isNaN(+form.stock) || +form.stock < 0) e.stock = 'Valid stock required'
    if (form.minStock === '' || isNaN(+form.minStock)) e.minStock = 'Valid min stock required'
    if (form.costPerUnit === '' || isNaN(+form.costPerUnit) || +form.costPerUnit < 0) e.costPerUnit = 'Valid cost required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    onSave({
      ...(ingredient?.id ? { id: ingredient.id } : {}),
      name: form.name.trim(),
      unit: form.unit,
      stock: +form.stock,
      minStock: +form.minStock,
      costPerUnit: +form.costPerUnit,
    })
  }

  if (!isOpen) return null

  const inputCls = (err?: string) => cn(
    'w-full h-10 rounded-xl border bg-white px-3.5 text-sm text-surface-900 placeholder:text-surface-400',
    'transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400',
    err ? 'border-rose-400' : 'border-surface-200'
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full sm:max-w-md bg-white sm:rounded-3xl rounded-t-3xl shadow-[0_-8px_40px_rgba(0,0,0,0.2)] sm:shadow-[0_30px_80px_rgba(0,0,0,0.25)] flex flex-col animate-slide-up">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50">
              <FlaskConical className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-surface-900">
                {isEdit ? 'Edit Ingredient' : 'Add Ingredient'}
              </h2>
              <p className="text-xs text-surface-500 mt-0.5">
                {isEdit ? 'Update ingredient details' : 'Add a new ingredient to your inventory'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface-100 text-surface-500 hover:bg-surface-200 transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form id="ingredient-form" onSubmit={handleSubmit} className="px-5 py-4 space-y-4">

          {/* Name */}
          <div>
            <label className="text-sm font-semibold text-surface-700 mb-1.5 block">
              Ingredient Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={set('name')}
              placeholder="e.g. Espresso, Milk, Sugar"
              autoFocus
              className={inputCls(errors.name)}
            />
            {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name}</p>}
          </div>

          {/* Unit */}
          <div>
            <label className="text-sm font-semibold text-surface-700 mb-1.5 block">Unit of Measure</label>
            <div className="grid grid-cols-5 gap-2">
              {UNITS.map(u => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, unit: u }))}
                  className={cn(
                    'h-9 rounded-xl border text-sm font-semibold transition-all',
                    form.unit === u
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                      : 'border-surface-200 bg-white text-surface-600 hover:border-emerald-200 hover:bg-surface-50'
                  )}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          {/* Stock + Min Stock */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-surface-700 mb-1.5 block">
                Current Stock <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number" value={form.stock} onChange={set('stock')}
                  placeholder="0" min="0" step="0.1"
                  className={inputCls(errors.stock)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-surface-400">{form.unit}</span>
              </div>
              {errors.stock && <p className="text-xs text-rose-500 mt-1">{errors.stock}</p>}
            </div>
            <div>
              <label className="text-sm font-semibold text-surface-700 mb-1.5 block">Low Stock Alert</label>
              <div className="relative">
                <input
                  type="number" value={form.minStock} onChange={set('minStock')}
                  placeholder="10" min="0" step="1"
                  className={inputCls(errors.minStock)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-surface-400">{form.unit}</span>
              </div>
            </div>
          </div>

          {/* Cost per unit */}
          <div className="w-1/2">
            <label className="text-sm font-semibold text-surface-700 mb-1.5 block">
              Cost per {form.unit}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-surface-400">₱</span>
              <input
                type="number" value={form.costPerUnit} onChange={set('costPerUnit')}
                placeholder="0.00" min="0" step="0.01"
                className={cn(inputCls(errors.costPerUnit), 'pl-7')}
              />
            </div>
            {errors.costPerUnit && <p className="text-xs text-rose-500 mt-1">{errors.costPerUnit}</p>}
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-surface-100 bg-surface-50/60 rounded-b-3xl">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl border border-surface-200 bg-white px-5 text-sm font-semibold text-surface-700 hover:bg-surface-50 transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="ingredient-form"
            className="h-10 rounded-xl bg-emerald-500 px-6 text-sm font-bold text-white shadow-sm hover:bg-emerald-600 transition-all active:scale-[0.98]"
          >
            {isEdit ? 'Save Changes' : 'Add Ingredient'}
          </button>
        </div>
      </div>
    </div>
  )
}
