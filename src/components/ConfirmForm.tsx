'use client'

import React, { useState, useRef, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useToast } from '@/components/Toast'

interface ConfirmFormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  action: (formData: FormData) => void | Promise<void>
  title?: string
  message?: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  successToast?: string
  children: React.ReactNode
}

export default function ConfirmForm({
  action,
  title = 'Konfirmasi Hapus',
  message,
  description,
  confirmLabel = 'Hapus',
  cancelLabel = 'Batal',
  successToast,
  children,
  ...props
}: ConfirmFormProps) {
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)
  const { showToast } = useToast()

  const handleInitialSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setShowModal(true)
  }

  const handleConfirm = () => {
    setError(null)
    const formData = new FormData(formRef.current || undefined)
    startTransition(async () => {
      try {
        await action(formData)
        if (successToast) {
          showToast('success', successToast)
        }
        setShowModal(false)
      } catch (err: unknown) {
        const isRedirect =
          err instanceof Error && (err.message.includes('NEXT_REDIRECT') || 'digest' in err && String((err as { digest?: string }).digest).includes('NEXT_REDIRECT'))
        if (isRedirect) {
          setShowModal(false)
          return
        }
        console.error('Action failed:', err)
        setError(err instanceof Error ? err.message : 'Gagal memproses penghapusan data.')
      }
    })
  }

  return (
    <>
      <form ref={formRef} action={action} onSubmit={handleInitialSubmit} {...props}>
        {children}
      </form>

      {showModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/78 p-4 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(25,28,45,0.98),rgba(11,15,27,0.98))] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.55)] animate-slide-up">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-300">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>

            <div className="mt-5 space-y-2 text-center">
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <p className="text-sm leading-relaxed text-slate-300">
                {description || message || 'Data yang dihapus tidak dapat dikembalikan. Apakah Anda yakin ingin melanjutkan?'}
              </p>
            </div>

            {error && (
              <div className="mt-5 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-left text-xs font-semibold leading-relaxed text-rose-300 animate-fade-in">
                {error}
              </div>
            )}

            {message && description && (
              <div className="mt-4 rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-left text-xs leading-relaxed text-slate-400">
                {message}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setShowModal(false)}
                className="btn btn-secondary flex-1 py-2.5"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleConfirm}
                className="btn btn-destructive flex-1 py-2.5"
              >
                {isPending ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Menghapus...
                  </>
                ) : (
                  confirmLabel
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
