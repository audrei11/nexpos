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
  // Start with empty array to avoid SSR/client hydration mismatch.
  // localStorage is loaded after mount via useEffect below.
  const [products, setProducts] = useState<Product[]>([])

  // Persist to localStorage on every products state change
  const setProductsPersisted: React.Dispatch<React.SetStateAction<Product[]>> = useCallback(
    (action) => {
      setProducts(prev => {
        const next = typeof action === 'function' ? action(prev) : action
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        } catch {
          // Quota exceeded — retry without base64 images (Drive URLs are preserved)
          try {
            const stripped = next.map(p =>
              p.imageUrl?.startsWith('data:') ? { ...p, imageUrl: undefined } : p
            )
            localStorage.setItem(STORAGE_KEY, JSON.stringify(stripped))
          } catch {}
        }
        return next
      })
    },
    []
  )

  // Load from localStorage after mount (runs only on client, no SSR mismatch)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed: Product[] = JSON.parse(stored)
        setProducts(parsed.map(p => ({
          ...p,
          imageUrl: p.imageUrl ? migrateImageUrl(p.imageUrl) : p.imageUrl,
        })))
      }
    } catch {}
  }, [])

  // On mount: fetch from Sheets and merge
  useEffect(() => {
    fetchFromSheetsProxy('getProducts').then(rows => {
      if (!rows.length) return
      const sheetsProducts = rows.map(mapRowToProduct).filter(p => p.id)

      setProductsPersisted(prev => {
        const merged = sheetsProducts.map(sp => {
          const local = prev.find(p => p.id === sp.id)
          // Local imageUrl wins if it's a data: URL (base64 never sent to Sheets)
          // Otherwise prefer Sheets URL, fall back to local
          const imageUrl = local?.imageUrl?.startsWith('data:')
            ? local.imageUrl
            : sp.imageUrl ?? local?.imageUrl
          return {
            ...sp,
            ...(imageUrl ? { imageUrl } : {}),
            ...(local?.recipe ? { recipe: local.recipe } : {}),
          }
        })
        const localOnly = prev.filter(p => !sheetsProducts.find(sp => sp.id === p.id))
        return [...merged, ...localOnly]
      })
    }).catch(() => { /* GAS unavailable — keep localStorage data */ })
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
