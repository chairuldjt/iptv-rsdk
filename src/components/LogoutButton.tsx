'use client'

import React, { useState } from 'react'

export default function LogoutButton() {
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' })
      if (res.ok) {
        window.location.href = '/login'
      } else {
        alert('Gagal mengeluarkan sesi. Silakan coba lagi.')
      }
    } catch (err) {
      console.error('Logout error:', err)
      alert('Terjadi kesalahan koneksi saat keluar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        disabled={loading}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-destructive/80 hover:text-destructive hover:bg-destructive/10 transition-all duration-200 cursor-pointer disabled:opacity-50"
      >
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
        </svg>
        <span className="font-semibold text-sm">
          {loading ? 'Keluar...' : 'Keluar Sesi'}
        </span>
      </button>

      {showConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-background/90 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md card p-6 rounded-2xl border border-border shadow-2xl animate-slide-up text-center space-y-5">
            <div className="w-12 h-12 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto text-destructive">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
            </div>

            <div>
              <h3 className="text-lg font-bold text-foreground">Konfirmasi Keluar</h3>
              <p className="text-xs text-muted-foreground mt-1.5">
                Apakah Anda yakin ingin keluar dari panel admin?
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                disabled={loading}
                onClick={() => setShowConfirm(false)}
                className="flex-1 btn btn-secondary btn-sm py-2.5"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleLogout}
                className="flex-1 btn btn-destructive btn-sm py-2.5"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Keluar...
                  </>
                ) : (
                  'Ya, Keluar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
