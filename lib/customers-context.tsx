'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import type { Customer } from '@/lib/types'

interface CustomersContextValue {
  customers: Customer[]
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>
  resetCustomers: () => void
}

const CustomersContext = createContext<CustomersContextValue | null>(null)

export function CustomersProvider({ children }: { children: React.ReactNode }) {
  const [customers, setCustomers] = useState<Customer[]>([])

  const resetCustomers = useCallback(() => {
    setCustomers([])
  }, [])

  return (
    <CustomersContext.Provider value={{ customers, setCustomers, resetCustomers }}>
      {children}
    </CustomersContext.Provider>
  )
}

export function useCustomers() {
  const ctx = useContext(CustomersContext)
  if (!ctx) throw new Error('useCustomers must be used inside CustomersProvider')
  return ctx
}
