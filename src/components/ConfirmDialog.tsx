'use client'

import React, { useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import Button from './Button'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void | Promise<void>
  title?: string
  description?: string
  detail?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning'
  children?: React.ReactNode
}

export default function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title = 'Konfirmasi',
  description = 'Apakah Anda yakin ingin melanjutkan?',
  detail,
  confirmLabel = 'Hapus',
  cancelLabel = 'Batal',
  variant = 'danger',
  children,
}: ConfirmDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = () => {
    setError(null)
    startTransition(async () => {
      try {
        await onConfirm()
        onOpenChange(false)
      } catch (err: unknown) {
        const isRedirect =
          err instanceof Error && (err.message.includes('NEXT_REDIRECT') || 'digest' in err && String((err as { digest?: string }).digest).includes('NEXT_REDIRECT'))
        if (isRedirect) {
          onOpenChange(false)
          return
        }
        setError(err instanceof Error ? err.message : 'Terjadi kesalahan.')
      }
    })
  }

  if (!open) return null

  const isDanger = variant === 'danger'
  const iconColor = isDanger ? 'bg-rose-500/10 border-rose-500/20 text-rose-300' : 'bg-amber-500/10 border-amber-500/20 text-amber-300'

  return createPortal(
    <div
      className="modal-overlay"
      style={{ zIndex: 100 }}
      onClick={() => !isPending && onOpenChange(false)}
    >
      <div
        className="modal-content modal-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border ${iconColor}`}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>

          <div className="mt-5 space-y-2 text-center">
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
          </div>

          {detail && (
            <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 text-xs leading-relaxed text-muted-foreground">
              {detail}
            </div>
          )}

          {children && <div className="mt-4">{children}</div>}

          {error && (
            <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs font-semibold text-rose-300">
              {error}
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button
              variant="secondary"
              size="md"
              className="flex-1"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
            >
              {cancelLabel}
            </Button>
            <Button
              variant={isDanger ? 'danger' : 'warning'}
              size="md"
              className="flex-1"
              loading={isPending}
              onClick={handleConfirm}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
