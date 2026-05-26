'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

type VideoPlayerModalProps = {
  onClose: () => void
  title: string
  videoUrl: string
  folderName?: string | null
  updatedAtLabel: string
}

export default function VideoPlayerModal({
  onClose,
  title,
  videoUrl,
  folderName,
  updatedAtLabel,
}: VideoPlayerModalProps) {
  const [hasPlaybackError, setHasPlaybackError] = useState(false)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-[120] bg-background/88 backdrop-blur-md animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative flex min-h-full items-center justify-center p-3 sm:p-5 xl:p-8">
        <div className="relative w-full max-w-6xl overflow-hidden rounded-[28px] border border-white/10 bg-[#08080a] shadow-[0_32px_120px_rgba(0,0,0,0.55)] animate-slide-up">
          <div className="flex items-start justify-between gap-4 border-b border-white/8 bg-white/[0.03] px-4 py-4 sm:px-6">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-primary/80">Web Preview</p>
              <h3 className="mt-1 truncate text-base font-semibold text-foreground sm:text-xl">{title}</h3>
              <p className="mt-1 text-[11px] text-muted-foreground sm:text-xs">
                {folderName || 'Tanpa Folder'} · Diperbarui {updatedAtLabel}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-muted-foreground transition-colors hover:bg-white/[0.08] hover:text-foreground"
              aria-label="Tutup player"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="relative bg-black">
              <div className="relative aspect-video max-h-[78vh] min-h-[240px] w-full">
                <video
                  key={videoUrl}
                  src={videoUrl}
                  controls
                  autoPlay
                  playsInline
                  preload="metadata"
                  className="h-full w-full bg-black object-contain"
                  onError={() => setHasPlaybackError(true)}
                />
                <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/30 via-black/10 to-transparent" />
              </div>
            </div>

            <aside className="flex flex-col justify-between border-t border-white/8 bg-[linear-gradient(180deg,rgba(99,102,241,0.08),rgba(8,8,10,0.96)_22%,rgba(8,8,10,1))] p-4 sm:p-6 xl:border-l xl:border-t-0">
              <div className="space-y-5">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Status</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {hasPlaybackError ? 'Browser gagal memutar sumber ini.' : 'Video siap diputar langsung dari browser.'}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {hasPlaybackError
                      ? 'Cek format file, header CORS, atau codec video. Jika perlu, buka sumber langsung di tab baru.'
                      : 'Cocok untuk validasi cepat sebelum video dikirim ke perangkat STB.'}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Sumber</p>
                  <div className="rounded-2xl border border-white/8 bg-black/30 p-4">
                    <code className="block break-all text-[11px] leading-relaxed text-indigo-100/85">{videoUrl}</code>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <a
                  href={videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary w-full py-3"
                >
                  Buka Sumber Asli
                </a>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-outline w-full py-3"
                >
                  Kembali ke Repository
                </button>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
