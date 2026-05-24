import React from 'react'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  trend?: { value: number; positive: boolean }
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'info'
}

const variantStyles = {
  default: { bg: 'bg-primary/10', border: 'border-primary/20', text: 'text-primary' },
  success: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
  warning: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400' },
  destructive: { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-400' },
  info: { bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-400' },
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = 'default',
}: StatCardProps) {
  const s = variantStyles[variant]

  return (
    <div className="card card-hover p-5 flex items-center justify-between animate-fade-in">
      <div className="space-y-1.5 min-w-0">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
          {title}
        </span>
        <div className="flex items-baseline gap-2">
          <h3 className="text-2xl font-bold text-foreground tracking-tight">{value}</h3>
          {trend && (
            <span className={`text-xs font-semibold ${trend.positive ? 'text-emerald-400' : 'text-rose-400'}`}>
              {trend.positive ? '+' : ''}{trend.value}%
            </span>
          )}
        </div>
        {subtitle && (
          <span className="text-[10px] text-muted-foreground/70 block font-medium">{subtitle}</span>
        )}
      </div>
      <div className={`w-11 h-11 rounded-xl ${s.bg} ${s.border} border flex items-center justify-center ${s.text} shrink-0`}>
        {icon}
      </div>
    </div>
  )
}
