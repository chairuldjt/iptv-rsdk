'use client'

import { useState, useRef, useTransition } from 'react'
import { createPortal } from 'react-dom'
import type { HomeExperienceRunningTextItem } from '@/lib/homeExperience'
import type { RunningTextStyle } from '@/lib/runningText'
import { FALLBACK_RUNNING_TEXT_STYLE } from '@/lib/runningText'

// ── Font options ─────────────────────────────────────────────────────────────

const FONT_FAMILIES = [
  { label: 'Sans Serif (Default)', value: 'sans-serif' },
  { label: 'Serif', value: 'serif' },
  { label: 'Monospace', value: 'monospace' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Helvetica', value: 'Helvetica, Arial, sans-serif' },
  { label: 'Roboto', value: 'Roboto, sans-serif' },
  { label: 'Open Sans', value: '"Open Sans", sans-serif' },
  { label: 'Poppins', value: 'Poppins, sans-serif' },
  { label: 'Inter', value: 'Inter, sans-serif' },
  { label: 'Lato', value: 'Lato, sans-serif' },
  { label: 'Montserrat', value: 'Montserrat, sans-serif' },
  { label: 'Noto Sans', value: '"Noto Sans", sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
  { label: 'Courier New', value: '"Courier New", monospace' },
  { label: 'Cursive', value: 'cursive' },
]

// ── Types ────────────────────────────────────────────────────────────────────

type RunningTextPanelClientProps = {
  profileId: string
  profileName: string
  runningText: {
    enabled: boolean
    visibleCount: number
    rotationSeconds: number
    displaySeconds: number
    items: HomeExperienceRunningTextItem[]
    style?: RunningTextStyle
  }
  isGlobal: boolean
  assignedGroupCount: number
  assignedDeviceCount: number
  saveAction: (fd: FormData) => Promise<void>
  pushLiveAction: (fd: FormData) => Promise<void>
  stopLiveAction: (fd: FormData) => Promise<void>
}

// ── Helper: hex to rgba ──────────────────────────────────────────────────────

function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${opacity / 100})`
}

// ── Component ────────────────────────────────────────────────────────────────

export default function RunningTextPanelClient({
  profileId,
  profileName,
  runningText,
  isGlobal,
  assignedGroupCount,
  assignedDeviceCount,
  saveAction,
  pushLiveAction,
  stopLiveAction,
}: RunningTextPanelClientProps) {
  // Client state for running text parameters
  const [items, setItems] = useState<HomeExperienceRunningTextItem[]>(runningText.items)
  const [rotationSeconds, setRotationSeconds] = useState<number>(runningText.rotationSeconds)
  const [displaySeconds, setDisplaySeconds] = useState<number>(runningText.displaySeconds)

  // Style state
  const [style, setStyle] = useState<RunningTextStyle>(runningText.style ?? FALLBACK_RUNNING_TEXT_STYLE)
  const [showStyleEditor, setShowStyleEditor] = useState(false)

  // Confirmation state
  const [showPushConfirm, setShowPushConfirm] = useState(false)
  const [showStopConfirm, setShowStopConfirm] = useState(false)

  const formRef = useRef<HTMLFormElement>(null)
  const [isPushPending, startPushTransition] = useTransition()
  const [isStopPending, startStopTransition] = useTransition()
  const [pushError, setPushError] = useState<string | null>(null)
  const [stopError, setStopError] = useState<string | null>(null)

  const updateStyle = (patch: Partial<RunningTextStyle>) => {
    setStyle((prev) => ({ ...prev, ...patch }))
  }

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

  const handleStopConfirm = () => {
    setStopError(null)
    if (!formRef.current) return
    const formData = new FormData(formRef.current)
    startStopTransition(async () => {
      try {
        await stopLiveAction(formData)
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
        console.error('Stop live action failed:', err)
        setStopError(err instanceof Error ? err.message : 'Gagal menghentikan marquee live.')
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
  const isEnabled = activeItems.length > 0

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

  // Compute preview text
  const previewText = activeItems.length > 0
    ? activeItems.map((i) => i.text).join(style.separator)
    : 'Contoh preview running text akan tampil di sini...'

  // Compute preview inline styles
  const previewBgStyle = hexToRgba(style.bgColor, style.bgOpacity)
  const previewTextStyle: React.CSSProperties = {
    fontFamily: style.fontFamily,
    fontSize: `${Math.min(style.fontSize, 28)}px`, // cap preview size
    fontWeight: style.fontWeight,
    fontStyle: style.fontStyle,
    color: style.textColor,
    textShadow: style.textShadow ? '1px 1px 3px rgba(0,0,0,0.7)' : 'none',
    textTransform: style.textTransform as React.CSSProperties['textTransform'],
    whiteSpace: 'nowrap',
  }

  const styleJsonValue = JSON.stringify(style)

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
          <input type="hidden" name="rtVisibleCount" value={1} />
          {/* Main settings row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-accent/15 border border-border/80">
            <label>
              <span className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Speed Marquee (Detik per Loop)</span>
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
            <label>
              <span className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Timer Stop Live (Detik) (0 = tanpa batas)</span>
              <input
                type="number"
                name="rtDisplaySeconds"
                value={displaySeconds}
                onChange={(e) => setDisplaySeconds(Math.max(0, Math.min(600, parseInt(e.target.value) || 0)))}
                min={0}
                max={600}
                className="field-input py-1.5 text-xs w-full"
              />
            </label>
          </div>

          {/* Hidden payloads */}
          <input type="hidden" name="rtItemsJson" value={JSON.stringify(items)} />
          <input type="hidden" name="rtStyleJson" value={styleJsonValue} />

          {/* ── Style Editor Toggle ─────────────────────────────────────── */}
          <div className="border border-border rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowStyleEditor(!showStyleEditor)}
              className="w-full flex items-center justify-between px-4 py-3 bg-accent/10 hover:bg-accent/20 transition-colors cursor-pointer select-none"
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
                </svg>
                <span className="text-xs font-semibold text-foreground">Desain & Layout Running Text</span>
              </div>
              <svg className={`w-4 h-4 text-muted-foreground transition-transform ${showStyleEditor ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showStyleEditor && (
              <div className="p-4 space-y-4 border-t border-border bg-accent/5">
                {/* Row 1: Font Family + Font Size */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label>
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Jenis Font</span>
                    <select
                      value={style.fontFamily}
                      onChange={(e) => updateStyle({ fontFamily: e.target.value })}
                      className="field-input py-1.5 text-xs w-full"
                    >
                      {FONT_FAMILIES.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Ukuran Font (px)</span>
                    <input
                      type="number"
                      value={style.fontSize}
                      onChange={(e) => updateStyle({ fontSize: Math.max(10, Math.min(120, parseInt(e.target.value) || 24)) })}
                      min={10}
                      max={120}
                      className="field-input py-1.5 text-xs w-full"
                    />
                  </label>
                </div>

                {/* Row 2: Font Weight + Font Style */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label>
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Ketebalan Font</span>
                    <select
                      value={style.fontWeight}
                      onChange={(e) => updateStyle({ fontWeight: e.target.value as RunningTextStyle['fontWeight'] })}
                      className="field-input py-1.5 text-xs w-full"
                    >
                      <option value="lighter">Lighter (Tipis)</option>
                      <option value="normal">Normal</option>
                      <option value="bold">Bold (Tebal)</option>
                      <option value="bolder">Bolder (Lebih Tebal)</option>
                    </select>
                  </label>
                  <label>
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Gaya Font</span>
                    <select
                      value={style.fontStyle}
                      onChange={(e) => updateStyle({ fontStyle: e.target.value as RunningTextStyle['fontStyle'] })}
                      className="field-input py-1.5 text-xs w-full"
                    >
                      <option value="normal">Normal</option>
                      <option value="italic">Italic (Miring)</option>
                    </select>
                  </label>
                </div>

                {/* Row 3: Text Color + BG Color */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label>
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Warna Teks</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={style.textColor}
                        onChange={(e) => updateStyle({ textColor: e.target.value })}
                        className="w-9 h-9 rounded-lg border border-border cursor-pointer bg-transparent p-0.5"
                      />
                      <input
                        type="text"
                        value={style.textColor}
                        onChange={(e) => {
                          const v = e.target.value
                          if (/^#[0-9a-fA-F]{6}$/.test(v)) updateStyle({ textColor: v })
                        }}
                        className="field-input py-1.5 text-xs flex-1 font-mono"
                        placeholder="#FFFFFF"
                        maxLength={7}
                      />
                    </div>
                  </label>
                  <label>
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Warna Background</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={style.bgColor}
                        onChange={(e) => updateStyle({ bgColor: e.target.value })}
                        className="w-9 h-9 rounded-lg border border-border cursor-pointer bg-transparent p-0.5"
                      />
                      <input
                        type="text"
                        value={style.bgColor}
                        onChange={(e) => {
                          const v = e.target.value
                          if (/^#[0-9a-fA-F]{6}$/.test(v)) updateStyle({ bgColor: v })
                        }}
                        className="field-input py-1.5 text-xs flex-1 font-mono"
                        placeholder="#000000"
                        maxLength={7}
                      />
                    </div>
                  </label>
                </div>

                {/* Row 4: BG Opacity + Padding Y */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label>
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Opacity Background ({style.bgOpacity}%)</span>
                    <input
                      type="range"
                      value={style.bgOpacity}
                      onChange={(e) => updateStyle({ bgOpacity: parseInt(e.target.value) })}
                      min={0}
                      max={100}
                      step={5}
                      className="w-full accent-primary h-2 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
                      <span>Transparan</span>
                      <span>Solid</span>
                    </div>
                  </label>
                  <label>
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Padding Vertikal (px)</span>
                    <input
                      type="number"
                      value={style.paddingY}
                      onChange={(e) => updateStyle({ paddingY: Math.max(0, Math.min(60, parseInt(e.target.value) || 0)) })}
                      min={0}
                      max={60}
                      className="field-input py-1.5 text-xs w-full"
                    />
                  </label>
                </div>

                {/* Row 5: Position + Direction */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label>
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Posisi di Layar</span>
                    <select
                      value={style.position}
                      onChange={(e) => updateStyle({ position: e.target.value as RunningTextStyle['position'] })}
                      className="field-input py-1.5 text-xs w-full"
                    >
                      <option value="bottom">Bawah Layar</option>
                      <option value="top">Atas Layar</option>
                    </select>
                  </label>
                  <label>
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Arah Gerak</span>
                    <select
                      value={style.direction}
                      onChange={(e) => updateStyle({ direction: e.target.value as RunningTextStyle['direction'] })}
                      className="field-input py-1.5 text-xs w-full"
                    >
                      <option value="left">Kiri (Default)</option>
                      <option value="right">Kanan</option>
                    </select>
                  </label>
                </div>

                {/* Row 6: Text Transform + Separator */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label>
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Transformasi Teks</span>
                    <select
                      value={style.textTransform}
                      onChange={(e) => updateStyle({ textTransform: e.target.value as RunningTextStyle['textTransform'] })}
                      className="field-input py-1.5 text-xs w-full"
                    >
                      <option value="none">Tidak Ada</option>
                      <option value="uppercase">HURUF BESAR SEMUA</option>
                      <option value="lowercase">huruf kecil semua</option>
                      <option value="capitalize">Huruf Besar Tiap Kata</option>
                    </select>
                  </label>
                  <label>
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Pemisah Antar Pesan</span>
                    <input
                      type="text"
                      value={style.separator}
                      onChange={(e) => updateStyle({ separator: e.target.value })}
                      className="field-input py-1.5 text-xs w-full font-mono"
                      placeholder="   |   "
                    />
                  </label>
                </div>

                {/* Row 7: Toggles */}
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={style.textShadow}
                      onChange={(e) => updateStyle({ textShadow: e.target.checked })}
                      className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
                    />
                    <span className="text-xs text-foreground">Bayangan Teks (Text Shadow)</span>
                  </label>
                </div>

                {/* Reset to default */}
                <div className="pt-2 border-t border-border/50">
                  <button
                    type="button"
                    onClick={() => setStyle(FALLBACK_RUNNING_TEXT_STYLE)}
                    className="text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer select-none"
                  >
                    Reset ke Default
                  </button>
                </div>
              </div>
            )}
          </div>

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
                      className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold border transition-all select-none cursor-pointer ${item.enabled
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

      {/* Right: Live Push + Status + Preview */}
      <div className="space-y-4">
        {/* Live Preview Card */}
        <div className="card rounded-2xl p-5 border border-border bg-card text-card-foreground shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Preview Running Text</h3>
          <p className="text-[10px] text-muted-foreground leading-normal">
            Preview tampilan running text sesuai konfigurasi desain. Tampilan di device mungkin sedikit berbeda tergantung resolusi layar.
          </p>

          {/* Simulated TV screen */}
          <div className="relative rounded-xl border border-white/10 bg-gradient-to-b from-slate-800 to-slate-900 overflow-hidden" style={{ aspectRatio: '16/9' }}>
            {/* Fake TV content */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-1">
                <svg className="w-8 h-8 text-white/15 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 20.25h12m-7.5-3v3m3-3v3m-10.125-3h17.25c.621 0 1.125-.504 1.125-1.125V4.875c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125z" />
                </svg>
                <div className="text-[9px] text-white/20 font-medium">Layar Device</div>
              </div>
            </div>

            {/* Running text bar */}
            <div
              className={`absolute left-0 right-0 ${style.position === 'top' ? 'top-0' : 'bottom-0'}`}
              style={{
                backgroundColor: previewBgStyle,
                paddingTop: `${Math.min(style.paddingY, 16)}px`,
                paddingBottom: `${Math.min(style.paddingY, 16)}px`,
              }}
            >
              <div className="overflow-hidden px-2">
                <div
                  className="inline-block animate-marquee-preview"
                  style={previewTextStyle}
                >
                  {previewText}
                </div>
              </div>
            </div>
          </div>

          {/* Style summary */}
          <div className="space-y-1.5 text-[10px]">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Font</span>
              <span className="font-semibold text-foreground truncate max-w-[180px]" style={{ fontFamily: style.fontFamily }}>
                {FONT_FAMILIES.find(f => f.value === style.fontFamily)?.label || style.fontFamily}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Ukuran</span>
              <span className="font-semibold text-foreground">{style.fontSize}px / {style.fontWeight}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Warna</span>
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded border border-white/10" style={{ backgroundColor: style.textColor }} />
                <span className="font-mono font-semibold text-foreground">{style.textColor}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Background</span>
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded border border-white/10" style={{ backgroundColor: style.bgColor, opacity: style.bgOpacity / 100 }} />
                <span className="font-mono font-semibold text-foreground">{style.bgColor} ({style.bgOpacity}%)</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Posisi / Arah</span>
              <span className="font-semibold text-foreground">{style.position === 'top' ? 'Atas' : 'Bawah'} / {style.direction === 'left' ? 'Kiri' : 'Kanan'}</span>
            </div>
          </div>
        </div>

        {/* Status Card */}
        <div className="card rounded-2xl p-5 border border-border bg-card text-card-foreground shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Status Preview Live</h3>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status (Unsaved)</span>
              <span className={`font-semibold ${isEnabled ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                {isEnabled ? 'Siap Tayang' : 'Belum Ada Pesan Aktif'}
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
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Speed Marquee</span>
              <span className="font-semibold text-foreground">{rotationSeconds} dtk/loop</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Timer Stop Live</span>
              <span className="font-semibold text-foreground">{displaySeconds > 0 ? `${displaySeconds} dtk` : 'Tidak ada'}</span>
            </div>
          </div>
        </div>

        {/* Live Push Form */}
        <form
          ref={formRef}
          onSubmit={(e) => e.preventDefault()}
          className="card rounded-2xl p-5 border border-border bg-card text-card-foreground shadow-sm space-y-4"
        >
          {/* Synchronize editor state to this form's submission inputs */}
          <input type="hidden" name="profileId" value={profileId} />
          <input type="hidden" name="rtVisibleCount" value={1} />
          <input type="hidden" name="rtRotationSeconds" value={rotationSeconds} />
          <input type="hidden" name="rtDisplaySeconds" value={displaySeconds} />
          <input type="hidden" name="rtItemsJson" value={JSON.stringify(items)} />
          <input type="hidden" name="rtStyleJson" value={styleJsonValue} />

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Kirim Live ke Device</h3>
            <p className="text-[10px] text-muted-foreground leading-normal">
              Dorong config running text (bisa yang belum disimpan) langsung ke memori runtime device aktif. Target diresolusi otomatis dari assignment profile ({targetLabel}).
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setShowPushConfirm(true)}
              disabled={!hasTargets}
              className="w-full rounded-xl border border-emerald-400/20 bg-emerald-500/10 hover:bg-emerald-500/15 py-2.5 text-xs font-bold text-emerald-300 transition-all cursor-pointer select-none disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Kirim Live
            </button>
            <button
              type="button"
              onClick={() => setShowStopConfirm(true)}
              disabled={!hasTargets}
              className="w-full rounded-xl border border-rose-400/20 bg-rose-500/10 hover:bg-rose-500/15 py-2.5 text-xs font-bold text-rose-300 transition-all cursor-pointer select-none disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Stop Broadcast
            </button>
          </div>

          <p className="text-[10px] text-muted-foreground/60 leading-relaxed bg-accent/10 p-2.5 rounded-lg border border-border">
            <strong>Catatan UX:</strong> Marquee live tampil di bagian paling bawah layar seperti RSS feed. Jika timer diisi, override live akan berhenti otomatis setelah waktunya habis; jika `0`, override bertahan sampai sync config berikutnya.
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

      {showStopConfirm && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/78 p-4 backdrop-blur-md animate-fade-in" onClick={() => !isStopPending && setShowStopConfirm(false)}>
          <div className="w-full max-w-md rounded-[28px] border border-border bg-card p-6 shadow-[0_30px_90px_rgba(0,0,0,0.55)] animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-300">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9A2.25 2.25 0 0116.5 18.75h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
              </svg>
            </div>
            <div className="mt-5 space-y-2 text-center">
              <h3 className="text-lg font-semibold text-foreground">Konfirmasi Stop Live</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Marquee live akan dihentikan untuk <strong className="text-foreground">{targetLabel}</strong>.
              </p>
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
                {isStopPending ? 'Memproses...' : 'Ya, Stop Sekarang'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
