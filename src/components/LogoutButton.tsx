'use client'

import React, { useState } from 'react'

export default function LogoutButton() {
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    if (!window.confirm('Apakah Anda yakin ingin keluar dari panel admin?')) {
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/logout', {
        method: 'POST',
      })

      if (res.ok) {
        // Direct full reload to clear all state and trigger middleware redirect
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
    <button
      onClick={handleLogout}
      disabled={loading}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-400/80 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/10 transition-all duration-200 group cursor-pointer disabled:opacity-50"
    >
      <svg
        className="w-5 h-5 text-rose-500/70 group-hover:text-rose-400 transition-colors"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
        />
      </svg>
      <span className="font-semibold text-sm">
        {loading ? 'Keluar...' : 'Keluar Sesi'}
      </span>
    </button>
  )
}
