import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default:     'bg-brand-100 text-brand-700',
        brand:       'bg-brand-100 text-brand-700',
        outline:     'border border-surface-200 text-surface-600',
        secondary:   'bg-surface-100 text-surface-600',
        success:     'bg-emerald-100 text-emerald-700',
        warning:     'bg-amber-100 text-amber-700',
        danger:      'bg-rose-100 text-rose-700',
        violet:      'bg-violet-100 text-violet-700',
        dark:        'bg-surface-800 text-surface-200',
        ghost:       'bg-transparent text-surface-500',
      },
      size: {
        sm:  'px-2 py-0 text-[10px]',
        md:  'px-2.5 py-0.5 text-xs',
        lg:  'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean
}

function Badge({ className, variant, size, dot, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {dot && (
        <span
          className={cn(
            'inline-block h-1.5 w-1.5 rounded-full',
            variant === 'success'  && 'bg-emerald-500',
            variant === 'warning'  && 'bg-amber-500',
            variant === 'danger'   && 'bg-rose-500',
            variant === 'brand' || variant === 'default' ? 'bg-brand-500' : '',
            variant === 'violet'   && 'bg-violet-500',
          )}
        />
      )}
      {children}
    </div>
  )
}

export { Badge, badgeVariants }
