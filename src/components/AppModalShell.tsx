'use client'

import { useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'

type AppModalShellProps = {
  title: string
  closeHref: string
  children: React.ReactNode
  eyebrow?: string
  description?: string
  maxWidthClass?: string
  zIndexClass?: string
}

export default function AppModalShell({
  title,
  closeHref,
  children,
  eyebrow,
  description,
  maxWidthClass = 'max-w-3xl',
  zIndexClass = 'z-[70]',
}: AppModalShellProps) {
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  if (!isMounted) {
    return null
  }

  return createPortal(
    <div className={`fixed inset-0 ${zIndexClass} flex items-center justify-center bg-slate-950/78 p-4 backdrop-blur-md animate-fade-in`}>
      <div className={`w-full ${maxWidthClass} overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,20,35,0.98),rgba(7,10,19,0.98))] shadow-[0_30px_90px_rgba(0,0,0,0.55)] animate-slide-up`}>
        <div className="flex items-start justify-between gap-4 border-b border-white/8 px-6 py-5">
          <div className="min-w-0">
            {eyebrow && (
              <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
                {eyebrow}
              </div>
            )}
            <h3 className="mt-1 text-xl font-bold text-white">{title}</h3>
            {description && (
              <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-slate-400">
                {description}
              </p>
            )}
          </div>
          <a
            href={closeHref}
            className="shrink-0 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/[0.07] hover:text-white"
          >
            Tutup
          </a>
        </div>

        <div className="max-h-[calc(100vh-10rem)] overflow-y-auto px-6 py-5">
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}
