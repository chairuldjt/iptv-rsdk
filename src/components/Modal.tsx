'use client'

import React, { useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

type ModalSize = 'sm' | 'md' | 'lg' | 'xl'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  size?: ModalSize
  children: React.ReactNode
  footer?: React.ReactNode
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'modal-sm',
  md: 'modal-md',
  lg: 'modal-lg',
  xl: 'modal-xl',
}

export default function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  children,
  footer,
}: ModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose]
  )

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, handleKeyDown])

  if (!open) return null

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-content ${sizeClasses[size]}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-foreground">{title}</h3>
            {description && (
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-xl border border-white/8 bg-white/[0.03] p-2 text-muted-foreground hover:bg-white/[0.07] hover:text-foreground transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>,
    document.body
  )
}
