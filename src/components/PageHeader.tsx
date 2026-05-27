import React from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  badge?: string
  actions?: React.ReactNode
}

export default function PageHeader({ title, description, badge, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
      <div className="flex flex-col gap-1">
        {badge && (
          <span className="text-[0.625rem] font-bold uppercase tracking-[0.2em] text-primary">{badge}</span>
        )}
        <h2 className="text-[1.75rem] font-bold tracking-tight text-foreground">{title}</h2>
        {description && (
          <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0 flex-wrap">{actions}</div>
      )}
    </div>
  )
}
