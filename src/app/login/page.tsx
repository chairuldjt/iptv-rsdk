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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        // Redirect to dashboard with a short delay for animation smoothness
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
    <div className="relative min-h-screen flex items-center justify-center bg-[#070b13] overflow-hidden px-4">
      {/* Dynamic Glowing Gradients in Background */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-500/10 blur-[130px] animate-pulse pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-500/5 blur-[130px] animate-pulse pointer-events-none" />

      {/* Main Glassmorphic Login Container */}
      <div className="w-full max-w-md glass-panel p-8 rounded-3xl border border-slate-800/80 shadow-2xl relative z-10 bg-slate-950/40 backdrop-blur-2xl">
        
        {/* Brand Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary to-indigo-500 text-white font-extrabold text-2xl tracking-wider mb-4 shadow-lg shadow-primary/20">
            R
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            RSDK IPTV <span className="bg-gradient-to-r from-primary to-indigo-400 bg-clip-text text-transparent">Admin</span>
          </h1>
          <p className="text-slate-400 text-xs mt-2 font-medium">
            Masukkan akun admin untuk mengelola STB dan siaran IPTV.
          </p>
        </div>

        {/* Dynamic Error Visual Alert */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-3 animate-fade-in">
            <span className="flex-shrink-0 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <p className="leading-snug">{error}</p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          
          {/* Username Input Field */}
          <div className="flex flex-col space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Masukkan username"
              disabled={loading}
              className="px-4 py-3 bg-slate-900/80 border border-slate-800 focus:border-primary/60 rounded-2xl text-white text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium placeholder-slate-600 disabled:opacity-50"
              required
            />
          </div>

          {/* Password Input Field */}
          <div className="flex flex-col space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              className="px-4 py-3 bg-slate-900/80 border border-slate-800 focus:border-primary/60 rounded-2xl text-white text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium placeholder-slate-600 disabled:opacity-50"
              required
            />
          </div>

          {/* Login Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-primary to-indigo-600 hover:from-indigo-500 hover:to-primary text-white text-sm font-bold rounded-2xl shadow-xl shadow-primary/10 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2 cursor-pointer mt-8"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Menghubungkan...
              </>
            ) : (
              'Masuk ke Dashboard'
            )}
          </button>

        </form>

        {/* Footer Credit */}
        <div className="text-center mt-8 pt-6 border-t border-slate-900">
          <p className="text-[10px] text-slate-500 font-semibold tracking-widest uppercase">
            RSDK IPTV PLAYER • SECURE GATEWAY
          </p>
        </div>
      </div>
    </div>
  )
}
