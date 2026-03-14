'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { Product } from '@/lib/types'
import { fetchFromSheetsProxy } from '@/lib/sheets'
import { saveImage, loadAllImages, deleteImage } from '@/lib/image-store'
import { readUserStorage, writeUserStorage, removeUserStorage } from '@/lib/storage'

interface ProductsContextValue {
  products: Product[]
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>
  resetProducts: () => void
  deleteProduct: (product: Product) => void
}

const ProductsContext = createContext<ProductsContextValue | null>(null)

// Key bases — actual keys are namespaced per-user via readUserStorage / writeUserStorage
const PRODUCTS_BASE = 'products'
const DELETED_BASE  = 'deleted_products'

// ── Deleted-product registry ─────────────────────────────────────────────────
// Persists which products were explicitly deleted so they are never restored
// by a Google Sheets sync after logout/login.
interface DeletedRecord { id: string; sku: string; name: string }

function loadDeleted(): DeletedRecord[] {
  try { return JSON.parse(readUserStorage(DELETED_BASE) ?? '[]') } catch { return [] }
}
function saveDeleted(records: DeletedRecord[]): void {
  writeUserStorage(DELETED_BASE, JSON.stringify(records))
}
function isDeletedProduct(p: Product, deleted: DeletedRecord[]): boolean {
  const pSku  = norm(p.sku);  const pName = norm(p.name)
  return deleted.some(d =>
    (d.id   && d.id   === p.id)  ||
    (d.sku  && d.sku  === pSku)  ||
    (d.name && d.name === pName)
  )
}

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
    recipe:      row.recipe ? (() => { try { return JSON.parse(String(row.recipe)) } catch { return undefined } })() : undefined,
    createdAt:   String(row.created_at ?? new Date().toISOString()),
    updatedAt:   String(row.updated_at ?? new Date().toISOString()),
  }
}

const norm = (s?: string) => (s ?? '').toLowerCase().trim()

/**
 * Three-pass dedup: id → sku → normalized name.
 * When two products share a key, the later entry wins for all fields EXCEPT
 * imageUrl — whichever entry has an imageUrl keeps it.
 */
function mergeTwo(a: Product, b: Product): Product {
  return { ...a, ...b, imageUrl: b.imageUrl ?? a.imageUrl }
}

function dedupe(products: Product[]): Product[] {
  // Pass 1 — exact id
  const byId = new Map<string, Product>()
  for (const p of products) {
    if (!p.id) continue
    const existing = byId.get(p.id)
    byId.set(p.id, existing ? mergeTwo(existing, p) : p)
  }
  // Pass 2 — non-empty SKU
  const bySku = new Map<string, Product>()
  for (const p of byId.values()) {
    const key = norm(p.sku)
    const slot = key || `__id__${p.id}`
    const existing = bySku.get(slot)
    bySku.set(slot, existing ? mergeTwo(existing, p) : p)
  }
  // Pass 3 — normalized name
  const byName = new Map<string, Product>()
  for (const p of bySku.values()) {
    const key = norm(p.name)
    const slot = key || `__sku__${norm(p.sku)}__id__${p.id}`
    const existing = byName.get(slot)
    byName.set(slot, existing ? mergeTwo(existing, p) : p)
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

        // Only delete IndexedDB images for products that are truly gone
        // (not present in next by id, sku, OR name — not just id).
        // This prevents images from being deleted when a product's ID changes during a merge.
        prev.forEach(p => {
          const stillExists = next.some(n => isSameProduct(n, p))
          if (!stillExists) {
            deleteImage(p.id).catch(() => {})
            if (p.sku) deleteImage(`sku:${norm(p.sku)}`).catch(() => {})
          }
        })

        // Save images under both id and sku so they survive id changes during syncing.
        next.forEach(p => {
          if (p.imageUrl?.startsWith('data:')) {
            saveImage(p.id, p.imageUrl).catch(() => {})
            if (p.sku) saveImage(`sku:${norm(p.sku)}`, p.imageUrl).catch(() => {})
          }
        })

        // Primary: keep base64 images inline in localStorage so they survive reload
        // without depending on IndexedDB availability.
        // Fallback: strip base64 if quota is exceeded, then IDB acts as the store.
        try {
          writeUserStorage(PRODUCTS_BASE, JSON.stringify(next))
        } catch {
          try {
            writeUserStorage(PRODUCTS_BASE, JSON.stringify(stripBase64(next)))
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
      // 1. Load + dedupe from localStorage (namespaced per user, migrates legacy key)
      let loaded: Product[] = []
      try {
        const stored = readUserStorage(PRODUCTS_BASE)
        if (stored) {
          const parsed: Product[] = JSON.parse(stored)
          loaded = dedupe(parsed.map(p => ({
            ...p,
            imageUrl: p.imageUrl ? migrateImageUrl(p.imageUrl) : p.imageUrl,
          })))
        }
      } catch {}

      // 2. Load all IndexedDB images — used as fallback for products whose
      //    imageUrl is missing from localStorage (e.g. data saved by an older
      //    version of the app that stripped base64 before writing to localStorage).
      let idbImages: Record<string, string> = {}
      try { idbImages = await loadAllImages() } catch {}

      // Hydrate products that have no imageUrl with IDB fallback (try id then sku key)
      let recoveredFromIdb = false
      if (Object.keys(idbImages).length > 0) {
        loaded = loaded.map(p => {
          if (p.imageUrl) return p   // already has an image — skip
          const img = idbImages[p.id] ?? (p.sku ? idbImages[`sku:${norm(p.sku)}`] : undefined)
          if (img) { recoveredFromIdb = true; return { ...p, imageUrl: img } }
          return p
        })
      }

      // If any images were recovered from IDB, persist them inline to localStorage
      // so future reloads don't need IDB at all.
      if (recoveredFromIdb) {
        writeUserStorage(PRODUCTS_BASE, JSON.stringify(loaded))
      }

      if (cancelled) return
      setProducts(loaded)

      // 4. Fetch from Sheets and merge — runs only after local state is set
      try {
        const rows = await fetchFromSheetsProxy('getProducts')
        if (cancelled || !rows.length) return

        const deleted = loadDeleted()
        const sheetsProducts = dedupe(
          rows.map(mapRowToProduct)
              .filter(p => p.id && !isDeletedProduct(p, deleted))
        )

        if (cancelled) return
        setProductsPersisted(prev => {
          const merged = sheetsProducts.map((sp: Product) => {
            // Match by id, sku, or normalized name — in that priority order
            const local = prev.find(p => isSameProduct(p, sp))
            // Image priority:
            //  1. Local imageUrl in memory (base64 or any URL already stored)
            //  2. Sheets Drive URL (if local has none)
            //  3. IndexedDB fallback (for data saved by older app versions)
            const idbImg = !local?.imageUrl
              ? (idbImages[sp.id]
                  ?? (sp.sku ? idbImages[`sku:${norm(sp.sku)}`] : undefined)
                  ?? (local ? idbImages[local.id] : undefined)
                  ?? (local?.sku ? idbImages[`sku:${norm(local.sku)}`] : undefined))
              : undefined
            const imageUrl = local?.imageUrl ?? sp.imageUrl ?? idbImg
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

        // 5. Final safety-net: re-hydrate any products still missing images from IndexedDB.
        //    Runs after the Sheets merge so it catches products whose IDs changed during merge.
        if (!cancelled) {
          const freshImages = await loadAllImages()
          if (!cancelled && Object.keys(freshImages).length > 0) {
            setProducts(current =>
              current.map(p => {
                if (p.imageUrl) return p
                const img = freshImages[p.id]
                  ?? (p.sku ? freshImages[`sku:${norm(p.sku)}`] : undefined)
                return img ? { ...p, imageUrl: img } : p
              })
            )
          }
        }
      } catch { /* GAS unavailable — keep local data */ }
    }

    init()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Delete a product permanently ────────────────────────────────────────────
  // 1. Records the deletion so Sheets sync never restores it.
  // 2. Removes the product from state + localStorage (via setProductsPersisted).
  //    setProductsPersisted's smart-delete will also clean up its IndexedDB images.
  const deleteProduct = useCallback((product: Product) => {
    // Register in deleted list
    const deleted = loadDeleted()
    if (!deleted.some(d => d.id === product.id)) {
      deleted.push({ id: product.id, sku: norm(product.sku), name: norm(product.name) })
      saveDeleted(deleted)
    }
    // Remove from state + localStorage + IndexedDB images
    setProductsPersisted(prev => prev.filter(p => !isSameProduct(p, product)))
  }, [setProductsPersisted])

  const resetProducts = useCallback(() => {
    removeUserStorage(PRODUCTS_BASE)
    setProducts([])
  }, [])

  return (
    <ProductsContext.Provider value={{ products, setProducts: setProductsPersisted, resetProducts, deleteProduct }}>
      {children}
    </ProductsContext.Provider>
  )
}

export function useProducts() {
  const ctx = useContext(ProductsContext)
  if (!ctx) return { products: [], setProducts: () => {}, resetProducts: () => {}, deleteProduct: () => {} }
  return ctx
}
