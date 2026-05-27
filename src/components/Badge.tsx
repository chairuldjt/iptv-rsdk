import React from 'react'

type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'muted' | 'primary'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

const variantMap: Record<BadgeVariant, string> = {
  success: 'badge badge-success',
  danger: 'badge badge-destructive',
  warning: 'badge badge-warning',
  info: 'badge bg-violet-500/10 border-violet-500/20 text-violet-400',
  muted: 'badge badge-muted',
  primary: 'badge badge-primary',
}

export default function Badge({ variant = 'muted', children, className = '', style }: BadgeProps) {
  return (
    <span className={`${variantMap[variant]} ${className}`} style={style}>
      {children}
    </span>
  )
}

export function StatusDot({ status }: { status: 'online' | 'offline' | 'disabled' }) {
  const colors: Record<typeof status, string> = {
    online: 'bg-emerald-500',
    offline: 'bg-muted',
    disabled: 'bg-amber-500',
  }
  return <span className={`w-2 h-2 rounded-full shrink-0 animate-pulse-glow ${colors[status]}`} />
}
