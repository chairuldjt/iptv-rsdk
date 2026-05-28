'use client'

import { useMemo, useState, useRef, useTransition } from 'react'
import { createPortal } from 'react-dom'
import VideoRepoForm from '@/components/VideoRepoForm'

type VideoOption = {
  id: number
  title: string
  folderName: string | null
  isPublished: boolean
}

type OverlayTextItem = {
  id: string
  text: string
  enabled: boolean
}

type VideoBroadcastManagerProps = {
  profileId: string
  profileName: string
  initialVideoId: number | null
  initialRepeatCount: number
  initialItems?: { videoId: number; repeatCount: number }[]
  initialOverlay?: { enabled: boolean; items: OverlayTextItem[]; speed: number }
  videos: VideoOption[]
  isGlobal: boolean
  assignedGroupCount: number
  assignedDeviceCount: number
  activeRecipientCount: number
  folders: Array<{ id: number; name: string }>
  onPlayNowAction: (formData: FormData) => void | Promise<void>
  onStopNowAction: (formData: FormData) => void | Promise<void>
  onSaveAction: (formData: FormData) => void | Promise<void>
}

export default function VideoBroadcastManager({
  profileId,
  profileName,
  initialVideoId,
  initialRepeatCount,
  initialItems = [],
  initialOverlay,
  videos,
  isGlobal,
  assignedGroupCount,
  assignedDeviceCount,
  activeRecipientCount,
  folders,
  onPlayNowAction,
  onStopNowAction,
  onSaveAction,
}: VideoBroadcastManagerProps) {
  // Playlist state
  const [items, setItems] = useState<{ videoId: number; repeatCount: number }[]>(
    initialItems.length > 0
      ? initialItems
      : initialVideoId
      ? [{ videoId: initialVideoId, repeatCount: initialRepeatCount }]
      : []
  )

  // Local addition form states
  const [selectedAddVideoId, setSelectedAddVideoId] = useState<string>('')
  const [addRepeatCount, setAddRepeatCount] = useState<number>(1)

  // Running text overlay state — load from saved config if available
  const [overlayEnabled, setOverlayEnabled] = useState(initialOverlay?.enabled ?? false)
  const [overlayItems, setOverlayItems] = useState<OverlayTextItem[]>(
    initialOverlay?.items && initialOverlay.items.length > 0
      ? initialOverlay.items
      : [{ id: `ot_${Date.now()}`, text: '', enabled: true }]
  )
  const [overlaySpeed, setOverlaySpeed] = useState(initialOverlay?.speed ?? 20)

  // Confirmation modals state
  const [showPlayConfirm, setShowPlayConfirm] = useState(false)
  const [showStopConfirm, setShowStopConfirm] = useState(false)
  const [showAddVideoModal, setShowAddVideoModal] = useState(false)

  const formRef = useRef<HTMLFormElement>(null)
  const [isPlayPending, startPlayTransition] = useTransition()
  const [isStopPending, startStopTransition] = useTransition()
  const [playError, setPlayError] = useState<string | null>(null)
  const [stopError, setStopError] = useState<string | null>(null)

  const handleAddItem = () => {
    const vid = parseInt(selectedAddVideoId, 10)
    if (!vid) return
    setItems((prev) => [...prev, { videoId: vid, repeatCount: addRepeatCount }])
    setSelectedAddVideoId('')
    setAddRepeatCount(1)
  }

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleMoveUp = (index: number) => {
    if (index === 0) return
    setItems((prev) => {
      const list = [...prev]
      const temp = list[index]
      list[index] = list[index - 1]
      list[index - 1] = temp
      return list
    })
  }

  const handleMoveDown = (index: number) => {
    if (index === items.length - 1) return
    setItems((prev) => {
      const list = [...prev]
      const temp = list[index]
      list[index] = list[index + 1]
      list[index + 1] = temp
      return list
    })
  }

  const handleUpdateItemRepeat = (index: number, count: number) => {
    setItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, repeatCount: count } : item))
    )
  }

  const handleAddOverlayItem = () => {
    setOverlayItems((prev) => [
      ...prev,
      { id: `ot_${Date.now()}`, text: '', enabled: true },
    ])
  }

  const handleUpdateOverlayItem = (id: string, patch: Partial<OverlayTextItem>) => {
    setOverlayItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    )
  }

  const handleDeleteOverlayItem = (id: string) => {
    setOverlayItems((prev) => prev.filter((item) => item.id !== id))
  }

  const sortedVideos = useMemo(
    () =>
      [...videos].sort((a, b) =>
        `${a.folderName || ''} ${a.title}`.localeCompare(`${b.folderName || ''} ${b.title}`, 'id')
      ),
    [videos]
  )

  const selectedAddVideo = useMemo(
    () => sortedVideos.find((video) => String(video.id) === selectedAddVideoId) ?? null,
    [selectedAddVideoId, sortedVideos]
  )

  const playlistWithMeta = useMemo(() => {
    return items.map((item) => {
      const video = videos.find((v) => v.id === item.videoId)
      return {
        ...item,
        title: video ? video.title : `Video #${item.videoId}`,
        folderName: video ? video.folderName : null,
      }
    })
  }, [items, videos])

  const handlePlayConfirm = () => {
    setPlayError(null)
    if (!formRef.current) return
    const formData = new FormData(formRef.current)
    startPlayTransition(async () => {
      try {
        await onPlayNowAction(formData)
        setShowPlayConfirm(false)
      } catch (err: unknown) {
        const isRedirect =
          err instanceof Error &&
          (err.message.includes('NEXT_REDIRECT') ||
            ('digest' in err && String((err as { digest?: string }).digest).includes('NEXT_REDIRECT')))
        if (isRedirect) {
          setShowPlayConfirm(false)
          return
        }
        console.error('Play action failed:', err)
        setPlayError(err instanceof Error ? err.message : 'Gagal memulai broadcast.')
      }
    })
  }

  const handleStopConfirm = () => {
    setStopError(null)
    if (!formRef.current) return
    const formData = new FormData(formRef.current)
    startStopTransition(async () => {
      try {
        await onStopNowAction(formData)
        setShowStopConfirm(false)
      } catch (err: unknown) {
        const isRedirect =
          err instanceof Error &&
          (err.message.includes('NEXT_REDIRECT') ||
            ('digest' in err && String((err as { digest?: string }).digest).includes('NEXT_REDIRECT')))
        if (isRedirect) {
          setShowStopConfirm(false)
          return
        }
        console.error('Stop action failed:', err)
        setStopError(err instanceof Error ? err.message : 'Gagal menghentikan broadcast.')
      }
    })
  }

  const hasAssignments = isGlobal || assignedGroupCount > 0 || assignedDeviceCount > 0
  const hasTargets = activeRecipientCount > 0
  const totalPlayCount = items.reduce((acc, curr) => acc + curr.repeatCount, 0)
  const uniqueVideoCount = new Set(items.map((item) => item.videoId)).size
  const duplicateVideoCount = items.length - uniqueVideoCount
  const nextUpItems = playlistWithMeta.slice(0, 3)

  const targetLabel = isGlobal
    ? `${activeRecipientCount} device aktif (Global Profile)`
    : hasTargets
    ? `${activeRecipientCount} device aktif dari ${assignedGroupCount} grup dan ${assignedDeviceCount} assignment device`
    : hasAssignments
    ? 'belum ada device aktif dari assignment profile ini'
    : 'belum ada assignment profile, silakan assign ke group atau device terlebih dahulu'

  const firstItem = items[0] || null
  const fallbackVideoId = firstItem ? String(firstItem.videoId) : ''
  const fallbackRepeatCount = firstItem ? firstItem.repeatCount : 1

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start animate-fade-in">
      {/* Left: Video Broadcast Config */}
      <div className="card rounded-2xl p-5 border border-border bg-card text-card-foreground shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Video Broadcast Config</h3>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Konfigurasi disimpan ke profile <strong>{profileName || '(Pilih Profile)'}</strong>.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
              Live Ready
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-border bg-accent/10 px-4 py-3">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Playlist</div>
            <div className="mt-1 text-lg font-semibold text-foreground">{items.length}</div>
            <div className="text-[11px] text-muted-foreground">item video</div>
          </div>
          <div className="rounded-2xl border border-border bg-accent/10 px-4 py-3">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Total Putar</div>
            <div className="mt-1 text-lg font-semibold text-foreground">{totalPlayCount}x</div>
            <div className="text-[11px] text-muted-foreground">akumulasi loop</div>
          </div>
          <div className="rounded-2xl border border-border bg-accent/10 px-4 py-3">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Target</div>
            <div className="mt-1 text-lg font-semibold text-foreground">{activeRecipientCount}</div>
            <div className="text-[11px] text-muted-foreground">device aktif</div>
          </div>
          <div className="rounded-2xl border border-border bg-accent/10 px-4 py-3">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Variasi</div>
            <div className="mt-1 text-lg font-semibold text-foreground">{uniqueVideoCount}</div>
            <div className="text-[11px] text-muted-foreground">
              {duplicateVideoCount > 0 ? `${duplicateVideoCount} item duplikat` : 'tanpa duplikat'}
            </div>
          </div>
        </div>

        {/* Video Config Form */}
        <form action={onSaveAction} className="space-y-5">
          <input type="hidden" name="profileId" value={profileId} />
          <input type="hidden" name="videoItemsJson" value={JSON.stringify(items)} />
          {/* Legacy fallback inputs */}
          <input type="hidden" name="videoId" value={fallbackVideoId} />
          <input type="hidden" name="repeatCount" value={fallbackRepeatCount} />
          {/* Running text overlay inputs */}
          <input type="hidden" name="overlayEnabled" value={overlayEnabled ? 'on' : 'off'} />
          <input type="hidden" name="overlayItemsJson" value={JSON.stringify(overlayItems)} />
          <input type="hidden" name="overlaySpeed" value={overlaySpeed} />

          {/* Main settings row: Add Item Form */}
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_130px_auto] gap-4 p-4 rounded-xl bg-accent/15 border border-border/80 items-end">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Pilih Video</span>
                <button
                  type="button"
                  onClick={() => setShowAddVideoModal(true)}
                  className="rounded px-2 py-0.5 text-[10px] font-bold border border-primary/20 bg-primary/10 hover:bg-primary/20 text-primary transition-all cursor-pointer select-none"
                  title="Tambah Video Baru ke Repository"
                >
                  + Upload Video Baru
                </button>
              </div>
              <select
                value={selectedAddVideoId}
                onChange={(e) => setSelectedAddVideoId(e.target.value)}
                className="field-input py-1.5 text-xs w-full cursor-pointer"
              >
                <option value="">Pilih video...</option>
                {sortedVideos.map((video) => (
                  <option key={video.id} value={video.id}>
                    {video.folderName ? `[${video.folderName}] ` : ''}{video.title}
                  </option>
                ))}
              </select>
              <div className="mt-2 min-h-[32px] rounded-lg border border-border/70 bg-background/30 px-3 py-2 text-[11px] text-muted-foreground">
                {selectedAddVideo
                  ? `Siap ditambahkan: ${selectedAddVideo.folderName ? `[${selectedAddVideo.folderName}] ` : ''}${selectedAddVideo.title}`
                  : 'Pilih video untuk melihat kandidat item berikutnya di playlist.'}
              </div>
            </div>
            <div>
              <span className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Repeat Count</span>
              <input
                type="number"
                value={addRepeatCount}
                onChange={(e) => setAddRepeatCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                min={1}
                max={100}
                className="field-input py-1.5 text-xs w-full"
              />
            </div>
            <button
              type="button"
              onClick={handleAddItem}
              disabled={!selectedAddVideoId}
              className="rounded-xl border border-primary/20 bg-primary/10 hover:bg-primary/20 text-primary py-2 px-4 text-xs font-bold transition-all cursor-pointer select-none disabled:opacity-40 disabled:cursor-not-allowed h-[34px] flex items-center justify-center"
            >
              + Tambah ke List
            </button>
          </div>

          {/* Video Playlist */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Daftar Video Broadcast (Playlist)</span>
              <span className="text-[10px] text-muted-foreground">{items.length} video</span>
            </div>

            {items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-[11px] text-muted-foreground bg-accent/5">
                Belum ada video dalam playlist. Pilih video dari dropdown di atas dan klik <strong>+ Tambah ke List</strong>.
              </div>
            ) : (
              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                {playlistWithMeta.map((item, idx) => (
                  <div key={idx} className="rounded-xl border border-border bg-accent/5 p-3 flex gap-3 items-center hover:border-primary/20 hover:bg-accent/10 transition-all group">
                    {/* Index number */}
                    <div className="flex items-center justify-center font-mono text-[10px] font-bold text-muted-foreground bg-accent/20 w-7 h-7 rounded-lg border border-border shrink-0 select-none">
                      {idx + 1}
                    </div>
                    {/* Video details */}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-foreground truncate">{item.title}</div>
                      {item.folderName && (
                        <div className="text-[10px] text-muted-foreground">Folder: {item.folderName}</div>
                      )}
                    </div>
                    {/* Repeat count inline update */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] text-muted-foreground">Putar:</span>
                      <input
                        type="number"
                        value={item.repeatCount}
                        onChange={(e) => handleUpdateItemRepeat(idx, Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                        min={1}
                        max={100}
                        className="field-input py-0.5 px-1.5 text-[11px] w-12 text-center"
                      />
                      <span className="text-[10px] text-muted-foreground">kali</span>
                    </div>
                    {/* Ordering and remove actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMoveUp(idx)}
                        disabled={idx === 0}
                        className="p-1 rounded hover:bg-accent border border-border text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                        title="Geser ke atas"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveDown(idx)}
                        disabled={idx === items.length - 1}
                        className="p-1 rounded hover:bg-accent border border-border text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                        title="Geser ke bawah"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="rounded-lg border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 px-2.5 py-1.5 text-[10px] font-bold text-rose-400 hover:text-rose-350 transition-all select-none cursor-pointer"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {items.length > 0 && (
            <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Ringkasan Broadcast</div>
                  <div className="mt-1 text-sm font-semibold text-foreground">
                    {hasTargets ? `Siap kirim ke ${activeRecipientCount} device aktif` : 'Belum siap dikirim live'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setItems([])}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all"
                >
                  Kosongkan Playlist
                </button>
              </div>
              <div className="mt-3 grid gap-2 text-[11px] text-muted-foreground sm:grid-cols-2">
                <div className="rounded-xl border border-border/70 bg-background/30 px-3 py-2">
                  {isGlobal
                    ? 'Mode global aktif. Semua device aktif akan menerima live broadcast.'
                    : `Assignment saat ini: ${assignedGroupCount} grup dan ${assignedDeviceCount} device override.`}
                </div>
                <div className="rounded-xl border border-border/70 bg-background/30 px-3 py-2">
                  {nextUpItems.length > 0
                    ? `Awal playlist: ${nextUpItems.map((item) => item.title).join(' • ')}`
                    : 'Belum ada item di playlist.'}
                </div>
              </div>
            </div>
          )}

          {/* Running Text Overlay Panel */}
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">Running Text Overlay</div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Teks berjalan yang menumpuki video broadcast secara bersamaan.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOverlayEnabled((v) => !v)}
                className={`rounded-xl px-3 py-1.5 text-[11px] font-bold border transition-all select-none cursor-pointer ${
                  overlayEnabled
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-300 hover:bg-amber-500/25'
                    : 'bg-muted/10 border-border text-muted-foreground hover:bg-muted/20'
                }`}
              >
                {overlayEnabled ? 'Aktif' : 'Nonaktif'}
              </button>
            </div>

            {overlayEnabled && (
              <div className="space-y-3">
                {/* Speed setting */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-accent/10 border border-border/60">
                  <label>
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Speed Marquee (detik per loop)
                    </span>
                    <input
                      type="number"
                      value={overlaySpeed}
                      onChange={(e) => setOverlaySpeed(Math.max(1, Math.min(600, parseInt(e.target.value) || 20)))}
                      min={1}
                      max={600}
                      className="field-input py-1.5 text-xs w-full"
                    />
                  </label>
                  <div className="flex items-end">
                    <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-200/80 w-full">
                      Teks akan berjalan di bagian bawah layar selama video broadcast berlangsung.
                    </div>
                  </div>
                </div>

                {/* Overlay items list */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Daftar Pesan Overlay
                    </span>
                    <button
                      type="button"
                      onClick={handleAddOverlayItem}
                      className="rounded-lg border border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 text-[10px] font-bold text-amber-300 transition-all select-none cursor-pointer"
                    >
                      + Tambah Pesan
                    </button>
                  </div>

                  {overlayItems.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-[11px] text-muted-foreground bg-accent/5">
                      Belum ada pesan overlay. Klik <strong>+ Tambah Pesan</strong> untuk menambahkan.
                    </div>
                  ) : (
                    overlayItems.map((item, idx) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-border bg-accent/5 p-3 flex gap-3 items-center hover:border-amber-500/20 hover:bg-accent/10 transition-all"
                      >
                        <div className="flex items-center justify-center font-mono text-[10px] font-bold text-muted-foreground bg-accent/20 w-7 h-7 rounded-lg border border-border shrink-0 select-none">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <textarea
                            value={item.text}
                            onChange={(e) => handleUpdateOverlayItem(item.id, { text: e.target.value })}
                            className="field-input py-1.5 px-3 text-xs w-full min-h-[38px] resize-none"
                            placeholder="Ketik isi running text overlay di sini..."
                            rows={1}
                          />
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleUpdateOverlayItem(item.id, { enabled: !item.enabled })}
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
                            onClick={() => handleDeleteOverlayItem(item.id)}
                            className="rounded-lg border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 px-2.5 py-1.5 text-[10px] font-bold text-rose-400 transition-all select-none cursor-pointer"
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Preview */}
                {overlayItems.some((i) => i.enabled && i.text.trim()) && (
                  <div className="rounded-xl bg-black/40 border border-amber-500/20 p-3 space-y-1">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-amber-400">Preview Overlay</div>
                    <div className="rounded-lg border border-white/5 bg-black/30 px-3 py-2 overflow-hidden">
                      <div className="text-[9px] uppercase tracking-[0.24em] text-amber-300/80">Live Ticker</div>
                      <div className="mt-1 overflow-hidden whitespace-nowrap text-xs font-medium text-amber-100">
                        {overlayItems
                          .filter((i) => i.enabled && i.text.trim())
                          .map((i) => i.text)
                          .join('   |   ')}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t border-border">
            <button
              type="submit"
              disabled={items.length === 0}
              className="flex-1 btn btn-primary py-2.5 font-semibold text-xs rounded-xl shadow-md cursor-pointer select-none disabled:opacity-40 disabled:cursor-not-allowed"
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
          <h3 className="text-sm font-semibold text-foreground">Status Preview</h3>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total Video</span>
              <span className="font-semibold text-foreground">{items.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total Putar</span>
              <span className="font-semibold text-foreground">
                {items.reduce((acc, curr) => acc + curr.repeatCount, 0)}x
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className={`font-semibold ${items.length > 0 ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                {items.length > 0 ? 'Siap Broadcast' : 'Tidak aktif'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Target Aktif</span>
              <span className={`font-semibold ${hasTargets ? 'text-foreground' : 'text-amber-300'}`}>
                {activeRecipientCount} device
              </span>
            </div>
          </div>

          {/* Preview Playlist */}
          {items.length > 0 && (
            <div className="rounded-xl bg-primary/5 border border-primary/15 p-3.5 space-y-1.5">
              <div className="text-[9px] font-bold uppercase tracking-wider text-primary">Preview Playlist</div>
              <div className="text-xs text-foreground leading-relaxed font-medium bg-accent/10 p-2 rounded-lg border border-border max-h-[120px] overflow-y-auto space-y-1">
                {playlistWithMeta.map((item, idx) => (
                  <div key={idx} className="truncate">
                    {idx + 1}. 🎬 {item.title} ({item.repeatCount}x)
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-border bg-background/20 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <span>Distribusi Target</span>
              <span>{hasTargets ? 'Aktif' : 'Standby'}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl border border-border/70 bg-accent/10 p-3">
                <div className="text-muted-foreground">Group Assign</div>
                <div className="mt-1 text-lg font-semibold text-foreground">{assignedGroupCount}</div>
              </div>
              <div className="rounded-xl border border-border/70 bg-accent/10 p-3">
                <div className="text-muted-foreground">Device Override</div>
                <div className="mt-1 text-lg font-semibold text-foreground">{assignedDeviceCount}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Push Form */}
        <form
          ref={formRef}
          onSubmit={(e) => e.preventDefault()}
          className="card rounded-2xl p-5 border border-border bg-card text-card-foreground shadow-sm space-y-4"
        >
          <input type="hidden" name="profileId" value={profileId} />
          <input type="hidden" name="videoItemsJson" value={JSON.stringify(items)} />
          {/* Legacy fallback inputs */}
          <input type="hidden" name="videoId" value={fallbackVideoId} />
          <input type="hidden" name="repeatCount" value={fallbackRepeatCount} />
          <input type="hidden" name="enabled" value="on" />
          {/* Running text overlay inputs */}
          <input type="hidden" name="overlayEnabled" value={overlayEnabled ? 'on' : 'off'} />
          <input type="hidden" name="overlayItemsJson" value={JSON.stringify(overlayItems)} />
          <input type="hidden" name="overlaySpeed" value={overlaySpeed} />

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Broadcast Live ke Device</h3>
            <p className="text-[10px] text-muted-foreground leading-normal">
              Kirim playlist video langsung ke layar device target secara real-time. Target diresolusi otomatis dari assignment profile ({targetLabel}).
            </p>
          </div>

          {!hasTargets && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-[11px] font-medium text-amber-200">
              {hasAssignments
                ? 'Profile ini sudah di-assign, tetapi saat ini belum ada device aktif yang bisa menerima live broadcast.'
                : 'Profile ini belum punya target. Assign dulu ke group atau device sebelum mengirim live broadcast.'}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setShowPlayConfirm(true)}
              disabled={items.length === 0 || !hasTargets}
              className="w-full rounded-xl border border-emerald-400/20 bg-emerald-500/10 hover:bg-emerald-500/15 py-2.5 text-xs font-bold text-emerald-300 transition-all cursor-pointer select-none disabled:opacity-40 disabled:cursor-not-allowed"
            >
              📹 Broadcast Sekarang
            </button>
            <button
              type="button"
              onClick={() => setShowStopConfirm(true)}
              disabled={!hasTargets}
              className="w-full rounded-xl border border-rose-400/20 bg-rose-500/10 hover:bg-rose-500/15 py-2.5 text-xs font-bold text-rose-300 transition-all cursor-pointer select-none disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ⏹ Stop Broadcast
            </button>
          </div>

          <div className="rounded-xl border border-border bg-background/20 p-3 text-[11px] text-muted-foreground space-y-1.5">
            <div className="font-semibold text-foreground">Sebelum kirim live</div>
            <div>Pastikan device target sedang online dan video yang dipilih masih publish.</div>
            <div>Perintah live akan langsung menggantikan tampilan yang sedang berjalan di device target.</div>
          </div>

          <p className="text-[10px] text-muted-foreground/60 leading-relaxed bg-accent/10 p-2.5 rounded-lg border border-border">
            <strong>Catatan:</strong> Tombol broadcast mengirimkan playlist video langsung ke device target secara real-time tanpa perlu restart aplikasi.
          </p>
        </form>
      </div>

      {/* Confirmation Modal: Play Now */}
      {showPlayConfirm && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/78 p-4 backdrop-blur-md animate-fade-in" onClick={() => !isPlayPending && setShowPlayConfirm(false)}>
          <div className="w-full max-w-md rounded-[28px] border border-border bg-card p-6 shadow-[0_30px_90px_rgba(0,0,0,0.55)] animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
              </svg>
            </div>
            <div className="mt-5 space-y-2 text-center">
              <h3 className="text-lg font-semibold text-foreground">Konfirmasi Broadcast</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Playlist berisi <strong className="text-foreground">{items.length} video</strong> akan segera ditampilkan di <strong className="text-foreground">{targetLabel}</strong>.
              </p>
              <div className="grid grid-cols-3 gap-2 pt-1 text-left">
                <div className="rounded-xl border border-border bg-accent/20 px-3 py-2">
                  <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Target</div>
                  <div className="mt-1 text-sm font-semibold text-foreground">{activeRecipientCount}</div>
                </div>
                <div className="rounded-xl border border-border bg-accent/20 px-3 py-2">
                  <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Item</div>
                  <div className="mt-1 text-sm font-semibold text-foreground">{items.length}</div>
                </div>
                <div className="rounded-xl border border-border bg-accent/20 px-3 py-2">
                  <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Total Loop</div>
                  <div className="mt-1 text-sm font-semibold text-foreground">{totalPlayCount}x</div>
                </div>
              </div>
              {items.length > 0 && (
                <div className="mt-3 text-left max-h-[120px] overflow-y-auto text-[11px] bg-accent/20 border border-border p-2.5 rounded-xl space-y-0.5 text-muted-foreground">
                  {playlistWithMeta.map((item, idx) => (
                    <div key={idx} className="truncate">
                      {idx + 1}. {item.title} ({item.repeatCount}x)
                    </div>
                  ))}
                </div>
              )}
            </div>

            {playError && (
              <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs font-semibold text-rose-300">
                {playError}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                disabled={isPlayPending}
                onClick={() => setShowPlayConfirm(false)}
                className="btn btn-secondary flex-1 py-2.5"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isPlayPending}
                onClick={handlePlayConfirm}
                className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 text-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isPlayPending ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Memproses...
                  </>
                ) : (
                  'Ya, Broadcast Sekarang'
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Confirmation Modal: Stop Broadcast */}
      {showStopConfirm && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/78 p-4 backdrop-blur-md animate-fade-in" onClick={() => !isStopPending && setShowStopConfirm(false)}>
          <div className="w-full max-w-md rounded-[28px] border border-border bg-card p-6 shadow-[0_30px_90px_rgba(0,0,0,0.55)] animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-300">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
              </svg>
            </div>
            <div className="mt-5 space-y-2 text-center">
              <h3 className="text-lg font-semibold text-foreground">Konfirmasi Stop Broadcast</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Broadcast akan dihentikan di <strong className="text-foreground">{targetLabel}</strong>. Perintah ini akan dikirim segera.
              </p>
              <div className="rounded-xl border border-border bg-accent/20 px-3 py-2 text-left text-[11px] text-muted-foreground">
                Device yang menerima perintah stop: <strong className="text-foreground">{activeRecipientCount}</strong>
              </div>
            </div>

            {stopError && (
              <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs font-semibold text-rose-300">
                {stopError}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                disabled={isStopPending}
                onClick={() => setShowStopConfirm(false)}
                className="btn btn-secondary flex-1 py-2.5"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isStopPending}
                onClick={handleStopConfirm}
                className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 text-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isStopPending ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Memproses...
                  </>
                ) : (
                  'Ya, Stop Sekarang'
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Tambah Video Baru */}
      {showAddVideoModal && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/78 p-4 backdrop-blur-md animate-fade-in" onClick={() => setShowAddVideoModal(false)}>
          <div className="w-full max-w-lg rounded-[28px] border border-border bg-card p-6 shadow-[0_30px_90px_rgba(0,0,0,0.55)] animate-slide-up overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-white">Tambah Video Baru</h3>
              <button
                type="button"
                onClick={() => setShowAddVideoModal(false)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer select-none border border-white/10 hover:border-white/20 bg-white/5 rounded-lg px-2.5 py-1 transition-all"
              >
                Tutup
              </button>
            </div>
            
            <VideoRepoForm
              folders={folders}
              selectedFolderId={null}
              surface="plain"
              onSuccess={(newVideo) => {
                setShowAddVideoModal(false)
                setSelectedAddVideoId(String(newVideo.id))
              }}
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
