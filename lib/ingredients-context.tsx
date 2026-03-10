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
  /** Ingredients where minStock > 0 and stock <= minStock (low or out). */
  lowStockIngredients: Ingredient[]
}

const IngredientsContext = createContext<IngredientsContextValue | null>(null)

const STORAGE_KEY = 'nexpos_ingredients'
const BACKUP_KEY  = 'nexpos_ingredients_backup'

/** Write ingredients to both the primary and backup localStorage keys. */
function persistIngredients(list: Ingredient[]): void {
  const json = JSON.stringify(stripBase64Images(list))
  try { localStorage.setItem(STORAGE_KEY, json) } catch {}
  try { localStorage.setItem(BACKUP_KEY,  json) } catch {}
}

// ─── Starter seed ─────────────────────────────────────────────────────────
// Generated once when nexpos_ingredients is absent or empty.
// Uses deterministic IDs so the seed is idempotent and never duplicated.

function createSeedIngredients(): Ingredient[] {
  const now = new Date().toISOString()
  const m = (id: string, name: string, unit: string, emoji: string): Ingredient => ({
    id, name, unit, stock: 0, minStock: 0, costPerUnit: 0, emoji,
    createdAt: now, updatedAt: now,
  })
  return [
    // ── Coffee / Drink ──────────────────────────────────────────────────
    m('ing_seed_001', 'Fresh Milk',        'L',   '🥛'),
    m('ing_seed_002', 'Evaporated Milk',   'L',   '🥛'),
    m('ing_seed_003', 'Condensed Milk',    'L',   '🥛'),
    m('ing_seed_004', 'Fructose Syrup',    'L',   '🍯'),
    m('ing_seed_005', 'Sugar Syrup',       'L',   '🍯'),
    m('ing_seed_006', 'Coffee Beans',      'g',   '☕'),
    m('ing_seed_007', 'Matcha Powder',     'g',   '🍵'),
    m('ing_seed_008', 'Tea Leaves',        'g',   '🫖'),
    m('ing_seed_009', 'Chocolate Syrup',   'L',   '🍫'),
    m('ing_seed_010', 'Strawberry Syrup',  'L',   '🍓'),
    m('ing_seed_011', 'Caramel Syrup',     'L',   '🍮'),
    m('ing_seed_012', 'Vanilla Syrup',     'L',   '🍦'),
    m('ing_seed_013', 'Almond Syrup',      'L',   '🌰'),
    m('ing_seed_014', 'Sea Salt Foam Base','L',   '🫧'),
    m('ing_seed_015', 'Whipped Cream',     'kg',  '🍦'),
    m('ing_seed_016', 'Ice',               'kg',  '🧊'),
    m('ing_seed_017', 'Water',             'L',   '💧'),
    // ── Food / Bakery ───────────────────────────────────────────────────
    m('ing_seed_018', 'Flour / Waffle Mix','kg',  '🌾'),
    m('ing_seed_019', 'Baking Powder',     'g',   '🥄'),
    m('ing_seed_020', 'Butter',            'kg',  '🧈'),
    m('ing_seed_021', 'Egg',               'pcs', '🥚'),
    m('ing_seed_022', 'Bread',             'pcs', '🍞'),
    m('ing_seed_023', 'Cheese',            'pcs', '🧀'),
    m('ing_seed_024', 'Ham',               'pcs', '🥩'),
    m('ing_seed_025', 'Mayonnaise',        'L',   '🫙'),
    m('ing_seed_026', 'Lettuce',           'pcs', '🥬'),
    m('ing_seed_027', 'Tomato',            'pcs', '🍅'),
    m('ing_seed_028', 'Cucumber',          'pcs', '🥒'),
    // ── Meal ────────────────────────────────────────────────────────────
    m('ing_seed_029', 'Rice',              'kg',  '🍚'),
    m('ing_seed_030', 'Sausage',           'pcs', '🌭'),
    m('ing_seed_031', 'Bacon',             'pcs', '🥓'),
    m('ing_seed_032', 'Chicken Fillet',    'pcs', '🍗'),
    m('ing_seed_033', 'Cooking Oil',       'L',   '🫙'),
    m('ing_seed_034', 'Onion',             'kg',  '🧅'),
    m('ing_seed_035', 'Garlic',            'kg',  '🧄'),
    m('ing_seed_036', 'Salt',              'kg',  '🧂'),
    m('ing_seed_037', 'Pepper',            'g',   '🌶️'),
    m('ing_seed_038', 'Soy Sauce',         'L',   '🍶'),
    m('ing_seed_039', 'Ketchup',           'L',   '🍅'),
    m('ing_seed_040', 'Gravy Mix',         'kg',  '🫙'),
    // ── Toppings / Flavorings ────────────────────────────────────────────
    m('ing_seed_041', 'Cocoa Powder',      'g',   '🍫'),
    m('ing_seed_042', 'Cinnamon Powder',   'g',   '🌿'),
    m('ing_seed_043', 'Powdered Sugar',    'g',   '🍬'),
    m('ing_seed_044', 'Chocolate Chips',   'g',   '🍫'),
    m('ing_seed_045', 'Biscuit Crumbs',    'g',   '🍪'),
  ]
}

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
  // Initialize from localStorage synchronously (images will be hydrated after mount).
  // Seed only runs when nexpos_ingredients is absent or empty — never overwrites existing data.
  const [ingredients, rawSetIngredients] = useState<Ingredient[]>(() => {
    try {
      // Try primary key first, fall back to backup if primary is missing/empty
      const primary = localStorage.getItem(STORAGE_KEY)
      const raw = primary || localStorage.getItem(BACKUP_KEY)
      if (raw) {
        const parsed: Ingredient[] = JSON.parse(raw)
        if (parsed.length > 0) {
          console.log('Loaded ingredients:', parsed.length)
          // Ensure both keys are in sync on restore
          if (!primary) persistIngredients(parsed)
          return parsed
        }
      }
      // Only seed when both keys are absent or empty
      const seed = createSeedIngredients()
      console.log('Loaded ingredients:', seed.length, '(seeded)')
      persistIngredients(seed)
      return seed
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

        // Persist to both localStorage keys (backup included)
        persistIngredients(next)

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
    // Intentionally does NOT clear localStorage — data is never deleted from storage.
    rawSetIngredients([])
  }, [])

  const lowStockIngredients = ingredients.filter(
    i => i.minStock > 0 && i.stock <= i.minStock
  )

  return (
    <IngredientsContext.Provider value={{ ingredients, setIngredients, resetIngredients, lowStockIngredients }}>
      {children}
    </IngredientsContext.Provider>
  )
}

export function useIngredients() {
  const ctx = useContext(IngredientsContext)
  if (!ctx) throw new Error('useIngredients must be used inside IngredientsProvider')
  return ctx
}
