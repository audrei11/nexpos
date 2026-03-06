'use client'

import { useState } from 'react'
import { Search, Plus, Mail, Phone, ShoppingBag, Calendar } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { CustomerModal } from '@/components/customers/customer-modal'
import { formatDate, getInitials } from '@/lib/utils'
import type { Customer } from '@/lib/types'
import { saveCustomerToSheets } from '@/lib/sheets'
import { useCustomers } from '@/lib/customers-context'
import toast from 'react-hot-toast'

export default function CustomersPage() {
  const { customers, setCustomers } = useCustomers()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)

  const filtered = customers.filter(c =>
    !search.trim() ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  )

  function handleSave(customer: Customer) {
    setCustomers(prev => [customer, ...prev])
    setShowModal(false)
    saveCustomerToSheets({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      notes: customer.notes,
      total_purchases: customer.totalPurchases,
      created_at: customer.createdAt,
    }).catch(console.error)
    toast.success(`${customer.name} added successfully!`)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Customers"
        subtitle={`${customers.length} customers total`}
        actions={
          <button
            onClick={() => setShowModal(true)}
            className="flex h-9 items-center gap-2 rounded-xl bg-brand-gradient px-4 text-sm font-semibold text-white shadow-brand hover:brightness-110 transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Customer
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
            <input
              type="text" placeholder="Search customers..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-xl border border-surface-200 bg-white text-sm placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map(customer => (
            <div key={customer.id}
              className="bg-white rounded-2xl border border-surface-100 shadow-card p-5 hover:shadow-card-md hover:border-brand-100 transition-all duration-200 cursor-pointer"
              onClick={() => toast.success(`Viewing ${customer.name}'s profile`)}
            >
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-sm font-bold text-white shadow-brand">
                  {getInitials(customer.name)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-surface-900 truncate">{customer.name}</p>
                  {customer.email && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Mail className="h-3 w-3 text-surface-400 flex-shrink-0" />
                      <span className="text-xs text-surface-500 truncate">{customer.email}</span>
                    </div>
                  )}
                  {customer.phone && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Phone className="h-3 w-3 text-surface-400 flex-shrink-0" />
                      <span className="text-xs text-surface-500">{customer.phone}</span>
                    </div>
                  )}
                  {customer.notes && (
                    <p className="mt-1 text-xs text-surface-400 truncate">{customer.notes}</p>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-surface-50 flex items-center gap-4">
                <div className="flex items-center gap-1.5 flex-1">
                  <ShoppingBag className="h-3.5 w-3.5 text-surface-400" />
                  <span className="text-xs font-semibold text-surface-700">
                    {customer.totalPurchases ?? 0} purchases
                  </span>
                </div>
                {customer.createdAt && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-surface-400" />
                    <span className="text-xs text-surface-500">
                      Since {formatDate(customer.createdAt, { month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-20 text-surface-400">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-100">
              <Search className="h-7 w-7 opacity-40" />
            </div>
            <p className="text-sm font-medium">No customers found</p>
          </div>
        )}
      </div>

      <CustomerModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
      />
    </div>
  )
}
