import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 glass-panel border-r border-border flex flex-col z-20">
        {/* Logo Section */}
        <div className="p-6 border-b border-border flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center glow-indigo">
            <span className="font-bold text-white text-lg">R</span>
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-wide text-white">RSDK IPTV</h1>
            <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider glow-green">Zero-Config</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/50 transition-all duration-200 group"
          >
            <svg className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
            </svg>
            <span className="font-medium text-sm">Dashboard</span>
          </Link>

          <Link
            href="/dashboard/playlists"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/50 transition-all duration-200 group"
          >
            <svg className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="font-medium text-sm">Playlists</span>
          </Link>

          <Link
            href="/dashboard/devices"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/50 transition-all duration-200 group"
          >
            <svg className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <span className="font-medium text-sm">Devices</span>
          </Link>

          <Link
            href="/dashboard/channels"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/50 transition-all duration-200 group"
          >
            <svg className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 00-2 2z" />
            </svg>
            <span className="font-medium text-sm">Channels</span>
          </Link>

          <Link
            href="/dashboard/logs"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/50 transition-all duration-200 group"
          >
            <svg className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="font-medium text-sm">Diagnostics Logs</span>
          </Link>
        </nav>

        {/* Logout Section */}
        <div className="px-4 py-2 border-t border-border/40">
          <LogoutButton />
        </div>

        {/* Footer info */}
        <div className="p-6 border-t border-border flex flex-col gap-1 text-slate-400 text-xs">
          <span>Backend Server Version 1.0.0</span>
          <span>MySQL Database: Active</span>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 flex flex-col overflow-hidden bg-background">
        {/* Top Header */}
        <header className="h-16 border-b border-border px-8 flex items-center justify-between z-10 glass-panel">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse glow-green"></span>
            <span className="text-sm font-semibold text-slate-300">API Server Online</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-slate-300 text-sm font-medium">Administrator</span>
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-indigo-400">
              AD
            </div>
          </div>
        </header>

        {/* Nested Page Container */}
        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
