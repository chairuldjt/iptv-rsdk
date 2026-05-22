'use client'

import React, { useState, useRef, useEffect } from 'react'

interface ConfirmFormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  action: (formData: FormData) => void | Promise<void>
  message: string
  children: React.ReactNode
}

export default function ConfirmForm({
  action,
  message,
  children,
  ...props
}: ConfirmFormProps) {
  const [showModal, setShowModal] = useState(false)
  const [isConfirmed, setIsConfirmed] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const handleInitialSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    // Jika belum dikonfirmasi di modal, cegah pengiriman dan tampilkan modal
    if (!isConfirmed) {
      e.preventDefault()
      setShowModal(true)
    }
    // Jika sudah isConfirmed = true, maka event submit ini akan dibiarkan lewat ke 'action'
  }

  const handleConfirm = () => {
    setIsConfirmed(true)
  }

  // Gunakan useEffect untuk memicu submit setelah state isConfirmed berubah menjadi true
  useEffect(() => {
    if (isConfirmed && formRef.current) {
      formRef.current.requestSubmit()
      
      // Reset state agar bisa digunakan lagi nanti
      setIsConfirmed(false)
      setShowModal(false)
    }
  }, [isConfirmed])

  return (
    <>
      <form 
        ref={formRef} 
        action={action} 
        onSubmit={handleInitialSubmit} 
        {...props}
      >
        {children}
      </form>

      {/* Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm glass-card p-6 rounded-2xl border border-rose-500/30 shadow-2xl animate-slide-up text-center">
            <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
              <svg className="w-8 h-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <h3 className="text-xl font-bold text-white mb-2">Konfirmasi Hapus</h3>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              {message}
            </p>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleConfirm}
                className="w-full py-3 rounded-xl bg-rose-500 hover:bg-rose-600 font-bold text-white text-sm transition-all duration-200 cursor-pointer text-center shadow-lg shadow-rose-500/20"
              >
                Ya, Hapus Sekarang
              </button>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-slate-300 text-sm transition-all duration-200 cursor-pointer text-center"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
