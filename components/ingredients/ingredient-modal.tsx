'use client'

import { useState, useEffect, useRef } from 'react'
import { X, ImagePlus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Ingredient } from '@/lib/types'
import toast from 'react-hot-toast'

const UNITS = ['g', 'kg', 'ml', 'L', 'pcs', 'tsp', 'tbsp', 'cup', 'oz', 'lb']

// Café / food-focused emoji presets for quick identification
const INGREDIENT_EMOJIS = [
  '🥛','☕','🫖','🍵','🧃','🧋','🥤','🍺','🍷','🫗',
  '🌾','🍚','🧂','🍬','🍫','🫙','🧈','🥚','🍳','🧁',
  '🍊','🍋','🍓','🍇','🍎','🍌','🥭','🍍','🥥','🫐',
  '🥩','🍗','🐟','🍤','🦐','🦑','🌶️','🧄','🧅','🥕',
  '🥦','🫑','🥬','🍆','🌽','🍄','🫙','🍯','🧊','💧',
  '⚗️','🧪','📦','🪣','🏺','🫀','🌿','🎋','🌰','🫚',
]

// Compress image to small JPEG — stored as base64 directly in nexpos_ingredients
// More aggressive compression than products since ingredient images are decorative
function compressIngredientImage(file: File, maxDim = 180, quality = 0.65): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = reject
    img.src = url
  })
}

type FormState = {
  name: string
  unit: string
  stock: string
  minStock: string
  costPerUnit: string
  emoji: string
  imageUrl: string
}

const EMPTY_FORM: FormState = {
  name: '', unit: 'g', stock: '0', minStock: '10', costPerUnit: '0',
  emoji: '🧪', imageUrl: '',
}

interface IngredientModalProps {
  isOpen: boolean
  ingredient?: Ingredient | null
  onClose: () => void
  onSave: (data: Omit<Ingredient, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => void
  /** If provided, a Delete button is shown in edit mode (admin/owner only). */
  onDelete?: () => void
}

export function IngredientModal({ isOpen, ingredient, onClose, onSave, onDelete }: IngredientModalProps) {
  const isEdit = !!ingredient
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setErrors({})
      setEmojiOpen(false)
      setImageUploading(false)
      setConfirmDelete(false)
      if (ingredient) {
        setForm({
          name:        ingredient.name,
          unit:        ingredient.unit,
          stock:       String(ingredient.stock),
          minStock:    String(ingredient.minStock),
          costPerUnit: String(ingredient.costPerUnit),
          emoji:       ingredient.emoji ?? '🧪',
          imageUrl:    ingredient.imageUrl ?? '',
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return
    setImageUploading(true)
    try {
      const compressed = await compressIngredientImage(file)
      setForm(prev => ({ ...prev, imageUrl: compressed }))
    } catch {
      toast.error('Could not process image. Try another file.')
    } finally {
      setImageUploading(false)
      e.target.value = ''
    }
  }

  const removeImage = () => setForm(prev => ({ ...prev, imageUrl: '' }))

  const validate = (): boolean => {
    const e: typeof errors = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (form.stock === '' || isNaN(+form.stock) || +form.stock < 0) e.stock = 'Valid stock required'
    if (form.minStock === '' || isNaN(+form.minStock) || +form.minStock < 0) e.minStock = 'Valid min stock required'
    if (form.costPerUnit === '' || isNaN(+form.costPerUnit) || +form.costPerUnit < 0) e.costPerUnit = 'Valid cost required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    onSave({
      ...(ingredient?.id ? { id: ingredient.id } : {}),
      name:        form.name.trim(),
      unit:        form.unit,
      stock:       +form.stock,
      minStock:    +form.minStock,
      costPerUnit: Math.round(+form.costPerUnit * 100) / 100,
      emoji:       form.emoji,
      imageUrl:    form.imageUrl || undefined,
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
      <div className="relative w-full sm:max-w-md bg-white sm:rounded-3xl rounded-t-3xl shadow-[0_-8px_40px_rgba(0,0,0,0.2)] sm:shadow-[0_30px_80px_rgba(0,0,0,0.25)] flex flex-col max-h-[90vh] animate-slide-up">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Emoji / image picker trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setEmojiOpen(!emojiOpen)}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-dashed border-surface-200 bg-surface-50 text-2xl transition-all hover:border-emerald-300 hover:bg-emerald-50 active:scale-95 overflow-hidden"
                title="Change icon"
              >
                {form.imageUrl ? (
                  <img src={form.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  form.emoji
                )}
              </button>

              {emojiOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setEmojiOpen(false)} />
                  <div className="absolute left-0 top-full mt-2 z-20 w-64 p-3 bg-white rounded-2xl border border-surface-100 shadow-[0_8px_32px_rgba(0,0,0,0.15)] grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
                    {INGREDIENT_EMOJIS.map(e => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => { setForm(p => ({ ...p, emoji: e })); setEmojiOpen(false) }}
                        className={cn(
                          'h-7 w-7 flex items-center justify-center rounded-lg text-base transition-all hover:bg-emerald-50',
                          form.emoji === e && 'bg-emerald-100 ring-1 ring-emerald-400'
                        )}
                      >
                        {e}
                      </button>
                    ))}
                    <div className="col-span-8 mt-1 pt-1 border-t border-surface-100">
                      <p className="text-[10px] text-surface-400 text-center">Tap emoji to select icon</p>
                    </div>
                  </div>
                </>
              )}
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
        <form id="ingredient-form" onSubmit={handleSubmit} className="px-5 py-4 space-y-4 flex-1 overflow-y-auto">

          {/* Photo Upload */}
          <div>
            <label className="text-sm font-semibold text-surface-700 mb-1.5 block">
              Photo
              <span className="ml-1 text-xs font-normal text-surface-400">optional — stored locally</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />

            {form.imageUrl ? (
              <div className="relative rounded-2xl overflow-hidden border border-surface-200 bg-surface-50 h-24">
                <img src={form.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 hover:bg-black/25 transition-all flex items-center justify-center gap-2 opacity-0 hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 rounded-xl bg-white/90 px-3 py-1.5 text-xs font-semibold text-surface-700 shadow hover:bg-white transition-all"
                  >
                    <ImagePlus className="h-3.5 w-3.5" />
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={removeImage}
                    className="flex items-center gap-1.5 rounded-xl bg-rose-500/90 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-rose-500 transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </div>
                {imageUploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={imageUploading}
                className="w-full flex items-center justify-center rounded-2xl border-2 border-dashed border-surface-200 bg-surface-50 py-4 transition-all hover:border-emerald-300 hover:bg-emerald-50 group disabled:opacity-60"
              >
                <div className="flex flex-col items-center gap-1.5 text-surface-400 group-hover:text-emerald-500 transition-colors">
                  {imageUploading ? (
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                  ) : (
                    <ImagePlus className="h-5 w-5" />
                  )}
                  <p className="text-xs font-medium">{imageUploading ? 'Processing…' : 'Upload ingredient photo'}</p>
                  <p className="text-[10px]">PNG, JPG, WebP — compressed automatically</p>
                </div>
              </button>
            )}
          </div>

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
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-surface-100 bg-surface-50/60 rounded-b-3xl flex-shrink-0">
          {/* Delete — edit mode, admin/owner only */}
          {isEdit && onDelete ? (
            confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-rose-600">Delete?</span>
                <button
                  type="button"
                  onClick={onDelete}
                  className="h-8 rounded-xl bg-rose-500 px-3 text-xs font-bold text-white hover:bg-rose-600 transition-all"
                >
                  Yes, delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="h-8 rounded-xl border border-surface-200 bg-white px-3 text-xs font-semibold text-surface-600 hover:bg-surface-50 transition-all"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 h-10 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-600 hover:bg-rose-100 transition-all"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            )
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-xl border border-surface-200 bg-white px-5 text-sm font-semibold text-surface-700 hover:bg-surface-50 transition-all"
            >
              Cancel
            </button>
          )}

          <div className="flex items-center gap-2">
            {isEdit && onDelete && !confirmDelete && (
              <button
                type="button"
                onClick={onClose}
                className="h-10 rounded-xl border border-surface-200 bg-white px-4 text-sm font-semibold text-surface-700 hover:bg-surface-50 transition-all"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              form="ingredient-form"
              disabled={imageUploading}
              className="h-10 rounded-xl bg-emerald-500 px-6 text-sm font-bold text-white shadow-sm hover:bg-emerald-600 transition-all active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none"
            >
              {isEdit ? 'Save Changes' : 'Add Ingredient'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
