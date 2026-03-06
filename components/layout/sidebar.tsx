'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, ShoppingCart, Package, BarChart3,
  Settings, Boxes, LogOut, Zap, Users, ChevronRight, X, FlaskConical,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSidebar } from '@/lib/sidebar-context'

const NAV_ITEMS = [
  { label: 'Dashboard',    href: '/dashboard',            icon: LayoutDashboard },
  { label: 'POS Terminal', href: '/dashboard/pos',        icon: ShoppingCart,   badge: 'LIVE' },
  { label: 'Products',     href: '/dashboard/products',   icon: Package },
  { label: 'Inventory',    href: '/dashboard/inventory',   icon: Boxes },
  { label: 'Ingredients',  href: '/dashboard/ingredients', icon: FlaskConical },
  { label: 'Customers',    href: '/dashboard/customers',   icon: Users },
  { label: 'Reports',      href: '/dashboard/reports',    icon: BarChart3 },
]

const BOTTOM_ITEMS = [
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { close } = useSidebar()

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  // Close sidebar on mobile after navigating
  const handleNavClick = () => {
    close()
  }

  return (
    <aside className="flex h-screen w-[240px] flex-shrink-0 flex-col bg-surface-900 border-r border-white/[0.06]">

      {/* Logo row */}
      <div className="flex items-center justify-between px-5 h-16 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-gradient shadow-brand">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <div>
            <span className="text-[15px] font-bold text-white tracking-tight">NEXPOS</span>
            <span className="ml-1.5 text-[9px] font-semibold text-brand-400 uppercase tracking-wider">Pro</span>
          </div>
        </div>

        {/* Close button — mobile only */}
        <button
          onClick={close}
          className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.06] text-surface-400 hover:bg-white/[0.12] hover:text-white transition-all lg:hidden"
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        <div className="mb-4">
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-surface-500">
            Main Menu
          </p>
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
                className={cn(
                  'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                  active
                    ? 'bg-white/[0.08] text-white'
                    : 'text-surface-400 hover:bg-white/[0.05] hover:text-surface-200'
                )}
              >
                <span
                  className={cn(
                    'absolute left-0 h-6 w-0.5 rounded-r-full bg-brand-400 transition-all duration-200',
                    active ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <Icon
                  className={cn(
                    'h-[18px] w-[18px] flex-shrink-0 transition-colors',
                    active ? 'text-brand-400' : 'text-surface-500 group-hover:text-surface-300'
                  )}
                />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="rounded-full bg-brand-500/20 px-1.5 py-0.5 text-[9px] font-bold text-brand-400 uppercase tracking-wider">
                    {item.badge}
                  </span>
                )}
                {active && (
                  <ChevronRight className="h-3 w-3 text-surface-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </Link>
            )
          })}
        </div>

        <div className="pt-2 border-t border-white/[0.06]">
          <p className="px-3 mb-2 mt-4 text-[10px] font-semibold uppercase tracking-widest text-surface-500">
            System
          </p>
          {BOTTOM_ITEMS.map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
                className={cn(
                  'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                  active
                    ? 'bg-white/[0.08] text-white'
                    : 'text-surface-400 hover:bg-white/[0.05] hover:text-surface-200'
                )}
              >
                <Icon
                  className={cn(
                    'h-[18px] w-[18px] flex-shrink-0 transition-colors',
                    active ? 'text-brand-400' : 'text-surface-500 group-hover:text-surface-300'
                  )}
                />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* User Profile */}
      <div className="border-t border-white/[0.06] p-3">
        <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-150 hover:bg-white/[0.05] group">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-gradient text-xs font-bold text-white shadow-brand">
            RS
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">Redel Santos</p>
            <p className="text-xs text-surface-500 truncate">Store Manager</p>
          </div>
          <LogOut className="h-4 w-4 text-surface-600 group-hover:text-surface-400 transition-colors flex-shrink-0" />
        </button>
      </div>
    </aside>
  )
}
