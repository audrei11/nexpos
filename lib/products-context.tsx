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
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return []
      const parsed: Product[] = JSON.parse(stored)
      return parsed.map(p => ({
        ...p,
        imageUrl: p.imageUrl ? migrateImageUrl(p.imageUrl) : p.imageUrl,
      }))
    } catch {
      return []
    }
  })

  // Persist to localStorage whenever products change
  const setProductsPersisted: React.Dispatch<React.SetStateAction<Product[]>> = useCallback(
    (action) => {
      setProducts(prev => {
        const next = typeof action === 'function' ? action(prev) : action
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
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
        const merged = sheetsProducts.map(sp => {
          const local = prev.find(p => p.id === sp.id)
          // Preserve recipe from localStorage since Sheets doesn't store it
          return local?.recipe ? { ...sp, recipe: local.recipe } : sp
        })
        return merged
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
