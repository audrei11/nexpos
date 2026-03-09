'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { Product } from '@/lib/types'
import { fetchFromSheetsProxy } from '@/lib/sheets'
import { saveImage, loadAllImages, deleteImage } from '@/lib/image-store'

interface ProductsContextValue {
  products: Product[]
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>
  resetProducts: () => void
}

const ProductsContext = createContext<ProductsContextValue | null>(null)

const STORAGE_KEY = 'nexpos_products'

function migrateImageUrl(url: string): string {
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (idMatch) return `https://lh3.googleusercontent.com/d/${idMatch[1]}`
  return url
}

function mapRowToProduct(row: Record<string, unknown>): Product {
  return {
    id:          String(row.id ?? ''),
    name:        String(row.name ?? ''),
    sku:         String(row.sku ?? ''),
    category:    String(row.category ?? 'other'),
    price:       Number(row.price) || 0,
    cost:        row.cost !== '' && row.cost != null ? Number(row.cost) : undefined,
    stock:       Number(row.stock) || 0,
    minStock:    row.min_stock != null ? Number(row.min_stock) : 5,
    description: row.description ? String(row.description) : undefined,
    emoji:       row.emoji ? String(row.emoji) : '📦',
    barcode:     row.barcode ? String(row.barcode) : undefined,
    unit:        row.unit ? String(row.unit) : undefined,
    taxRate:     row.tax_rate != null ? Number(row.tax_rate) : 0.08,
    isActive:    row.is_active === true || String(row.is_active).toLowerCase() === 'true',
    imageUrl:    row.image_url ? migrateImageUrl(String(row.image_url)) : undefined,
    createdAt:   String(row.created_at ?? new Date().toISOString()),
    updatedAt:   String(row.updated_at ?? new Date().toISOString()),
  }
}

const norm = (s?: string) => (s ?? '').toLowerCase().trim()

/**
 * Three-pass dedup: id → sku → normalized name.
 * Later entries win so local data (appended last) takes precedence over Sheets data.
 */
function dedupe(products: Product[]): Product[] {
  // Pass 1 — exact id
  const byId = new Map<string, Product>()
  for (const p of products) if (p.id) byId.set(p.id, p)
  // Pass 2 — non-empty SKU (catches same product saved with different ids)
  const bySku = new Map<string, Product>()
  for (const p of byId.values()) {
    const key = norm(p.sku)
    if (key) bySku.set(key, p)
    else bySku.set(`__id__${p.id}`, p) // no SKU → keep, use id as fallback key
  }
  // Pass 3 — normalized name (catches casing / whitespace variants)
  const byName = new Map<string, Product>()
  for (const p of bySku.values()) {
    const key = norm(p.name)
    if (key) byName.set(key, p)
    else byName.set(`__sku__${norm(p.sku)}__id__${p.id}`, p)
  }
  return Array.from(byName.values())
}

/** Returns true if two products refer to the same item (by id, sku, or name). */
function isSameProduct(a: Product, b: Product): boolean {
  if (a.id && b.id && a.id === b.id) return true
  const aSku = norm(a.sku); const bSku = norm(b.sku)
  if (aSku && bSku && aSku === bSku) return true
  const aName = norm(a.name); const bName = norm(b.name)
  return !!(aName && bName && aName === bName)
}

/** Strip base64 data URLs from a product list before writing to localStorage. */
function stripBase64(products: Product[]): Product[] {
  return products.map(p =>
    p.imageUrl?.startsWith('data:') ? { ...p, imageUrl: undefined } : p
  )
}

export function ProductsProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([])

  // ── Persisted setter ────────────────────────────────────────────────────────
  const setProductsPersisted: React.Dispatch<React.SetStateAction<Product[]>> = useCallback(
    (action) => {
      setProducts(prev => {
        const next = typeof action === 'function' ? action(prev) : action

        const nextIds = new Set(next.map(p => p.id))
        prev.forEach(p => {
          if (!nextIds.has(p.id)) deleteImage(p.id).catch(() => {})
        })

        next.forEach(p => {
          if (p.imageUrl?.startsWith('data:')) saveImage(p.id, p.imageUrl).catch(() => {})
        })

        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(stripBase64(next)))
        } catch {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next.map(p => ({ ...p, imageUrl: undefined }))))
          } catch {}
        }

        return next
      })
    },
    []
  )

  // ── Single init effect: local load → Sheets merge (sequential, cancellable) ─
  // Using one effect instead of two prevents the React StrictMode double-mount
  // from triggering a second Sheets fetch against stale prev state.
  useEffect(() => {
    let cancelled = false

    async function init() {
      // 1. Load + dedupe from localStorage
      let loaded: Product[] = []
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const parsed: Product[] = JSON.parse(stored)
          loaded = dedupe(parsed.map(p => ({
            ...p,
            imageUrl: p.imageUrl ? migrateImageUrl(p.imageUrl) : p.imageUrl,
          })))
        }
      } catch {}

      // 2. Migrate legacy base64 images → IndexedDB
      const toMigrate = loaded.filter(p => p.imageUrl?.startsWith('data:'))
      if (toMigrate.length > 0) {
        await Promise.all(toMigrate.map(p => saveImage(p.id, p.imageUrl!).catch(() => {})))
        loaded = stripBase64(loaded)
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(loaded)) } catch {}
      }

      // 3. Load all IndexedDB images once — reused in both local hydration and Sheets merge
      let idbImages: Record<string, string> = {}
      try { idbImages = await loadAllImages() } catch {}

      // Hydrate local products with IndexedDB images
      if (Object.keys(idbImages).length > 0) {
        loaded = loaded.map(p => ({ ...p, imageUrl: idbImages[p.id] ?? p.imageUrl }))
      }

      if (cancelled) return
      setProducts(loaded)

      // 4. Fetch from Sheets and merge — runs only after local state is set
      try {
        const rows = await fetchFromSheetsProxy('getProducts')
        if (cancelled || !rows.length) return

        const sheetsProducts = dedupe(rows.map(mapRowToProduct).filter(p => p.id))

        if (cancelled) return
        setProductsPersisted(prev => {
          const merged = sheetsProducts.map((sp: Product) => {
            // Match by id, sku, or normalized name — in that priority order
            const local = prev.find(p => isSameProduct(p, sp))
            // Image priority:
            //  1. Local base64 in memory (uploaded by user, not sent to Sheets)
            //  2. IndexedDB image by Sheets id (survives logout — idbImages persists)
            //  3. IndexedDB image by old local id (when ids differ after dedup)
            //  4. Sheets Drive URL
            const idbImg = idbImages[sp.id] ?? (local ? idbImages[local.id] : undefined)
            const imageUrl = local?.imageUrl?.startsWith('data:')
              ? local.imageUrl
              : idbImg ?? sp.imageUrl ?? local?.imageUrl
            return {
              ...sp,
              ...(imageUrl ? { imageUrl } : {}),
              ...(local?.recipe ? { recipe: local.recipe } : {}),
            }
          })
          // Local-only = products not matched by any Sheets entry
          const localOnly = prev.filter(p => !sheetsProducts.some(sp => isSameProduct(p, sp)))
          return dedupe([...merged, ...localOnly])
        })
      } catch { /* GAS unavailable — keep local data */ }
    }

    init()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const resetProducts = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
    setProducts([])
  }, [])

  return (
    <ProductsContext.Provider value={{ products, setProducts: setProductsPersisted, resetProducts }}>
      {children}
    </ProductsContext.Provider>
  )
}

export function useProducts() {
  const ctx = useContext(ProductsContext)
  if (!ctx) throw new Error('useProducts must be used inside ProductsProvider')
  return ctx
}
