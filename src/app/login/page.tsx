'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (!username.trim() || !password.trim()) {
      setError('Username dan Password tidak boleh kosong.')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        router.push('/dashboard')
        router.refresh()
      } else {
        setError(data.error || 'Login gagal. Periksa kembali kredensial Anda.')
      }
    } catch (err) {
      console.error('Login submit error:', err)
      setError('Terjadi masalah koneksi ke server.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background overflow-hidden px-4">
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-primary/5 blur-[130px] animate-pulse-glow pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-500/3 blur-[130px] animate-pulse-glow pointer-events-none" />

      <div className="w-full max-w-md card p-8 rounded-3xl border border-border shadow-2xl relative z-10 animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-indigo-500 text-primary-foreground font-extrabold text-2xl tracking-wider mb-4">
            R
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            RSDK IPTV <span className="bg-gradient-to-r from-primary to-indigo-400 bg-clip-text text-transparent">Admin</span>
          </h1>
          <p className="text-muted-foreground text-xs mt-2 font-medium">
            Masukkan akun admin untuk mengelola STB dan siaran IPTV.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-3 animate-fade-in">
            <span className="flex-shrink-0 w-2 h-2 rounded-full bg-destructive animate-pulse-glow" />
            <p className="leading-snug">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="flex flex-col space-y-2">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest pl-1">Username</label>
            <input
              type="text" value={username} onChange={(e) => setUsername(e.target.value)}
              placeholder="Masukkan username" disabled={loading}
              className="px-4 py-3 bg-background border border-input focus:border-primary/60 rounded-2xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium placeholder:text-muted-foreground disabled:opacity-50"
              required
            />
          </div>

          <div className="flex flex-col space-y-2">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest pl-1">Password</label>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="········" disabled={loading}
              className="px-4 py-3 bg-background border border-input focus:border-primary/60 rounded-2xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium placeholder:text-muted-foreground disabled:opacity-50"
              required
            />
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full py-3.5 btn btn-primary rounded-2xl font-bold text-sm flex items-center justify-center gap-2 mt-4"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Menghubungkan...
              </>
            ) : (
              'Masuk ke Dashboard'
            )}
          </button>
        </form>

        <div className="text-center mt-8 pt-6 border-t border-border">
          <p className="text-[10px] text-muted-foreground font-semibold tracking-widest uppercase">
            RSDK IPTV PLAYER · SECURE GATEWAY
          </p>
        </div>
      </div>
    </div>
  )
}
