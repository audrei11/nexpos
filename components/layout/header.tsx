'use client'

import { Bell, Search, HelpCircle, Menu, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSidebar } from '@/lib/sidebar-context'
import { useAuth } from '@/lib/auth-context'

interface HeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  className?: string
}

export function Header({ title, subtitle, actions, className }: HeaderProps) {
  const { toggle } = useSidebar()
  const { user, logout } = useAuth()

  return (
    <header
      className={cn(
        'flex h-16 items-center justify-between gap-3',
        'border-b border-surface-100 bg-white/80 backdrop-blur-sm',
        'px-4 lg:px-6',
        className
      )}
    >
      {/* Left: hamburger (mobile) + title */}
      <div className="flex items-center gap-3 min-w-0">

        {/* Hamburger — mobile only */}
        <button
          onClick={toggle}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-surface-200 bg-white text-surface-500 transition-all hover:bg-brand-50 hover:border-brand-300 hover:text-brand-600 lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" />
        </button>

        {/* Title */}
        <div className="min-w-0">
          <h1 className="text-[16px] font-semibold text-surface-900 truncate">{title}</h1>
          {subtitle && (
            <p className="text-xs text-surface-500 truncate hidden sm:block">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {actions}

        {/* Search — hidden on smallest screens */}
        <button className="hidden sm:flex h-9 w-9 items-center justify-center rounded-xl border border-surface-200 bg-white text-surface-400 transition-all hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600">
          <Search className="h-4 w-4" />
        </button>

        {/* Notifications */}
        <button className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-surface-200 bg-white text-surface-400 transition-all hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600">
          <Bell className="h-4 w-4" />
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
        </button>

        {/* Help — hidden on mobile */}
        <button className="hidden md:flex h-9 w-9 items-center justify-center rounded-xl border border-surface-200 bg-white text-surface-400 transition-all hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600">
          <HelpCircle className="h-4 w-4" />
        </button>

        {/* Divider */}
        {user && <div className="hidden sm:block h-5 w-px bg-surface-200 mx-1" />}

        {/* Store badge + user avatar + logout */}
        {user && (
          <div className="hidden sm:flex items-center gap-2">
            {/* Store badge */}
            <div className="flex items-center gap-1.5 rounded-xl border border-surface-200 bg-surface-50 px-3 py-1.5">
              <span className="text-sm leading-none">{user.storeEmoji}</span>
              <span className="text-xs font-semibold text-surface-700 max-w-[100px] truncate">
                {user.storeName}
              </span>
            </div>

            {/* User avatar */}
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-[11px] font-bold text-white select-none">
              {user.name.charAt(0).toUpperCase()}
            </div>

            {/* Logout */}
            <button
              onClick={logout}
              title="Sign out"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-surface-200 bg-white text-surface-400 transition-all hover:border-rose-300 hover:bg-rose-50 hover:text-rose-500"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Mobile: just avatar + logout */}
        {user && (
          <div className="flex sm:hidden items-center gap-1.5">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-[11px] font-bold text-white select-none">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-surface-200 bg-white text-surface-400 transition-all hover:border-rose-300 hover:bg-rose-50 hover:text-rose-500"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
