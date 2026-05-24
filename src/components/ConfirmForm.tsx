'use client'

import React, { useState, useRef, useTransition } from 'react'

interface ConfirmFormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  action: (formData: FormData) => void | Promise<void>
  message: string
  children: React.ReactNode
}

export default function ConfirmForm({ action, message, children, ...props }: ConfirmFormProps) {
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

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

      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/90 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md card p-6 rounded-2xl border border-border shadow-2xl animate-slide-up text-center space-y-6">
            <div className="w-12 h-12 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto text-destructive">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-foreground">Konfirmasi Hapus</h3>
              <p className="text-xs text-muted-foreground leading-relaxed px-2">
                {message || 'Data yang dihapus tidak dapat dikembalikan. Apakah Anda yakin ingin melanjutkan?'}
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs text-left font-semibold leading-relaxed animate-fade-in">
                {error}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setShowModal(false)}
                className="flex-1 order-2 sm:order-1 btn btn-secondary btn-sm py-2.5"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleConfirm}
                className="flex-1 order-1 sm:order-2 btn btn-destructive btn-sm py-2.5"
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
                  'Ya, Hapus Sekarang'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
