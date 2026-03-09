'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { Order } from '@/lib/types'

interface TransactionsContextValue {
  transactions: Order[]
  addTransaction: (order: Order) => void
  resetTransactions: () => void
}

const TransactionsContext = createContext<TransactionsContextValue | null>(null)

const ORDERS_KEY = 'nexpos_orders'

export function TransactionsProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Order[]>([])

  // Load persisted orders after mount (avoids SSR mismatch)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(ORDERS_KEY)
      if (stored) {
        const parsed: Order[] = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) setTransactions(parsed)
      }
    } catch {}
  }, [])

  const addTransaction = useCallback((order: Order) => {
    setTransactions(prev => {
      const next = [order, ...prev]
      try { localStorage.setItem(ORDERS_KEY, JSON.stringify(next)) } catch {}
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
  if (!ctx) throw new Error('useTransactions must be used inside TransactionsProvider')
  return ctx
}
