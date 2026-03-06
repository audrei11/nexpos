'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { Ingredient } from '@/lib/types'
import { fetchFromSheetsProxy } from '@/lib/sheets'

interface IngredientsContextValue {
  ingredients: Ingredient[]
  setIngredients: React.Dispatch<React.SetStateAction<Ingredient[]>>
  resetIngredients: () => void
}

const IngredientsContext = createContext<IngredientsContextValue | null>(null)

const STORAGE_KEY = 'nexpos_ingredients'

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

export function IngredientsProvider({ children }: { children: React.ReactNode }) {
  const [ingredients, setIngredients] = useState<Ingredient[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  const setIngredientsPersisted: React.Dispatch<React.SetStateAction<Ingredient[]>> = useCallback(
    (action) => {
      setIngredients(prev => {
        const next = typeof action === 'function' ? action(prev) : action
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
        return next
      })
    },
    []
  )

  // On mount: fetch from Sheets (source of truth for ingredient stock)
  useEffect(() => {
    fetchFromSheetsProxy('getIngredients').then(rows => {
      if (!rows.length) return
      const sheetsIngredients = rows
        .map(mapRowToIngredient)
        .filter(i => i.id)
      setIngredientsPersisted(sheetsIngredients)
    }).catch(() => { /* GAS unavailable — keep localStorage data */ })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const resetIngredients = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
    setIngredients([])
  }, [])

  return (
    <IngredientsContext.Provider value={{ ingredients, setIngredients: setIngredientsPersisted, resetIngredients }}>
      {children}
    </IngredientsContext.Provider>
  )
}

export function useIngredients() {
  const ctx = useContext(IngredientsContext)
  if (!ctx) throw new Error('useIngredients must be used inside IngredientsProvider')
  return ctx
}
