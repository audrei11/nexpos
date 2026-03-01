'use client'

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  // Base styles
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none',
  {
    variants: {
      variant: {
        // Primary gradient button (CTA)
        default:
          'bg-brand-gradient text-white shadow-brand hover:shadow-brand-lg hover:brightness-110 active:scale-[0.98]',
        // Solid indigo
        primary:
          'bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:scale-[0.98]',
        // Outlined
        outline:
          'border border-surface-200 bg-white text-surface-700 shadow-card hover:bg-surface-50 hover:border-brand-300 hover:text-brand-600 active:scale-[0.98]',
        // Ghost / text
        ghost:
          'text-surface-600 hover:bg-surface-100 hover:text-surface-900 active:scale-[0.98]',
        // Destructive
        destructive:
          'bg-rose-500 text-white shadow-sm hover:bg-rose-600 active:scale-[0.98]',
        // Subtle / secondary
        secondary:
          'bg-surface-100 text-surface-700 hover:bg-surface-200 active:scale-[0.98]',
        // Emerald success
        success:
          'bg-emerald-gradient text-white shadow-sm hover:brightness-110 active:scale-[0.98]',
        // Dark (for sidebar context)
        dark:
          'bg-white/10 text-white border border-white/15 hover:bg-white/20 active:scale-[0.98]',
      },
      size: {
        xs:   'h-7  px-2.5 text-xs rounded-lg',
        sm:   'h-8  px-3   text-sm',
        md:   'h-9  px-4   text-sm',
        default: 'h-10 px-5 text-sm',
        lg:   'h-11 px-6   text-base',
        xl:   'h-12 px-7   text-base',
        '2xl':'h-14 px-8   text-lg',
        icon: 'h-9  w-9',
        'icon-sm': 'h-7 w-7',
        'icon-lg': 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <svg
              className="animate-spin -ml-0.5 h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
