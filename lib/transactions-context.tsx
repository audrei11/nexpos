'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { Order, OrderItem, PaymentMethod, OrderStatus } from '@/lib/types'
import { fetchFromSheetsProxy } from '@/lib/sheets'
import { readUserStorage, writeUserStorage } from '@/lib/storage'


interface TransactionsContextValue {
  transactions: Order[]
  addTransaction: (order: Order) => void
  resetTransactions: () => void
}

const TransactionsContext = createContext<TransactionsContextValue | null>(null)

const ORDERS_BASE = 'orders'

function mapRowToOrder(row: Record<string, unknown>): Order | null {
  const id = String(row.id ?? row.transaction_id ?? '')
  if (!id) return null

  let items: OrderItem[] = []
  if (Array.isArray(row.items)) {
    items = (row.items as Record<string, unknown>[]).map(i => ({
      productId:   String(i.product_id ?? i.productId ?? ''),
      productName: String(i.product_name ?? i.productName ?? ''),
      quantity:    Number(i.quantity) || 0,
      unitPrice:   Number(i.unit_price ?? i.unitPrice) || 0,
      discount:    Number(i.discount) || 0,
      total:       Number(i.subtotal ?? i.total) || 0,
    }))
  }

  const validPayment: PaymentMethod[] = ['cash', 'card', 'mobile', 'credit']
  const pm = String(row.payment_method ?? row.paymentMethod ?? 'cash') as PaymentMethod
  const validStatus: OrderStatus[] = ['pending', 'completed', 'refunded', 'cancelled']
  const st = String(row.status ?? 'completed') as OrderStatus

  return {
    id,
    orderNumber: String(row.orderNumber ?? row.order_number ?? id),
    items,
    subtotal:       Number(row.subtotal) || 0,
    discount:       Number(row.discount_amount ?? row.discount) || 0,
    tax:            Number(row.tax_amount ?? row.tax) || 0,
    total:          Number(row.total) || 0,
    amountTendered: row.amount_tendered != null ? Number(row.amount_tendered) : undefined,
    change:         row.change_given    != null ? Number(row.change_given)    : undefined,
    paymentMethod:  validPayment.includes(pm) ? pm : 'cash',
    status:         validStatus.includes(st)  ? st : 'completed',
    cashierName:    row.cashier ?? row.cashierName ? String(row.cashier ?? row.cashierName) : undefined,
    customerId:     row.customer_id    ? String(row.customer_id)    : undefined,
    customerName:   row.customer_name  ? String(row.customer_name)  : undefined,
    note:           row.note           ? String(row.note)           : undefined,
    createdAt:      String(row.date ?? row.createdAt ?? new Date().toISOString()),
    updatedAt:      String(row.updated_at ?? row.updatedAt ?? row.date ?? new Date().toISOString()),
  }
}

export function TransactionsProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Order[]>([])

  useEffect(() => {
    let cancelled = false

    async function init() {
      // 1. Load from localStorage first (instant)
      let loaded: Order[] = []
      try {
        const stored = readUserStorage(ORDERS_BASE)
        if (stored) {
          const parsed: Order[] = JSON.parse(stored)
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Auto-remove any leftover seed/fake transactions
            const cleaned = parsed.filter((o: Order) => !o.id.startsWith('seed-'))
            if (cleaned.length !== parsed.length) {
              try { writeUserStorage(ORDERS_BASE, JSON.stringify(cleaned)) } catch {}
            }
            loaded = cleaned
          }
        }
      } catch {}

      if (!cancelled) setTransactions(loaded)

      // 2. Fetch from Google Sheets and merge
      try {
        const rows = await fetchFromSheetsProxy('getTransactions')
        if (cancelled || !rows.length) return

        const sheetsOrders = rows
          .map(mapRowToOrder)
          .filter((o): o is Order => o !== null)

        if (cancelled || !sheetsOrders.length) return

        setTransactions(prev => {
          const existingIds = new Set(prev.map(o => o.id))
          // Add orders from Sheets that aren't already in local storage
          const newFromSheets = sheetsOrders.filter(o => !existingIds.has(o.id))
          if (!newFromSheets.length) return prev
          const merged = [...newFromSheets, ...prev]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          // Persist merged list so future refreshes don't need Sheets
          try { writeUserStorage(ORDERS_BASE, JSON.stringify(merged)) } catch {}
          return merged
        })
      } catch { /* GAS unavailable — keep local data */ }
    }

    init()
    return () => { cancelled = true }
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
