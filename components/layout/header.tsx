'use client'

import { Bell, Search, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  className?: string
}

export function Header({ title, subtitle, actions, className }: HeaderProps) {
  return (
    <header
      className={cn(
        'flex h-16 items-center justify-between gap-4',
        'border-b border-surface-100 bg-white/80 backdrop-blur-sm',
        'px-6',
        className
      )}
    >
      {/* Title */}
      <div className="min-w-0">
        <h1 className="text-[17px] font-semibold text-surface-900 truncate">{title}</h1>
        {subtitle && (
          <p className="text-xs text-surface-500 truncate">{subtitle}</p>
        )}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {actions}

        {/* Search trigger */}
        <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-surface-200 bg-white text-surface-400 transition-all hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600">
          <Search className="h-4 w-4" />
        </button>

        {/* Notifications */}
        <button className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-surface-200 bg-white text-surface-400 transition-all hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600">
          <Bell className="h-4 w-4" />
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
        </button>

        {/* Help */}
        <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-surface-200 bg-white text-surface-400 transition-all hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600">
          <HelpCircle className="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}
