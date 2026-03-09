'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { Ingredient } from '@/lib/types'
import { fetchFromSheetsProxy } from '@/lib/sheets'
import {
  saveIngredientImage,
  deleteIngredientImage,
  loadAllIngredientImages,
} from '@/lib/ingredient-image-store'

interface IngredientsContextValue {
  ingredients: Ingredient[]
  setIngredients: React.Dispatch<React.SetStateAction<Ingredient[]>>
  resetIngredients: () => void
}

const IngredientsContext = createContext<IngredientsContextValue | null>(null)

const STORAGE_KEY = 'nexpos_ingredients'

// ─── Helpers ──────────────────────────────────────────────────────────────

function mapRowToIngredient(row: Record<string, unknown>): Ingredient {
  return {
    id:          String(row.id ?? ''),
    name:        String(row.name ?? ''),
    unit:        String(row.unit ?? ''),
    stock:       Number(row.stock) || 0,
    minStock:    Number(row.min_stock) || 0,
    costPerUnit: Number(row.cost_per_unit) || 0,
    createdAt:   String(row.created_at ?? new Date().toISOString()),
    updatedAt:   String(row.updated_at ?? new Date().toISOString()),
  }
}

/**
 * Strip base64 imageUrl from each ingredient before writing to localStorage.
 * Images are stored separately in IndexedDB (nexpos_ingredient_images).
 * External URLs (Google Drive, etc.) are kept as-is in localStorage.
 */
function stripBase64Images(list: Ingredient[]): Ingredient[] {
  return list.map(ing => {
    if (ing.imageUrl?.startsWith('data:')) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { imageUrl: _, ...rest } = ing
      return rest
    }
    return ing
  })
}

// ─── Provider ─────────────────────────────────────────────────────────────

export function IngredientsProvider({ children }: { children: React.ReactNode }) {
  // Initialize from localStorage synchronously (images will be hydrated after mount)
  const [ingredients, rawSetIngredients] = useState<Ingredient[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  /**
   * Persisted setter — routes images to IndexedDB, everything else to localStorage.
   * This is what the rest of the app should call (exposed as `setIngredients`).
   */
  const setIngredients: React.Dispatch<React.SetStateAction<Ingredient[]>> = useCallback(
    (action) => {
      rawSetIngredients(prev => {
        const next = typeof action === 'function' ? action(prev) : action

        // Manage IndexedDB for each ingredient
        next.forEach(ing => {
          if (ing.imageUrl?.startsWith('data:')) {
            // Save base64 image to IndexedDB
            saveIngredientImage(ing.id, ing.imageUrl).catch(() => {})
          } else if (!ing.imageUrl) {
            // Image was explicitly cleared — remove from IndexedDB to prevent stale restore
            deleteIngredientImage(ing.id).catch(() => {})
          }
          // External URL (Google Drive etc.) → keep in localStorage, no IndexedDB action needed
        })

        // Persist to localStorage WITHOUT base64 images (stay under 5 MB limit)
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(stripBase64Images(next)))
        } catch {
          // Storage quota exceeded — data is still in memory and IndexedDB
        }

        return next
      })
    },
    []
  )

  // ── Effect 1: hydrate ingredient images from IndexedDB after mount ──────
  // localStorage only has text data; images live in IndexedDB.
  // This runs once and re-attaches the saved base64 URLs to in-memory state.
  useEffect(() => {
    loadAllIngredientImages().then(idbImages => {
      if (!Object.keys(idbImages).length) return
      rawSetIngredients(prev => {
        let changed = false
        const updated = prev.map(ing => {
          if (!ing.imageUrl && idbImages[ing.id]) {
            changed = true
            return { ...ing, imageUrl: idbImages[ing.id] }
          }
          return ing
        })
        return changed ? updated : prev
      })
    }).catch(() => { /* IndexedDB unavailable — no images shown */ })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Effect 2: fetch from Sheets on mount ────────────────────────────────
  // Sheets is the source of truth for stock / name / unit / cost.
  // Merge strategy:
  //   • If the ingredient exists locally: update numeric/text fields from Sheets,
  //     keep local emoji and imageUrl (not stored in Sheets).
  //   • If the ingredient is only in Sheets: add it locally.
  //   • If the ingredient is only local (newly added): keep it untouched.
  useEffect(() => {
    fetchFromSheetsProxy('getIngredients').then(rows => {
      if (!rows.length) return
      const sheetsIngredients = rows.map(mapRowToIngredient).filter(i => i.id)

      setIngredients(prev => {
        const merged = [...prev]

        for (const sheetsIng of sheetsIngredients) {
          const localIdx = merged.findIndex(l => l.id === sheetsIng.id)
          if (localIdx >= 0) {
            // Update from Sheets but preserve local-only fields
            merged[localIdx] = {
              ...sheetsIng,
              emoji:    merged[localIdx].emoji,
              imageUrl: merged[localIdx].imageUrl,
            }
          } else {
            // New ingredient from Sheets not yet in local storage — add it
            merged.push(sheetsIng)
          }
          // Note: ingredients only in local (not in Sheets) are left untouched
        }

        return merged
      })
    }).catch(() => { /* GAS unavailable — keep localStorage data */ })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const resetIngredients = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
    rawSetIngredients([])
  }, [])

  return (
    <IngredientsContext.Provider value={{ ingredients, setIngredients, resetIngredients }}>
      {children}
    </IngredientsContext.Provider>
  )
}

export function useIngredients() {
  const ctx = useContext(IngredientsContext)
  if (!ctx) throw new Error('useIngredients must be used inside IngredientsProvider')
  return ctx
}
