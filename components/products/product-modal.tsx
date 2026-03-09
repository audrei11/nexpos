'use client'

import { useState, useEffect, useRef } from 'react'
import { X, ImagePlus, TrendingUp, Package, DollarSign, Layers, Trash2, FlaskConical, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CATEGORIES } from '@/lib/mock-data'
import type { Product, RecipeItem } from '@/lib/types'
import { uploadProductImage } from '@/lib/sheets'
import { useIngredients } from '@/lib/ingredients-context'
import toast from 'react-hot-toast'

// ─── base64 → Blob (without fetch, works in all browsers) ───────────────
function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg'
  const bytes = atob(base64)
  const arr = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
  return new Blob([arr], { type: mime })
}

// ─── Image compression ───────────────────────────────────────────────────
function compressImage(file: File, maxDim = 400, quality = 0.75): Promise<string> {
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

// ─── Emoji picker presets ────────────────────────────────────────────────
const EMOJI_PRESETS = [
  '📦','🎧','⌚','🔌','💻','📱','🖥️','⌨️','📷','🎮',
  '🧥','👕','👖','👗','👟','👜','💎','🧣','🎩','👒',
  '🍔','🍕','🐟','🥗','🍱','🌮','🥪','🍜','🧁','🍰',
  '☕','🍊','🍵','🧃','🥤','🍺','🍷','🧋','🫖','🍫',
  '🕯️','🌿','🏺','🛋️','🪴','🖼️','🧴','🪥','🧹','🛁',
]

type FormState = {
  name: string
  description: string
  sku: string
  barcode: string
  category: string
  emoji: string
  price: string
  cost: string
  taxRate: string
  stock: string
  minStock: string
  unit: string
  isActive: boolean
  imageUrl: string
  recipe: RecipeItem[]
}

const EMPTY_FORM: FormState = {
  name: '', description: '', sku: '', barcode: '',
  category: 'electronics', emoji: '📦',
  price: '', cost: '', taxRate: '8',
  stock: '0', minStock: '5', unit: '',
  isActive: true,
  imageUrl: '',
  recipe: [],
}

interface ProductModalProps {
  isOpen: boolean
  product?: Product | null
  onClose: () => void
  onSave: (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => void
}

export function ProductModal({ isOpen, product, onClose, onSave }: ProductModalProps) {
  const isEdit = !!product
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'basic' | 'pricing' | 'inventory' | 'recipe'>('basic')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageUploading, setImageUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { ingredients } = useIngredients()
  const [newRecipeIngredientId, setNewRecipeIngredientId] = useState('')
  const [newRecipeQty, setNewRecipeQty] = useState('')

  // Populate when editing; reset image state on every open
  useEffect(() => {
    if (isOpen) {
      setActiveTab('basic')
      setErrors({})
      setEmojiOpen(false)
      setImageFile(null)
      setImageUploading(false)
      if (product) {
        setForm({
          name:        product.name,
          description: product.description ?? '',
          sku:         product.sku,
          barcode:     product.barcode ?? '',
          category:    product.category,
          emoji:       product.emoji ?? '📦',
          price:       String(product.price),
          cost:        product.cost != null ? String(product.cost) : '',
          taxRate:     product.taxRate != null ? String(product.taxRate * 100) : '8',
          stock:       String(product.stock),
          minStock:    product.minStock != null ? String(product.minStock) : '5',
          unit:        product.unit ?? '',
          isActive:    product.isActive,
          imageUrl:    product.imageUrl ?? '',
          recipe:      product.recipe ?? [],
        })
        setImagePreview(product.imageUrl ?? null)
      } else {
        setForm(EMPTY_FORM)
        setImagePreview(null)
      }
      setNewRecipeIngredientId('')
      setNewRecipeQty('')
    }
  }, [isOpen, product])

  // Revoke blob URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview)
    }
  }, [imagePreview])

  const set = (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm(prev => ({ ...prev, [field]: e.target.value }))
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Only JPG, PNG or WebP images are allowed')
      return
    }
    // No size limit here — large files are compressed before saving
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview)
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setForm(prev => ({ ...prev, imageUrl: '' })) // clear old URL; new file takes priority
    // Reset the input so the same file can be re-selected if removed and re-added
    e.target.value = ''
  }

  const removeImage = () => {
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview)
    setImageFile(null)
    setImagePreview(null)
    setForm(prev => ({ ...prev, imageUrl: '' }))
  }

  const validate = (): boolean => {
    const e: typeof errors = {}
    if (!form.name.trim())   e.name  = 'Product name is required'
    if (!form.sku.trim())    e.sku   = 'SKU is required'
    if (!form.price || isNaN(+form.price) || +form.price < 0) e.price = 'Valid price required'
    if (form.stock === '' || isNaN(+form.stock)) e.stock = 'Stock quantity required'
    setErrors(e)
    // Switch to the tab that has the first error
    if (e.name || e.sku || e.description) setActiveTab('basic')
    else if (e.price || e.cost) setActiveTab('pricing')
    else if (e.stock) setActiveTab('inventory')
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    let finalImageUrl = form.imageUrl || undefined

    // Upload new file if one was selected
    if (imageFile) {
      setImageUploading(true)
      try {
        // Step 1: compress to a small JPEG first (ensures it's always small enough)
        const compressed = await compressImage(imageFile, 400, 0.8)
        // Always keep base64 as safe fallback — set it now before any async step
        finalImageUrl = compressed

        // Step 2: convert compressed data URL back to a File for GAS upload
        const blob = dataUrlToBlob(compressed)
        const smallFile = new File([blob], imageFile.name, { type: 'image/jpeg' })

        // Step 3: try GAS → Google Drive upload (permanent URL, survives reload + other devices)
        try {
          finalImageUrl = await uploadProductImage(smallFile)
        } catch {
          // GAS unavailable — fall back to the compressed base64 already set above
          toast('Image saved locally — upload to Google Drive unavailable', {
            icon: '⚠️',
            duration: 4000,
          })
        }
      } catch {
        toast.error('Could not process the image. Try a different photo.')
        // finalImageUrl stays as whatever was set before (undefined if compression failed too)
      } finally {
        setImageUploading(false)
      }
    }

    onSave({
      ...(product?.id ? { id: product.id } : {}),
      name:        form.name.trim(),
      description: form.description.trim() || undefined,
      sku:         form.sku.trim().toUpperCase(),
      barcode:     form.barcode.trim() || undefined,
      category:    form.category,
      emoji:       form.emoji,
      price:       +form.price,
      cost:        form.cost ? +form.cost : undefined,
      taxRate:     +form.taxRate / 100,
      stock:       +form.stock,
      minStock:    form.minStock ? +form.minStock : 5,
      unit:        form.unit.trim() || undefined,
      isActive:    form.isActive,
      imageUrl:    finalImageUrl,
      recipe:      form.recipe.length > 0 ? form.recipe : undefined,
    })
  }

  const margin =
    form.price && form.cost && +form.price > 0
      ? ((+form.price - +form.cost) / +form.price * 100).toFixed(1)
      : null

  if (!isOpen) return null

  const TABS = [
    { id: 'basic',     label: 'Basic Info',   icon: Package,      hasError: !!(errors.name || errors.sku) },
    { id: 'pricing',   label: 'Pricing',      icon: DollarSign,   hasError: !!(errors.price) },
    { id: 'inventory', label: 'Inventory',    icon: Layers,       hasError: !!(errors.stock) },
    { id: 'recipe',    label: 'Recipe',       icon: FlaskConical, hasError: false },
  ] as const

  const inputCls = (err?: string) => cn(
    'w-full h-10 rounded-xl border bg-white px-3.5 text-sm text-surface-900 placeholder:text-surface-400',
    'transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400',
    err ? 'border-rose-400' : 'border-surface-200'
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full sm:max-w-xl bg-white sm:rounded-3xl rounded-t-3xl shadow-[0_-8px_40px_rgba(0,0,0,0.2)] sm:shadow-[0_30px_80px_rgba(0,0,0,0.25)] flex flex-col max-h-[92vh] animate-slide-up">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Emoji picker trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setEmojiOpen(!emojiOpen)}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-dashed border-surface-200 bg-surface-50 text-2xl transition-all hover:border-brand-300 hover:bg-brand-50 active:scale-95"
                title="Change icon"
              >
                {form.emoji}
              </button>
              {emojiOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setEmojiOpen(false)} />
                  <div className="absolute left-0 top-full mt-2 z-20 w-64 p-3 bg-white rounded-2xl border border-surface-100 shadow-card-lg grid grid-cols-8 gap-1">
                    {EMOJI_PRESETS.map(e => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => { setForm(p => ({ ...p, emoji: e })); setEmojiOpen(false) }}
                        className={cn(
                          'h-7 w-7 flex items-center justify-center rounded-lg text-base transition-all hover:bg-brand-50',
                          form.emoji === e && 'bg-brand-100 ring-1 ring-brand-400'
                        )}
                      >
                        {e}
                      </button>
                    ))}
                    <div className="col-span-8 mt-1 pt-1 border-t border-surface-100">
                      <p className="text-[10px] text-surface-400 text-center">Tap to select icon</p>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-surface-900">
                {isEdit ? 'Edit Product' : 'Add New Product'}
              </h2>
              <p className="text-xs text-surface-500 mt-0.5">
                {isEdit ? 'Update the product details below' : 'Fill in the info to add to inventory'}
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

        {/* ── Tabs ───────────────────────────────────────────────────────── */}
        <div className="flex gap-1 px-5 pt-3 pb-0 flex-shrink-0">
          {TABS.map(({ id, label, icon: Icon, hasError }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                activeTab === id
                  ? 'bg-brand-50 text-brand-700 border border-brand-200'
                  : 'text-surface-500 hover:text-surface-700 hover:bg-surface-50',
                hasError && 'text-rose-600 bg-rose-50 border border-rose-200'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
              {hasError && <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />}
            </button>
          ))}
        </div>

        {/* ── Form body ──────────────────────────────────────────────────── */}
        <form id="product-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4">

          {/* Tab: Basic Info */}
          {activeTab === 'basic' && (
            <div className="space-y-4 animate-fade-in">
              {/* Name */}
              <div>
                <label className="text-sm font-semibold text-surface-700 mb-1.5 block">
                  Product Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={set('name')}
                  placeholder="e.g. Wireless Earbuds Pro"
                  autoFocus
                  className={inputCls(errors.name)}
                />
                {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name}</p>}
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-semibold text-surface-700 mb-1.5 block">
                  Description
                  <span className="ml-1 text-xs font-normal text-surface-400">optional</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={set('description')}
                  placeholder="Brief product description..."
                  rows={2}
                  className="w-full rounded-xl border border-surface-200 bg-white px-3.5 py-2.5 text-sm text-surface-900 placeholder:text-surface-400 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
                />
              </div>

              {/* Image upload */}
              <div>
                <label className="text-sm font-semibold text-surface-700 mb-1.5 block">
                  Product Image
                  <span className="ml-1 text-xs font-normal text-surface-400">optional</span>
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {imagePreview ? (
                  <div className="relative rounded-2xl overflow-hidden border border-surface-200 bg-surface-50">
                    <img
                      src={imagePreview}
                      alt="Product preview"
                      className="w-full h-36 object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-all flex items-center justify-center gap-2 opacity-0 hover:opacity-100">
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
                    {imageFile && (
                      <div className="absolute bottom-2 left-2 rounded-lg bg-black/50 px-2 py-0.5 text-[10px] text-white">
                        {imageFile.name}
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center rounded-2xl border-2 border-dashed border-surface-200 bg-surface-50 py-6 transition-all hover:border-brand-300 hover:bg-brand-50 group"
                  >
                    <div className="flex flex-col items-center gap-2 text-surface-400 group-hover:text-brand-500 transition-colors">
                      <ImagePlus className="h-7 w-7" />
                      <p className="text-sm font-medium">Click to upload image</p>
                      <p className="text-xs">PNG, JPG, WebP — max 2 MB</p>
                    </div>
                  </button>
                )}
              </div>

              {/* SKU + Barcode */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-surface-700 mb-1.5 block">
                    SKU <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.sku}
                    onChange={set('sku')}
                    placeholder="e.g. ELEC-001"
                    className={cn(inputCls(errors.sku), 'font-mono uppercase')}
                  />
                  {errors.sku && <p className="text-xs text-rose-500 mt-1">{errors.sku}</p>}
                </div>
                <div>
                  <label className="text-sm font-semibold text-surface-700 mb-1.5 block">
                    Barcode
                    <span className="ml-1 text-xs font-normal text-surface-400">optional</span>
                  </label>
                  <input
                    type="text"
                    value={form.barcode}
                    onChange={set('barcode')}
                    placeholder="e.g. 012345678901"
                    className={cn(inputCls(), 'font-mono')}
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="text-sm font-semibold text-surface-700 mb-1.5 block">Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.filter(c => c.id !== 'all').map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, category: cat.id }))}
                      className={cn(
                        'flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all',
                        form.category === cat.id
                          ? 'border-brand-300 bg-brand-50 text-brand-700'
                          : 'border-surface-200 bg-white text-surface-600 hover:border-brand-200 hover:bg-surface-50'
                      )}
                    >
                      <span>{cat.emoji}</span>
                      <span className="truncate text-xs">{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between rounded-2xl border border-surface-100 bg-surface-50 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-surface-900">Active Status</p>
                  <p className="text-xs text-surface-500 mt-0.5">
                    {form.isActive ? 'Visible in POS and inventory' : 'Hidden from POS terminal'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm(p => ({ ...p, isActive: !p.isActive }))}
                  className={cn(
                    'relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-all duration-200',
                    form.isActive ? 'bg-brand-gradient shadow-brand' : 'bg-surface-300'
                  )}
                >
                  <span className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200',
                    form.isActive ? 'translate-x-6' : 'translate-x-1'
                  )} />
                </button>
              </div>
            </div>
          )}

          {/* Tab: Pricing */}
          {activeTab === 'pricing' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-2 gap-3">
                {/* Sell price */}
                <div>
                  <label className="text-sm font-semibold text-surface-700 mb-1.5 block">
                    Sell Price <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-surface-400">₱</span>
                    <input
                      type="number" value={form.price} onChange={set('price')}
                      placeholder="0.00" min="0" step="0.01"
                      className={cn(inputCls(errors.price), 'pl-7')}
                    />
                  </div>
                  {errors.price && <p className="text-xs text-rose-500 mt-1">{errors.price}</p>}
                </div>

                {/* Cost price */}
                <div>
                  <label className="text-sm font-semibold text-surface-700 mb-1.5 block">
                    Cost Price
                    <span className="ml-1 text-xs font-normal text-surface-400">optional</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-surface-400">₱</span>
                    <input
                      type="number" value={form.cost} onChange={set('cost')}
                      placeholder="0.00" min="0" step="0.01"
                      className={cn(inputCls(), 'pl-7')}
                    />
                  </div>
                </div>
              </div>

              {/* Tax rate */}
              <div className="w-1/2">
                <label className="text-sm font-semibold text-surface-700 mb-1.5 block">Tax Rate</label>
                <div className="relative">
                  <input
                    type="number" value={form.taxRate} onChange={set('taxRate')}
                    placeholder="8" min="0" max="100" step="0.1"
                    className={cn(inputCls(), 'pr-8')}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-surface-400">%</span>
                </div>
              </div>

              {/* Margin preview card */}
              {margin !== null ? (
                <div className={cn(
                  'rounded-2xl border p-4',
                  +margin >= 40 ? 'border-emerald-200 bg-emerald-50'
                    : +margin >= 20 ? 'border-amber-200 bg-amber-50'
                    : 'border-rose-200 bg-rose-50'
                )}>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className={cn(
                      'h-4 w-4',
                      +margin >= 40 ? 'text-emerald-600' : +margin >= 20 ? 'text-amber-600' : 'text-rose-600'
                    )} />
                    <span className="text-sm font-bold text-surface-800">Profit Margin</span>
                  </div>
                  <div className="flex items-end gap-4">
                    <div>
                      <p className={cn(
                        'text-2xl font-black',
                        +margin >= 40 ? 'text-emerald-700' : +margin >= 20 ? 'text-amber-700' : 'text-rose-700'
                      )}>{margin}%</p>
                      <p className="text-xs text-surface-500 mt-0.5">Gross margin</p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-surface-800">
                        ₱{(+form.price - +form.cost).toFixed(2)}
                      </p>
                      <p className="text-xs text-surface-500">Profit per unit</p>
                    </div>
                  </div>
                  {/* Margin bar */}
                  <div className="mt-3 h-1.5 rounded-full bg-white/60 overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        +margin >= 40 ? 'bg-emerald-500' : +margin >= 20 ? 'bg-amber-500' : 'bg-rose-500'
                      )}
                      style={{ width: `${Math.min(100, +margin)}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-surface-200 p-4 text-center text-surface-400">
                  <TrendingUp className="h-5 w-5 mx-auto mb-1 opacity-40" />
                  <p className="text-xs">Enter both sell price and cost to see margin</p>
                </div>
              )}
            </div>
          )}

          {/* Tab: Inventory */}
          {activeTab === 'inventory' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-2 gap-3">
                {/* Stock qty */}
                <div>
                  <label className="text-sm font-semibold text-surface-700 mb-1.5 block">
                    Stock Quantity <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number" value={form.stock} onChange={set('stock')}
                    placeholder="0" min="0" step="1"
                    className={inputCls(errors.stock)}
                  />
                  {errors.stock && <p className="text-xs text-rose-500 mt-1">{errors.stock}</p>}
                </div>

                {/* Min stock */}
                <div>
                  <label className="text-sm font-semibold text-surface-700 mb-1.5 block">
                    Low Stock Alert
                    <span className="ml-1 text-xs font-normal text-surface-400">min level</span>
                  </label>
                  <input
                    type="number" value={form.minStock} onChange={set('minStock')}
                    placeholder="5" min="0" step="1"
                    className={inputCls()}
                  />
                </div>
              </div>

              {/* Unit */}
              <div className="w-1/2">
                <label className="text-sm font-semibold text-surface-700 mb-1.5 block">
                  Unit
                  <span className="ml-1 text-xs font-normal text-surface-400">optional</span>
                </label>
                <input
                  type="text" value={form.unit} onChange={set('unit')}
                  placeholder="e.g. piece, kg, litre"
                  className={inputCls()}
                />
              </div>

              {/* Stock level preview */}
              {form.stock !== '' && form.minStock !== '' && (
                <div className="rounded-2xl border border-surface-100 bg-surface-50 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-surface-700">Stock Preview</span>
                    <span className={cn(
                      'text-xs font-bold rounded-full px-2.5 py-1',
                      +form.stock === 0          ? 'bg-rose-100 text-rose-700'
                        : +form.stock <= +form.minStock ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700'
                    )}>
                      {+form.stock === 0 ? 'Out of Stock'
                        : +form.stock <= +form.minStock ? 'Low Stock'
                        : 'In Stock'}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-200 overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        +form.stock === 0          ? 'bg-rose-400'
                          : +form.stock <= +form.minStock ? 'bg-amber-400'
                          : 'bg-emerald-500'
                      )}
                      style={{
                        width: `${Math.min(100, Math.round((+form.stock / Math.max(+form.minStock * 4, 1)) * 100))}%`
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="text-[11px] text-surface-400">0</span>
                    <span className="text-[11px] text-surface-400">Alert at {form.minStock}</span>
                    <span className="text-[11px] text-surface-500 font-semibold">{form.stock} units</span>
                  </div>
                </div>
              )}

            </div>
          )}
          {/* Tab: Recipe */}
          {activeTab === 'recipe' && (
            <div className="space-y-4 animate-fade-in">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
                <p className="text-xs font-semibold text-emerald-700 mb-0.5">Café / Recipe Mode</p>
                <p className="text-xs text-emerald-600">
                  Add ingredients consumed per unit sold. Stock will be auto-deducted at checkout.
                </p>
              </div>

              {ingredients.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-surface-200 p-8 text-center text-surface-400">
                  <FlaskConical className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-semibold text-surface-600">No ingredients yet</p>
                  <p className="text-xs mt-1">Go to Ingredients page to add raw ingredients first.</p>
                </div>
              ) : (
                <>
                  {/* Current recipe items */}
                  {form.recipe.length > 0 && (
                    <div className="space-y-2">
                      {form.recipe.map(item => {
                        const ing = ingredients.find(i => i.id === item.ingredientId)
                        if (!ing) return null
                        return (
                          <div key={item.ingredientId} className="flex items-center gap-3 rounded-xl border border-surface-100 bg-white px-3 py-2.5">
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-50 overflow-hidden text-base">
                              {ing.imageUrl ? (
                                <img src={ing.imageUrl} alt={ing.name} className="h-full w-full object-cover" />
                              ) : ing.emoji ? (
                                ing.emoji
                              ) : (
                                <FlaskConical className="h-4 w-4 text-emerald-600" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-surface-900">{ing.name}</p>
                              <p className="text-xs text-surface-400">{item.quantityRequired} {ing.unit} per unit sold</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setForm(p => ({ ...p, recipe: p.recipe.filter(r => r.ingredientId !== item.ingredientId) }))}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-rose-400 hover:bg-rose-50 transition-all"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Add ingredient row */}
                  <div className="rounded-xl border border-surface-100 bg-surface-50 p-3">
                    <p className="text-xs font-semibold text-surface-600 mb-2">Add Ingredient</p>
                    <div className="flex gap-2">
                      <select
                        value={newRecipeIngredientId}
                        onChange={e => setNewRecipeIngredientId(e.target.value)}
                        className="flex-1 h-9 rounded-xl border border-surface-200 bg-white px-3 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
                      >
                        <option value="">Select ingredient...</option>
                        {ingredients
                          .filter(i => !form.recipe.some(r => r.ingredientId === i.id))
                          .map(i => (
                            <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                          ))}
                      </select>
                      <input
                        type="number" min="0.01" step="0.01"
                        value={newRecipeQty}
                        onChange={e => setNewRecipeQty(e.target.value)}
                        placeholder="Qty"
                        className="w-20 h-9 rounded-xl border border-surface-200 bg-white px-3 text-sm text-center text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
                      />
                      <button
                        type="button"
                        disabled={!newRecipeIngredientId || !newRecipeQty || +newRecipeQty <= 0}
                        onClick={() => {
                          if (!newRecipeIngredientId || !newRecipeQty || +newRecipeQty <= 0) return
                          setForm(p => ({
                            ...p,
                            recipe: [...p.recipe, { ingredientId: newRecipeIngredientId, quantityRequired: +newRecipeQty }]
                          }))
                          setNewRecipeIngredientId('')
                          setNewRecipeQty('')
                        }}
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {form.recipe.length === 0 && (
                    <p className="text-center text-xs text-surface-400">
                      No recipe items yet. Select an ingredient above to build the recipe.
                    </p>
                  )}
                </>
              )}
            </div>
          )}

        </form>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-surface-100 bg-surface-50/60 rounded-b-3xl flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl border border-surface-200 bg-white px-5 text-sm font-semibold text-surface-700 hover:bg-surface-50 transition-all"
          >
            Cancel
          </button>
          <div className="flex items-center gap-2">
            {/* Tab navigation */}
            {activeTab !== 'recipe' && (
              <button
                type="button"
                onClick={() => setActiveTab(
                  activeTab === 'basic' ? 'pricing'
                  : activeTab === 'pricing' ? 'inventory'
                  : 'recipe'
                )}
                className="h-10 rounded-xl border border-surface-200 bg-white px-4 text-sm font-semibold text-surface-600 hover:bg-surface-50 transition-all"
              >
                Next →
              </button>
            )}
            <button
              type="submit"
              form="product-form"
              disabled={imageUploading}
              className="h-10 rounded-xl bg-brand-gradient px-6 text-sm font-bold text-white shadow-brand hover:shadow-brand-lg hover:brightness-110 transition-all active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none flex items-center gap-2"
            >
              {imageUploading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Uploading…
                </>
              ) : (
                isEdit ? 'Save Changes' : 'Add Product'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
