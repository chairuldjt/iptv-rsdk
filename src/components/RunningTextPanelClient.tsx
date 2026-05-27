'use client'

import { useState, useRef, useTransition } from 'react'
import { createPortal } from 'react-dom'
import type { HomeExperienceRunningTextItem } from '@/lib/homeExperience'

type RunningTextPanelClientProps = {
  profileId: string
  profileName: string
  runningText: {
    enabled: boolean
    visibleCount: number
    rotationSeconds: number
    displaySeconds: number
    items: HomeExperienceRunningTextItem[]
  }
  isGlobal: boolean
  assignedGroupCount: number
  assignedDeviceCount: number
  saveAction: (fd: FormData) => Promise<void>
  pushLiveAction: (fd: FormData) => Promise<void>
}

export default function RunningTextPanelClient({
  profileId,
  profileName,
  runningText,
  isGlobal,
  assignedGroupCount,
  assignedDeviceCount,
  saveAction,
  pushLiveAction,
}: RunningTextPanelClientProps) {
  // Client state for running text parameters
  const [items, setItems] = useState<HomeExperienceRunningTextItem[]>(runningText.items)
  const [enabled, setEnabled] = useState<boolean>(runningText.enabled)
  const [visibleCount, setVisibleCount] = useState<number>(runningText.visibleCount)
  const [rotationSeconds, setRotationSeconds] = useState<number>(runningText.rotationSeconds)
  const [displaySeconds, setDisplaySeconds] = useState<number>(runningText.displaySeconds)

  // Confirmation state
  const [showPushConfirm, setShowPushConfirm] = useState(false)

  const formRef = useRef<HTMLFormElement>(null)
  const [isPushPending, startPushTransition] = useTransition()
  const [pushError, setPushError] = useState<string | null>(null)

  const handlePushConfirm = () => {
    setPushError(null)
    if (!formRef.current) return
    const formData = new FormData(formRef.current)
    startPushTransition(async () => {
      try {
        await pushLiveAction(formData)
        setShowPushConfirm(false)
      } catch (err: unknown) {
        const isRedirect =
          err instanceof Error &&
          (err.message.includes('NEXT_REDIRECT') ||
            ('digest' in err && String((err as { digest?: string }).digest).includes('NEXT_REDIRECT')))
        if (isRedirect) {
          setShowPushConfirm(false)
          return
        }
        console.error('Push live action failed:', err)
        setPushError(err instanceof Error ? err.message : 'Gagal mengirim live text.')
      }
    })
  }

  const hasTargets = isGlobal || assignedGroupCount > 0 || assignedDeviceCount > 0

  const targetLabel = isGlobal
    ? 'semua device aktif (Global Profile)'
    : hasTargets
    ? `${assignedGroupCount} grup dan ${assignedDeviceCount} device yang terhubung`
    : 'tidak ada device terhubung (silakan assign profile ini terlebih dahulu)'

  const activeItems = items.filter((i) => i.enabled && i.text.trim())

  const handleAddItem = () => {
    setItems((current) => [
      ...current,
      {
        id: `ticker_${Date.now()}`,
        enabled: true,
        text: 'Pesan baru',
      },
    ])
  }

  const handleUpdateItem = (id: string, patch: Partial<HomeExperienceRunningTextItem>) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item))
    )
  }

  const handleDeleteItem = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id))
  }



  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start animate-fade-in">
      {/* Left: Running Text Config Form */}
      <div className="card rounded-2xl p-5 border border-border bg-card text-card-foreground shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Running Text Config</h3>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Konfigurasi disimpan ke profile <strong>{profileName || '(Pilih Profile)'}</strong>.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddItem}
            className="rounded-xl border border-primary/20 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/10 transition-all select-none cursor-pointer"
          >
            + Tambah Pesan
          </button>
        </div>

        {/* Ticker Config Form */}
        <form action={saveAction} className="space-y-5">
          {/* Profile ID identifier */}
          <input type="hidden" name="profileId" value={profileId} />
          {/* Main settings row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-accent/15 border border-border/80">
            <label className="flex flex-col justify-center">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Status Ticker</span>
              <label className="flex items-center gap-2 cursor-pointer w-fit">
                <input
                  type="checkbox"
                  name="rtEnabled"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="h-4.5 w-4.5 rounded accent-primary cursor-pointer"
                />
                <span className="text-xs font-semibold text-foreground select-none">Aktifkan Running Text</span>
              </label>
            </label>
            <label>
              <span className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Visible Count (Jumlah Baris)</span>
              <input
                type="number"
                name="rtVisibleCount"
                value={visibleCount}
                onChange={(e) => setVisibleCount(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                min={1}
                max={10}
                className="field-input py-1.5 text-xs w-full"
              />
            </label>
            <label>
              <span className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Rotation Speed (Detik)</span>
              <input
                type="number"
                name="rtRotationSeconds"
                value={rotationSeconds}
                onChange={(e) => setRotationSeconds(Math.max(1, Math.min(600, parseInt(e.target.value) || 10)))}
                min={1}
                max={600}
                className="field-input py-1.5 text-xs w-full"
              />
            </label>
            {/* Hidden field to keep database structure intact */}
            <input type="hidden" name="rtDisplaySeconds" value={displaySeconds} />
          </div>

          {/* Hidden text items payload */}
          <input type="hidden" name="rtItemsJson" value={JSON.stringify(items)} />

          {/* Messages list */}
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Daftar Pesan Ticker</span>
              <span className="text-[10px] text-muted-foreground">{items.length} pesan</span>
            </div>

            {items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-[11px] text-muted-foreground bg-accent/5">
                Belum ada pesan ticker. Klik tombol <strong>+ Tambah Pesan</strong> di kanan atas untuk membuat pesan baru.
              </div>
            ) : (
              items.map((item, idx) => (
                <div key={item.id} className="rounded-xl border border-border bg-accent/5 p-3 flex gap-3 items-center hover:border-primary/20 hover:bg-accent/10 transition-all group">
                  {/* Left: Index number */}
                  <div className="flex items-center justify-center font-mono text-[10px] font-bold text-muted-foreground bg-accent/20 w-7 h-7 rounded-lg border border-border shrink-0 select-none">
                    {idx + 1}
                  </div>

                  {/* Middle: Text Input */}
                  <div className="flex-1">
                    <textarea
                      value={item.text}
                      onChange={(e) => handleUpdateItem(item.id, { text: e.target.value })}
                      className="field-input py-1.5 px-3 text-xs w-full min-h-[38px] resize-none"
                      placeholder="Ketik isi running text di sini..."
                      rows={1}
                    />
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleUpdateItem(item.id, { enabled: !item.enabled })}
                      className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold border transition-all select-none cursor-pointer ${
                        item.enabled
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/25'
                          : 'bg-muted/10 border-border text-muted-foreground hover:bg-muted/20'
                      }`}
                    >
                      {item.enabled ? 'Aktif' : 'Nonaktif'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id)}
                      className="rounded-lg border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 px-2.5 py-1.5 text-[10px] font-bold text-rose-400 hover:text-rose-350 transition-all select-none cursor-pointer"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t border-border">
            <button
              type="submit"
              className="flex-1 btn btn-primary py-2.5 font-semibold text-xs rounded-xl shadow-md cursor-pointer select-none"
            >
              Simpan ke Profile
            </button>
          </div>
        </form>
      </div>

      {/* Right: Live Push + Status */}
      <div className="space-y-4">
        {/* Status Card */}
        <div className="card rounded-2xl p-5 border border-border bg-card text-card-foreground shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Status Preview Live</h3>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status (Unsaved)</span>
              <span className={`font-semibold ${enabled ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                {enabled ? 'Aktif' : 'Nonaktif'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total Pesan</span>
              <span className="font-semibold text-foreground">{items.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Pesan Aktif</span>
              <span className="font-semibold text-foreground">{activeItems.length}</span>
            </div>
          </div>

          {/* Preview marquee */}
          {activeItems.length > 0 && (
            <div className="rounded-xl bg-amber-500/5 border border-amber-500/15 p-3.5 space-y-1">
              <div className="text-[9px] font-bold uppercase tracking-wider text-amber-400">Preview Layout</div>
              <div className="text-xs text-amber-200 leading-relaxed font-medium bg-black/20 p-2 rounded-lg border border-white/5 whitespace-pre-wrap">
                {activeItems.slice(0, 3).map((i) => i.text).join('  |  ')}
                {activeItems.length > 3 && ` ...+${activeItems.length - 3} lagi`}
              </div>
            </div>
          )}
        </div>

        {/* Live Push Form */}
        <form
          ref={formRef}
          onSubmit={(e) => e.preventDefault()}
          className="card rounded-2xl p-5 border border-border bg-card text-card-foreground shadow-sm space-y-4"
        >
          {/* Synchronize editor state to this form's submission inputs */}
          <input type="hidden" name="profileId" value={profileId} />
          <input type="hidden" name="rtEnabled" value={enabled ? 'on' : 'off'} />
          <input type="hidden" name="rtVisibleCount" value={visibleCount} />
          <input type="hidden" name="rtRotationSeconds" value={rotationSeconds} />
          <input type="hidden" name="rtDisplaySeconds" value={displaySeconds} />
          <input type="hidden" name="rtItemsJson" value={JSON.stringify(items)} />

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Kirim Live ke Device</h3>
            <p className="text-[10px] text-muted-foreground leading-normal">
              Dorong config running text (bisa yang belum disimpan) langsung ke memori runtime device aktif. Target diresolusi otomatis dari assignment profile ({targetLabel}).
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowPushConfirm(true)}
            disabled={!hasTargets}
            className="w-full rounded-xl border border-emerald-400/20 bg-emerald-500/10 hover:bg-emerald-500/15 py-2.5 text-xs font-bold text-emerald-300 transition-all cursor-pointer select-none disabled:opacity-40 disabled:cursor-not-allowed"
          >
            📢 Kirim Live ke Device
          </button>

          <p className="text-[10px] text-muted-foreground/60 leading-relaxed bg-accent/10 p-2.5 rounded-lg border border-border">
            <strong>Catatan UX:</strong> Tombol ini langsung mengirimkan pesan-pesan di atas ke memori device target secara real-time tanpa perlu restart app atau menyimpan konfigurasi terlebih dahulu.
          </p>
        </form>
      </div>

      {/* Confirmation Modal: Push Live */}
      {showPushConfirm && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/78 p-4 backdrop-blur-md animate-fade-in" onClick={() => !isPushPending && setShowPushConfirm(false)}>
          <div className="w-full max-w-md rounded-[28px] border border-border bg-card p-6 shadow-[0_30px_90px_rgba(0,0,0,0.55)] animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <div className="mt-5 space-y-2 text-center">
              <h3 className="text-lg font-semibold text-foreground">Konfirmasi Kirim Live</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Pesan running text akan segera dikirim live ke <strong className="text-foreground">{targetLabel}</strong>.
              </p>
            </div>

            {pushError && (
              <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs font-semibold text-rose-300">
                {pushError}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                disabled={isPushPending}
                onClick={() => setShowPushConfirm(false)}
                className="btn btn-secondary flex-1 py-2.5"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isPushPending}
                onClick={handlePushConfirm}
                className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 text-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isPushPending ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Memproses...
                  </>
                ) : (
                  'Ya, Kirim Sekarang'
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
