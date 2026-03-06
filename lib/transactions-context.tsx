'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import type { Order } from '@/lib/types'

interface TransactionsContextValue {
  transactions: Order[]
  addTransaction: (order: Order) => void
  resetTransactions: () => void
}

const TransactionsContext = createContext<TransactionsContextValue | null>(null)

export function TransactionsProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Order[]>([])

  const addTransaction = useCallback((order: Order) => {
    setTransactions(prev => [order, ...prev])
  }, [])

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
