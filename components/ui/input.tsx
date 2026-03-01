import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  startIcon?: React.ReactNode
  endIcon?: React.ReactNode
  error?: string
  label?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, startIcon, endIcon, error, label, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-surface-700"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {startIcon && (
            <div className="pointer-events-none absolute left-3 flex items-center text-surface-400">
              {startIcon}
            </div>
          )}
          <input
            id={inputId}
            type={type}
            ref={ref}
            className={cn(
              'flex h-10 w-full rounded-xl border border-surface-200 bg-white px-3.5 py-2 text-sm text-surface-900',
              'placeholder:text-surface-400',
              'shadow-inner-sm',
              'transition-all duration-150',
              'focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-surface-50',
              startIcon && 'pl-10',
              endIcon && 'pr-10',
              error && 'border-rose-400 focus:ring-rose-500/20 focus:border-rose-400',
              className
            )}
            {...props}
          />
          {endIcon && (
            <div className="absolute right-3 flex items-center text-surface-400">
              {endIcon}
            </div>
          )}
        </div>
        {error && (
          <p className="text-xs text-rose-500">{error}</p>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }
