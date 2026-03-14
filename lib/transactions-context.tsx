'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { Order } from '@/lib/types'
import { readUserStorage, writeUserStorage } from '@/lib/storage'

interface TransactionsContextValue {
  transactions: Order[]
  addTransaction: (order: Order) => void
  resetTransactions: () => void
}

const TransactionsContext = createContext<TransactionsContextValue | null>(null)

const ORDERS_BASE = 'orders'

export function TransactionsProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Order[]>([])

  // Load persisted orders after mount (avoids SSR mismatch)
  useEffect(() => {
    try {
      const stored = readUserStorage(ORDERS_BASE)
      if (stored) {
        const parsed: Order[] = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) setTransactions(parsed)
      }
    } catch {}
  }, [])

  const addTransaction = useCallback((order: Order) => {
    setTransactions(prev => {
      const next = [order, ...prev]
      writeUserStorage(ORDERS_BASE, JSON.stringify(next))
      return next
    })
  }, [])

  // Clears the in-memory view only — localStorage history is intentionally preserved
  const resetTransactions = useCallback(() => {
    setTransactions([])
  }, [])

  return (
    <TransactionsContext.Provider value={{ transactions, addTransaction, resetTransactions }}>
      {children}
    </TransactionsContext.Provider>
  )
}

export function useTransactions() {
  const ctx = useContext(TransactionsContext)
  if (!ctx) return { transactions: [], addTransaction: () => {}, resetTransactions: () => {} }
  return ctx
}
