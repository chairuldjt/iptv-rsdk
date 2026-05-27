import React from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'warning' | 'success'
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  children: React.ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-foreground border-transparent hover:bg-primary/85',
  secondary: 'bg-secondary text-secondary-foreground border-border hover:bg-secondary/85',
  outline: 'bg-transparent text-foreground border-border hover:bg-white/[0.05] hover:border-white/15',
  ghost: 'bg-transparent text-muted-foreground border-transparent hover:bg-white/[0.05] hover:text-foreground',
  danger: 'bg-destructive text-destructive-foreground border-transparent hover:bg-destructive/85',
  warning: 'bg-amber-500/15 text-amber-400 border-amber-500/20 hover:bg-amber-500/25',
  success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/25',
}

const sizeClasses: Record<ButtonSize, string> = {
  xs: 'px-2 py-1 text-[0.6875rem] rounded-lg gap-1',
  sm: 'px-3 py-1.5 text-xs rounded-xl gap-1.5',
  md: 'px-4 py-2 text-[0.8125rem] rounded-xl gap-2',
  lg: 'px-5 py-2.5 text-sm rounded-xl gap-2',
}

export default React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, className = '', children, disabled, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-semibold border transition-all duration-200 cursor-pointer whitespace-nowrap
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none
        ${className}`}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  )
})
