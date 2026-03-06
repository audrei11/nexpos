'use client'

import { useState, useEffect, useRef } from 'react'
import { X, User, Mail, Phone, FileText, Loader2 } from 'lucide-react'
import type { Customer } from '@/lib/types'

interface CustomerModalProps {
  open: boolean
  onClose: () => void
  onSave: (customer: Customer) => void
}

interface FormState {
  name: string
  email: string
  phone: string
  notes: string
}

const EMPTY: FormState = { name: '', email: '', phone: '', notes: '' }

export function CustomerModal({ open, onClose, onSave }: CustomerModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [errors, setErrors] = useState<Partial<FormState>>({})
  const [saving, setSaving] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  // Reset form whenever modal opens
  useEffect(() => {
    if (open) {
      setForm(EMPTY)
      setErrors({})
      setSaving(false)
      setTimeout(() => nameRef.current?.focus(), 50)
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  function set(field: keyof FormState, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }))
  }

  function validate(): boolean {
    const errs: Partial<FormState> = {}
    if (!form.name.trim()) errs.name = 'Name is required'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'Enter a valid email address'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    // Simulate brief async (ready for real API call)
    await new Promise(r => setTimeout(r, 300))

    const customer: Customer = {
      id: `cust_${Date.now()}`,
      name: form.name.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      notes: form.notes.trim() || undefined,
      totalPurchases: 0,
      createdAt: new Date().toISOString(),
    }

    onSave(customer)
    setSaving(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient shadow-brand">
              <User className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-surface-900">Add Customer</h2>
              <p className="text-xs text-surface-400">Fill in the customer details below</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-surface-400 hover:bg-surface-100 hover:text-surface-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-surface-700 mb-1.5">
              Full Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
              <input
                ref={nameRef}
                type="text"
                placeholder="e.g. Juan dela Cruz"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                className={`w-full h-10 pl-9 pr-3 rounded-xl border text-sm placeholder:text-surface-400 focus:outline-none focus:ring-2 transition-all ${
                  errors.name
                    ? 'border-red-400 focus:ring-red-500/20 focus:border-red-400'
                    : 'border-surface-200 focus:ring-brand-500/20 focus:border-brand-400'
                }`}
              />
            </div>
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-surface-700 mb-1.5">
              Email Address <span className="text-surface-400 font-normal">(optional)</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
              <input
                type="email"
                placeholder="e.g. juan@email.com"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                className={`w-full h-10 pl-9 pr-3 rounded-xl border text-sm placeholder:text-surface-400 focus:outline-none focus:ring-2 transition-all ${
                  errors.email
                    ? 'border-red-400 focus:ring-red-500/20 focus:border-red-400'
                    : 'border-surface-200 focus:ring-brand-500/20 focus:border-brand-400'
                }`}
              />
            </div>
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-semibold text-surface-700 mb-1.5">
              Phone Number <span className="text-surface-400 font-normal">(optional)</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
              <input
                type="tel"
                placeholder="e.g. 09171234567"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                className="w-full h-10 pl-9 pr-3 rounded-xl border border-surface-200 text-sm placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-surface-700 mb-1.5">
              Notes <span className="text-surface-400 font-normal">(optional)</span>
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-4 w-4 text-surface-400" />
              <textarea
                rows={3}
                placeholder="Any additional notes about this customer..."
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-surface-200 text-sm placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all resize-none"
              />
            </div>
          </div>

          {/* Created date (display only) */}
          <div className="flex items-center gap-2 px-3 py-2 bg-surface-50 rounded-xl">
            <span className="text-xs text-surface-400">Created date:</span>
            <span className="text-xs font-medium text-surface-600">
              {new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 rounded-xl border border-surface-200 text-sm font-semibold text-surface-600 hover:bg-surface-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 h-10 rounded-xl bg-brand-gradient text-sm font-semibold text-white shadow-brand hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Customer'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
