'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { IngredientUsageEntry } from '@/lib/types'
import { fetchFromSheetsProxy } from '@/lib/sheets'
import { readUserStorage, writeUserStorage } from '@/lib/storage'

interface IngredientUsageContextValue {
  usageEntries: IngredientUsageEntry[]
  addUsageEntries: (entries: IngredientUsageEntry[]) => void
}

const IngredientUsageContext = createContext<IngredientUsageContextValue | null>(null)

const USAGE_BASE = 'ingredient_usage'

function mapRowToUsageEntry(row: Record<string, unknown>): IngredientUsageEntry | null {
  const id = String(row.id ?? '')
  const ingredient_id = String(row.ingredient_id ?? '')
  if (!id || !ingredient_id) return null
  return {
    id,
    ingredient_id,
    ingredient_name: String(row.ingredient_name ?? ''),
    quantity_used:   Number(row.quantity_used) || 0,
    unit:            String(row.unit ?? ''),
    transaction_id:  String(row.transaction_id ?? ''),
    product_id:      String(row.product_id ?? ''),
    product_name:    String(row.product_name ?? ''),
    timestamp:       String(row.timestamp ?? new Date().toISOString()),
  }
}

export function IngredientUsageProvider({ children }: { children: React.ReactNode }) {
  // Start with [] to avoid SSR/hydration mismatch (localStorage isn't available server-side).
  // Load persisted entries after mount — same pattern as TransactionsProvider.
  const [usageEntries, setUsageEntries] = useState<IngredientUsageEntry[]>([])

  // Effect 1: load from localStorage after mount
  useEffect(() => {
    try {
      const stored = readUserStorage(USAGE_BASE)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) setUsageEntries(parsed)
      }
    } catch {}
  }, [])

  // Effect 2: fetch from Sheets on mount and merge (Sheets is the durable source of truth)
  // Only adds entries not already in localStorage — never overwrites or removes existing data.
  useEffect(() => {
    fetchFromSheetsProxy('getIngredientUsage').then(rows => {
      if (!rows.length) return
      const sheetsEntries = rows
        .map(mapRowToUsageEntry)
        .filter((e): e is IngredientUsageEntry => e !== null)
      if (!sheetsEntries.length) return

      setUsageEntries(prev => {
        const localIds = new Set(prev.map(e => e.id))
        const newFromSheets = sheetsEntries.filter(e => !localIds.has(e.id))
        if (newFromSheets.length === 0) return prev
        const merged = [...prev, ...newFromSheets]
        try { writeUserStorage(USAGE_BASE, JSON.stringify(merged)) } catch {}
        return merged
      })
    }).catch(() => { /* GAS unavailable — keep localStorage data */ })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const addUsageEntries = useCallback((entries: IngredientUsageEntry[]) => {
    setUsageEntries(prev => {
      const next = [...prev, ...entries]
      writeUserStorage(USAGE_BASE, JSON.stringify(next))
      return next
    })
  }, [])

  return (
    <IngredientUsageContext.Provider value={{ usageEntries, addUsageEntries }}>
      {children}
    </IngredientUsageContext.Provider>
  )
}

export function useIngredientUsage() {
  const ctx = useContext(IngredientUsageContext)
  if (!ctx) return { usageEntries: [], addUsageEntries: () => {} }
  return ctx
}
