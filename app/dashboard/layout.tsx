'use client'

import { useEffect } from 'react'
import { SidebarProvider, useSidebar } from '@/lib/sidebar-context'
import { ProductsProvider } from '@/lib/products-context'
import { TransactionsProvider } from '@/lib/transactions-context'
import { CustomersProvider } from '@/lib/customers-context'
import { IngredientsProvider } from '@/lib/ingredients-context'
import { useAuth } from '@/lib/auth-context'
import { setScriptUrl } from '@/lib/sheets'
import { Sidebar } from '@/components/layout/sidebar'
import { cn } from '@/lib/utils'

function DashboardInner({ children }: { children: React.ReactNode }) {
  const { isOpen, close } = useSidebar()
  const { user } = useAuth()

  // Point all sheet writes at the authenticated store's Apps Script deployment
  useEffect(() => {
    setScriptUrl(user?.googleScriptUrl ?? '')
  }, [user?.googleScriptUrl])

  return (
    <div className="flex h-screen overflow-hidden bg-surface-50">

      {/* ── Mobile backdrop ────────────────────────────────────────────── */}
      <div
        className={cn(
          'fixed inset-0 z-20 bg-black/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={close}
        aria-hidden="true"
      />

      {/* ── Sidebar ────────────────────────────────────────────────────── */}
      {/* Mobile: slide-in overlay. Desktop: always in flow. */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-30 transition-transform duration-300 ease-in-out',
          'lg:relative lg:z-auto lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <Sidebar />
      </div>

      {/* ── Main content ───────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {children}
      </div>

    </div>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <TransactionsProvider>
      <ProductsProvider>
        <IngredientsProvider>
          <CustomersProvider>
            <SidebarProvider>
              <DashboardInner>{children}</DashboardInner>
            </SidebarProvider>
          </CustomersProvider>
        </IngredientsProvider>
      </ProductsProvider>
    </TransactionsProvider>
  )
}
