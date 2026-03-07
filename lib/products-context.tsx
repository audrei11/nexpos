'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { Product } from '@/lib/types'
import { fetchFromSheetsProxy } from '@/lib/sheets'

interface ProductsContextValue {
  products: Product[]
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>
  resetProducts: () => void
}

const ProductsContext = createContext<ProductsContextValue | null>(null)

const STORAGE_KEY = 'nexpos_products'
const IMAGES_KEY = 'nexpos_product_images'

function loadStoredImages(): Record<string, string> {
  try {
    const raw = localStorage.getItem(IMAGES_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveStoredImages(images: Record<string, string>) {
  try {
    localStorage.setItem(IMAGES_KEY, JSON.stringify(images))
  } catch {
    // quota exceeded — nothing we can do for the image store
  }
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
    createdAt:   String(row.created_at ?? new Date().toISOString()),
    updatedAt:   String(row.updated_at ?? new Date().toISOString()),
  }
}

export function ProductsProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return []
      const parsed: Product[] = JSON.parse(stored)
      const images = loadStoredImages()
      return parsed.map(p => {
        const migratedUrl = p.imageUrl ? migrateImageUrl(p.imageUrl) : p.imageUrl
        // Restore base64 image from the separate image store if product has none
        const imageUrl = migratedUrl ?? images[p.id] ?? undefined
        return { ...p, imageUrl }
      })
    } catch {
      return []
    }
  })

  // Persist to localStorage whenever products change
  const setProductsPersisted: React.Dispatch<React.SetStateAction<Product[]>> = useCallback(
    (action) => {
      setProducts(prev => {
        const next = typeof action === 'function' ? action(prev) : action

        // Extract base64 images into a separate store so they don't compete
        // with product metadata for the same 5MB quota
        const images = loadStoredImages()
        let imagesChanged = false
        const productsToStore = next.map(p => {
          if (p.imageUrl?.startsWith('data:')) {
            images[p.id] = p.imageUrl
            imagesChanged = true
            // Strip data URL from product record — restored from images store on load
            return { ...p, imageUrl: undefined }
          }
          return p
        })
        if (imagesChanged) saveStoredImages(images)

        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(productsToStore))
        } catch {
          // Still quota exceeded (non-image data too large) — best-effort
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(productsToStore))
          } catch {}
        }
        return next
      })
    },
    []
  )

  // On mount: fetch from Sheets and merge (Sheets = source of truth for product data,
  // localStorage = source of truth for recipes which aren't stored in Sheets)
  useEffect(() => {
    fetchFromSheetsProxy('getProducts').then(rows => {
      if (!rows.length) return
      const sheetsProducts = rows
        .map(mapRowToProduct)
        .filter(p => p.id) // skip rows with no id

      setProductsPersisted(prev => {
        const images = loadStoredImages()
        // Merge Sheets products, preserving local-only fields
        const merged = sheetsProducts.map(sp => {
          const local = prev.find(p => p.id === sp.id)
          // Decide which imageUrl to use:
          // - Local has a data: URL in memory → keep it (base64 lives locally only)
          // - Local has a data: URL in image store → restore it
          // - Sheets has a real URL → use it (authoritative)
          // - Fall back to whatever local has
          const localBase64 = local?.imageUrl?.startsWith('data:')
            ? local.imageUrl
            : images[sp.id]
          const imageUrl = localBase64 ?? sp.imageUrl ?? local?.imageUrl
          return {
            ...sp,
            ...(imageUrl ? { imageUrl } : {}),
            // Preserve recipe — Sheets doesn't store it
            ...(local?.recipe ? { recipe: local.recipe } : {}),
          }
        })
        // Keep locally-added products that haven't synced to Sheets yet
        const localOnly = prev.filter(p => !sheetsProducts.find(sp => sp.id === p.id))
        return [...merged, ...localOnly]
      })
    }).catch(() => { /* GAS unavailable — keep localStorage data */ })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const resetProducts = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
    try { localStorage.removeItem(IMAGES_KEY) } catch {}
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
