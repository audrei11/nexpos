'use client'

import { useState, useMemo } from 'react'
import {
  Search, Plus, Package,
  Pencil, Trash2,
  X, AlertTriangle,
} from 'lucide-react'
import { Header } from '@/components/layout/header'
import { ProductModal } from '@/components/products/product-modal'
import { cn, formatCurrency } from '@/lib/utils'
import { CATEGORIES } from '@/lib/mock-data'
import { Product } from '@/lib/types'
import { saveProductToSheets, logInventoryChange, type SheetProduct } from '@/lib/sheets'
import { useProducts } from '@/lib/products-context'
import toast from 'react-hot-toast'

type SortKey = 'name' | 'price' | 'stock'
type SortDir = 'asc' | 'desc'
type StatusFilter = 'all' | 'active' | 'inactive'

/* ─── helpers ──────────────────────────────────────────────────── */
function stockStatus(stock: number, min = 5) {
  if (stock === 0) return { label: 'Out of Stock', cls: 'bg-rose-500 text-white' }
  if (stock <= min) return { label: 'Low Stock', cls: 'bg-amber-400 text-white' }
  return { label: 'In Stock', cls: 'bg-emerald-500 text-white' }
}

/* ─── stat card ────────────────────────────────────────────────── */
function StatCard({ label, value, color }: {
  label: string; value: number | string; color?: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-surface-100 shadow-card px-5 py-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">{label}</p>
      <p className={cn('mt-1 text-2xl font-bold num-display', color ?? 'text-surface-900')}>{value}</p>
    </div>
  )
}

/* ─── page ─────────────────────────────────────────────────────── */
export default function ProductsPage() {
  const { products, setProducts } = useProducts()

  /* filters */
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  /* sort */
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  /* modal */
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  /* delete confirm */
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)

  /* ── stats ── */
  const totalProducts  = products.length
  const activeProducts = products.filter(p => p.isActive !== false).length
  const lowStock       = products.filter(p => p.stock > 0 && p.stock <= (p.minStock ?? 5)).length
  const outOfStock     = products.filter(p => p.stock === 0).length

  /* ── filtered + sorted ── */
  const filtered = useMemo(() => {
    let list = [...products]

    if (categoryFilter !== 'all')
      list = list.filter(p => p.category === categoryFilter)

    if (statusFilter === 'active')
      list = list.filter(p => p.isActive !== false)
    else if (statusFilter === 'inactive')
      list = list.filter(p => p.isActive === false)

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode ?? '').toLowerCase().includes(q)
      )
    }

    list.sort((a, b) => {
      let av: number, bv: number
      switch (sortKey) {
        case 'price': av = a.price; bv = b.price; break
        case 'stock': av = a.stock; bv = b.stock; break
        default:      return sortDir === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name)
      }
      return sortDir === 'asc' ? av - bv : bv - av
    })

    return list
  }, [products, categoryFilter, statusFilter, search, sortKey, sortDir])

  /* ── Sheet mapping helper ── */
  function toSheetProduct(p: Product): SheetProduct {
    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      category: p.category,
      price: p.price,
      cost: p.cost,
      stock: p.stock,
      min_stock: p.minStock,
      description: p.description,
      emoji: p.emoji,
      barcode: p.barcode,
      unit: p.unit,
      tax_rate: p.taxRate,
      is_active: p.isActive !== false,
      // Never send base64 to Sheets — too large and breaks the cell
      image_url: p.imageUrl?.startsWith('data:') ? undefined : p.imageUrl,
      created_at: p.createdAt,
      updated_at: p.updatedAt,
    }
  }

  /* ── CRUD handlers ── */
  function handleSave(data: Partial<Product>) {
    if (editingProduct) {
      const updated: Product = { ...editingProduct, ...data, updatedAt: new Date().toISOString() }
      setProducts(prev => prev.map(p => p.id === editingProduct.id ? updated : p))
      saveProductToSheets('updateProduct', toSheetProduct(updated)).catch(console.error)
      // Log inventory if stock changed
      if (data.stock !== undefined && data.stock !== editingProduct.stock) {
        logInventoryChange({
          product_id: updated.id,
          product_name: updated.name,
          change_type: 'adjustment',
          quantity_before: editingProduct.stock,
          quantity_after: data.stock,
        }).catch(console.error)
      }
      toast.success('Product updated')
    } else {
      const newProduct: Product = {
        id: `p${Date.now()}`,
        name: data.name ?? '',
        sku: data.sku ?? '',
        category: data.category ?? 'all',
        price: data.price ?? 0,
        cost: data.cost,
        stock: data.stock ?? 0,
        minStock: data.minStock ?? 5,
        description: data.description,
        emoji: data.emoji ?? '📦',
        barcode: data.barcode,
        unit: data.unit ?? 'pcs',
        taxRate: data.taxRate ?? 0,
        isActive: data.isActive !== false,
        imageUrl: data.imageUrl,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      setProducts(prev => [newProduct, ...prev])
      saveProductToSheets('saveProduct', toSheetProduct(newProduct)).catch(console.error)
      // Log initial stock
      if (newProduct.stock > 0) {
        logInventoryChange({
          product_id: newProduct.id,
          product_name: newProduct.name,
          change_type: 'initial_stock',
          quantity_before: 0,
          quantity_after: newProduct.stock,
        }).catch(console.error)
      }
      toast.success('Product added')
    }
    setModalOpen(false)
    setEditingProduct(null)
  }

  function handleDelete(product: Product) {
    setProducts(prev => prev.filter(p => p.id !== product.id))
    setDeletingProduct(null)
    toast.success(`"${product.name}" deleted`)
  }

  function handleToggleStatus(product: Product) {
    const updated: Product = { ...product, isActive: !(product.isActive !== false), updatedAt: new Date().toISOString() }
    setProducts(prev => prev.map(p => p.id === product.id ? updated : p))
    saveProductToSheets('updateProduct', toSheetProduct(updated)).catch(console.error)
    const next = product.isActive === false ? 'activated' : 'deactivated'
    toast.success(`"${product.name}" ${next}`)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Products"
        subtitle={`${totalProducts} products · ${activeProducts} active`}
        actions={
          <button
            onClick={() => { setEditingProduct(null); setModalOpen(true) }}
            className="flex h-9 items-center gap-2 rounded-xl bg-brand-gradient px-4 text-sm font-semibold text-white shadow-brand hover:brightness-110 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Product</span>
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-5">

        {/* ── Stats row ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total Products" value={totalProducts} />
          <StatCard label="Active" value={activeProducts} color="text-emerald-600" />
          <StatCard label="Low Stock" value={lowStock} color={lowStock > 0 ? 'text-amber-600' : undefined} />
          <StatCard label="Out of Stock" value={outOfStock} color={outOfStock > 0 ? 'text-rose-600' : undefined} />
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
              <input
                type="text"
                placeholder="Search name, SKU, barcode…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-8 rounded-xl border border-surface-200 bg-white text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-300 hover:text-surface-500"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Status filter */}
            <div className="flex rounded-xl border border-surface-200 bg-white overflow-hidden">
              {(['all', 'active', 'inactive'] as StatusFilter[]).map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    'px-3 h-9 text-xs font-semibold capitalize transition-colors',
                    statusFilter === s
                      ? 'bg-brand-gradient text-white'
                      : 'text-surface-500 hover:bg-surface-50'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Sort dropdown */}
            <div className="ml-auto flex items-center gap-2">
              <select
                value={`${sortKey}-${sortDir}`}
                onChange={e => {
                  const [k, d] = e.target.value.split('-') as [SortKey, SortDir]
                  setSortKey(k); setSortDir(d)
                }}
                className="h-9 rounded-xl border border-surface-200 bg-white px-3 text-xs font-semibold text-surface-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
              >
                <option value="name-asc">Name A→Z</option>
                <option value="name-desc">Name Z→A</option>
                <option value="price-asc">Price Low→High</option>
                <option value="price-desc">Price High→Low</option>
                <option value="stock-asc">Stock Low→High</option>
                <option value="stock-desc">Stock High→Low</option>
              </select>
              <p className="text-xs text-surface-400 hidden sm:block whitespace-nowrap">
                {filtered.length} of {totalProducts}
              </p>
            </div>
          </div>

          {/* Category chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={cn(
                  'flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-all flex-shrink-0',
                  categoryFilter === cat.id
                    ? 'bg-brand-gradient text-white shadow-brand'
                    : 'bg-white border border-surface-200 text-surface-600 hover:border-brand-300 hover:text-brand-600'
                )}
              >
                <span>{cat.emoji}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Card Grid ── */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 text-surface-400">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-100">
              <Package className="h-7 w-7 opacity-40" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-surface-600">No products found</p>
              <p className="text-xs text-surface-400 mt-1">
                {search || categoryFilter !== 'all' || statusFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Add your first product to get started'}
              </p>
            </div>
            {!search && categoryFilter === 'all' && statusFilter === 'all' && (
              <button
                onClick={() => { setEditingProduct(null); setModalOpen(true) }}
                className="flex items-center gap-2 rounded-xl bg-brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-brand hover:brightness-110 transition-all"
              >
                <Plus className="h-4 w-4" />
                Add First Product
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
            {filtered.map(product => {
              const status   = stockStatus(product.stock, product.minStock ?? 5)
              const isActive = product.isActive !== false

              return (
                <div
                  key={product.id}
                  className={cn(
                    'group relative bg-white rounded-2xl border shadow-card overflow-hidden transition-all duration-200',
                    'hover:shadow-card-md hover:-translate-y-0.5',
                    isActive ? 'border-surface-100' : 'border-surface-100 opacity-60'
                  )}
                  onClick={() => {}}
                >
                  {/* Image area */}
                  <div className="relative aspect-square bg-surface-50 overflow-hidden">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={e => {
                          e.currentTarget.style.display = 'none'
                          const div = document.createElement('div')
                          div.className = 'h-full w-full flex items-center justify-center text-5xl select-none'
                          div.textContent = product.emoji ?? '📦'
                          e.currentTarget.parentElement?.appendChild(div)
                        }}
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-5xl select-none">
                        {product.emoji ?? '📦'}
                      </div>
                    )}

                    {/* Stock badge */}
                    <span className={cn(
                      'absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm',
                      status.cls
                    )}>
                      {status.label}
                    </span>

                    {/* Hover action overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          setEditingProduct(product)
                          setModalOpen(true)
                        }}
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/90 text-brand-600 shadow hover:bg-white transition-all"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          setDeletingProduct(product)
                        }}
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/90 text-rose-500 shadow hover:bg-white transition-all"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Info area */}
                  <div className="p-3">
                    <p className="text-sm font-bold text-surface-900 truncate leading-tight">
                      {product.name}
                    </p>
                    <p className="text-xs text-surface-400 truncate mt-0.5">
                      {product.sku}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-base font-extrabold text-brand-600 num-display">
                        {formatCurrency(product.price)}
                      </span>
                      <span className={cn(
                        'text-xs font-semibold num-display',
                        product.stock === 0
                          ? 'text-rose-500'
                          : product.stock <= (product.minStock ?? 5)
                            ? 'text-amber-500'
                            : 'text-surface-400'
                      )}>
                        {product.stock} {product.unit ?? 'pcs'}
                      </span>
                    </div>

                    {/* Active toggle */}
                    <div className="mt-2.5 flex items-center justify-between border-t border-surface-50 pt-2.5">
                      <span className="text-[11px] text-surface-400">
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                      <button
                        onClick={e => { e.stopPropagation(); handleToggleStatus(product) }}
                        className={cn(
                          'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none',
                          isActive ? 'bg-emerald-500' : 'bg-surface-200'
                        )}
                        aria-label={isActive ? 'Deactivate' : 'Activate'}
                      >
                        <span className={cn(
                          'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform',
                          isActive ? 'translate-x-4' : 'translate-x-1'
                        )} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Product Modal ── */}
      <ProductModal
        isOpen={modalOpen}
        product={editingProduct}
        onClose={() => { setModalOpen(false); setEditingProduct(null) }}
        onSave={handleSave}
      />

      {/* ── Delete Confirm ── */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeletingProduct(null)} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-card-lg p-6 animate-scale-in">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 mb-4">
              <AlertTriangle className="h-6 w-6 text-rose-600" />
            </div>
            <h3 className="text-base font-bold text-surface-900">Delete Product?</h3>
            <p className="mt-1.5 text-sm text-surface-500">
              <span className="font-semibold text-surface-700">"{deletingProduct.name}"</span>{' '}
              will be permanently removed. This action cannot be undone.
            </p>
            <div className="mt-5 flex gap-2.5">
              <button
                onClick={() => setDeletingProduct(null)}
                className="flex-1 h-10 rounded-xl border border-surface-200 text-sm font-semibold text-surface-700 hover:bg-surface-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deletingProduct)}
                className="flex-1 h-10 rounded-xl bg-rose-500 text-sm font-semibold text-white hover:bg-rose-600 transition-all shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
