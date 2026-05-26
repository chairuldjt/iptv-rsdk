'use client'

import { useState } from 'react'
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
  groups: Array<{ id: string; name: string; color: string }>
  devices: Array<{ deviceId: string; deviceName: string; isActive: boolean; groupName: string | null }>
  saveAction: (fd: FormData) => Promise<void>
  pushLiveAction: (fd: FormData) => Promise<void>
}

export default function RunningTextPanelClient({
  profileId,
  profileName,
  runningText,
  groups,
  devices,
  saveAction,
  pushLiveAction,
}: RunningTextPanelClientProps) {
  // Client state for running text parameters
  const [items, setItems] = useState<HomeExperienceRunningTextItem[]>(runningText.items)
  const [enabled, setEnabled] = useState<boolean>(runningText.enabled)
  const [visibleCount, setVisibleCount] = useState<number>(runningText.visibleCount)
  const [rotationSeconds, setRotationSeconds] = useState<number>(runningText.rotationSeconds)
  const [displaySeconds, setDisplaySeconds] = useState<number>(runningText.displaySeconds)

  // Live targeting state
  const [liveTarget, setLiveTarget] = useState<string>('global')
  const [liveGroupId, setLiveGroupId] = useState<string>(groups[0]?.id || '')
  const [liveDeviceId, setLiveDeviceId] = useState<string>(devices[0]?.deviceId || '')
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([])

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

  const handleDeviceSelectionToggle = (deviceId: string) => {
    setSelectedDeviceIds((current) =>
      current.includes(deviceId)
        ? current.filter((id) => id !== deviceId)
        : [...current, deviceId]
    )
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-accent/20 border border-border">
            <label className="flex flex-col justify-center">
              <span className="block text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Status</span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="rtEnabled"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="h-4 w-4 rounded accent-primary cursor-pointer"
                />
                <span className="text-xs font-medium text-foreground select-none">Aktif</span>
              </label>
            </label>
            <label>
              <span className="block text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Visible Count</span>
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
              <span className="block text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Rotation (s)</span>
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
              <span className="block text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Display (s)</span>
              <input
                type="number"
                name="rtDisplaySeconds"
                value={displaySeconds}
                onChange={(e) => setDisplaySeconds(Math.max(1, Math.min(600, parseInt(e.target.value) || 10)))}
                min={1}
                max={600}
                className="field-input py-1.5 text-xs w-full"
              />
            </label>
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
              items.map((item) => (
                <div key={item.id} className="rounded-xl border border-border bg-accent/10 p-3.5 space-y-3 transition-all">
                  <div className="grid grid-cols-1 md:grid-cols-[160px_minmax(0,1fr)_auto] gap-3 items-start">
                    {/* ID */}
                    <div>
                      <span className="block text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">ID Ticker</span>
                      <input
                        type="text"
                        value={item.id}
                        onChange={(e) => handleUpdateItem(item.id, { id: e.target.value })}
                        className="field-input py-1.5 text-xs font-mono w-full"
                        placeholder="Contoh: ticker_1"
                      />
                    </div>
                    {/* Text */}
                    <div>
                      <span className="block text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Isi Pesan</span>
                      <textarea
                        value={item.text}
                        onChange={(e) => handleUpdateItem(item.id, { text: e.target.value })}
                        className="field-input min-h-[64px] py-1.5 text-xs w-full resize-y"
                        placeholder="Ketik isi running text di sini..."
                      />
                    </div>
                    {/* Actions */}
                    <div className="flex md:flex-col gap-2 pt-4 md:pt-4 justify-between md:justify-start shrink-0">
                      <label className="flex items-center gap-1.5 cursor-pointer bg-accent/20 px-2 py-1.5 rounded-lg border border-border hover:bg-accent/40">
                        <input
                          type="checkbox"
                          checked={item.enabled}
                          onChange={(e) => handleUpdateItem(item.id, { enabled: e.target.checked })}
                          className="h-3.5 w-3.5 rounded accent-primary cursor-pointer"
                        />
                        <span className="text-[10px] font-semibold text-foreground select-none">Aktif</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        className="rounded-lg border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 px-2.5 py-1.5 text-[10px] font-bold text-rose-450 transition-all select-none cursor-pointer"
                      >
                        Hapus
                      </button>
                    </div>
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
        <form action={pushLiveAction} className="card rounded-2xl p-5 border border-border bg-card text-card-foreground shadow-sm space-y-4">
          {/* Synchronize editor state to this form's submission inputs */}
          <input type="hidden" name="rtEnabled" value={enabled ? 'on' : 'off'} />
          <input type="hidden" name="rtVisibleCount" value={visibleCount} />
          <input type="hidden" name="rtItemsJson" value={JSON.stringify(items)} />

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Kirim Live ke Device</h3>
            <p className="text-[10px] text-muted-foreground leading-normal">
              Dorong config running text (bisa yang belum disimpan) langsung ke memori runtime device aktif.
            </p>
          </div>

          <label className="block">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Target Kirim</span>
            <select
              name="rtLiveTarget"
              value={liveTarget}
              onChange={(e) => setLiveTarget(e.target.value)}
              className="field-input py-2 text-xs w-full cursor-pointer"
            >
              <option value="global">Semua Device Aktif</option>
              <option value="group">Per Group</option>
              <option value="device">Satu Device</option>
              <option value="selected">Pilih Manual</option>
            </select>
          </label>

          {liveTarget === 'group' && groups.length > 0 && (
            <label className="block animate-slide-down">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Pilih Group</span>
              <select
                name="rtLiveGroupId"
                value={liveGroupId}
                onChange={(e) => setLiveGroupId(e.target.value)}
                className="field-input py-2 text-xs w-full cursor-pointer"
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </label>
          )}

          {liveTarget === 'device' && devices.length > 0 && (
            <label className="block animate-slide-down">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Pilih Device</span>
              <select
                name="rtLiveDeviceId"
                value={liveDeviceId}
                onChange={(e) => setLiveDeviceId(e.target.value)}
                className="field-input py-2 text-xs w-full cursor-pointer"
              >
                {devices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.deviceName} {d.groupName ? `(${d.groupName})` : ''} {!d.isActive ? '• Nonaktif' : ''}
                  </option>
                ))}
              </select>
            </label>
          )}

          {liveTarget === 'selected' && (
            <div className="space-y-2 animate-slide-down">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Pilih Device (Multi-select)</span>
              <div className="rounded-xl border border-border bg-accent/10 max-h-[160px] overflow-y-auto p-2 space-y-1.5">
                {devices.map((d) => (
                  <label key={d.deviceId} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent/20 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      name="rtSelectedDeviceIds"
                      value={d.deviceId}
                      checked={selectedDeviceIds.includes(d.deviceId)}
                      onChange={() => handleDeviceSelectionToggle(d.deviceId)}
                      className="h-4.5 w-4.5 rounded accent-primary cursor-pointer"
                    />
                    <span className="flex-1 min-w-0">
                      <span className="block text-foreground truncate font-medium">{d.deviceName}</span>
                      <span className="text-[9px] text-muted-foreground font-mono">{d.deviceId} {d.groupName ? `• ${d.groupName}` : ''}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-xl border border-emerald-400/20 bg-emerald-500/10 hover:bg-emerald-500/15 py-2.5 text-xs font-bold text-emerald-300 transition-all cursor-pointer select-none"
          >
            📢 Kirim Live ke Device
          </button>

          <p className="text-[10px] text-muted-foreground/60 leading-relaxed bg-accent/10 p-2.5 rounded-lg border border-border">
            <strong>Catatan UX:</strong> Tombol ini langsung mengirimkan pesan-pesan di atas ke memori device target secara real-time tanpa perlu restart app atau menyimpan konfigurasi terlebih dahulu.
          </p>
        </form>
      </div>
    </div>
  )
}
