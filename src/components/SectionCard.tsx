import React from 'react'

interface SectionCardProps {
  title?: string
  description?: string
  headerAction?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export default function SectionCard({ title, description, headerAction, children, className = '' }: SectionCardProps) {
  return (
    <div className={`section-card ${className}`}>
      {title && (
        <div className="section-card-header flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="font-semibold text-sm text-foreground">{title}</h3>
            {description && (
              <p className="mt-0.5 text-[0.6875rem] text-muted-foreground leading-relaxed">{description}</p>
            )}
          </div>
          {headerAction}
        </div>
      )}
      <div className={title ? 'section-card-body' : 'p-6'}>
        {children}
      </div>
    </div>
  )
}
