'use client'

import { useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import type { OnDemandHlsRelayConfig } from '@/lib/settings'
import type { PlaylistRelaySettings } from '@/lib/playlistRelay'

interface PlaylistRelaySettingsModalProps {
  playlist: {
    id: number
    name: string
  }
  settings: PlaylistRelaySettings
  globalConfig: OnDemandHlsRelayConfig
  showSuccess: boolean
  savePlaylistRelaySettingsAction: (formData: FormData) => void | Promise<void>
}

export default function PlaylistRelaySettingsModal({
  playlist,
  settings,
  globalConfig,
  showSuccess,
  savePlaylistRelaySettingsAction,
}: PlaylistRelaySettingsModalProps) {
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  if (!isMounted) {
    return null
  }

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl card p-6 rounded-2xl border border-border shadow-2xl overflow-y-auto max-h-[90vh] animate-slide-up space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
              <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 10-7.18 0A6 6 0 0015.59 14.37z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75v2.25m0-18v2.25m8.25 6.75h-2.25M6 12H3.75m12.364 5.864l-1.591-1.591M9.227 9.227 7.636 7.636m8.728 0-1.591 1.591M9.227 14.773l-1.591 1.591" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">Relay Playlist Settings</h3>
              <p className="text-[10px] text-muted-foreground mt-1">{playlist.name}</p>
            </div>
          </div>
          <a href="/dashboard/playlists" className="p-1 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-all">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </a>
        </div>

        {showSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            Playlist relay settings saved. Request relay berikutnya akan memakai konfigurasi baru.
          </div>
        )}

        <form action={savePlaylistRelaySettingsAction} className="space-y-6">
          <input type="hidden" name="playlistId" value={playlist.id} />

          <label className="flex items-center gap-3 cursor-pointer p-3 bg-accent/30 border border-border rounded-xl hover:bg-accent/50 transition-colors">
            <input type="checkbox" name="relayEnabled" defaultChecked={settings.enabled} className="w-4 h-4 rounded accent-primary" />
            <span>
              <span className="text-xs font-semibold text-foreground block">Enable On-Demand Relay untuk playlist ini</span>
              <span className="text-[10px] text-muted-foreground">Jika nonaktif, channel UDP dari playlist ini tidak akan diarahkan ke endpoint `/api/stream/udp-hls`.</span>
            </span>
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="UDP Local Address" hint={`Global default: ${globalConfig.localAddr}`}>
              <input type="text" name="localAddr" defaultValue={settings.config.localAddr || ''} placeholder={globalConfig.localAddr} className="field-input font-mono" />
            </Field>
            <Field label="HLS Time" hint={`Global default: ${globalConfig.hlsTime}`}>
              <input type="number" step="0.5" min={0.5} name="hlsTime" defaultValue={settings.config.hlsTime || ''} placeholder={globalConfig.hlsTime} className="field-input" />
            </Field>
            <Field label="HLS List Size" hint={`Global default: ${globalConfig.hlsListSize}`}>
              <input type="number" min={1} name="hlsListSize" defaultValue={settings.config.hlsListSize || ''} placeholder={globalConfig.hlsListSize} className="field-input" />
            </Field>
            <Field label="UDP FIFO Size" hint={`Global default: ${globalConfig.fifoSize}`}>
              <input type="number" min={1} name="fifoSize" defaultValue={settings.config.fifoSize || ''} placeholder={globalConfig.fifoSize} className="field-input" />
            </Field>
            <Field label="Idle Timeout (ms)" wide hint={`Global default: ${globalConfig.idleTimeoutMs}`}>
              <input type="number" min={10000} name="idleTimeoutMs" defaultValue={settings.config.idleTimeoutMs ?? ''} placeholder={String(globalConfig.idleTimeoutMs)} className="field-input" />
            </Field>
          </div>

          <div className="rounded-xl border border-primary/15 bg-primary/5 p-3 text-[10px] text-primary/80">
            Kosongkan field override jika ingin mengikuti runtime global dari menu Setup.
          </div>

          <button type="submit" className="w-full btn btn-primary py-2.5">
            Save Playlist Relay Settings
          </button>
        </form>
      </div>
    </div>,
    document.body
  )
}

function Field({
  label,
  hint,
  wide = false,
  children,
}: {
  label: string
  hint?: string
  wide?: boolean
  children: React.ReactNode
}) {
  return (
    <label className={wide ? 'md:col-span-2' : ''}>
      <span className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{label}</span>
      {children}
      {hint && <span className="block mt-1.5 text-[10px] text-muted-foreground">{hint}</span>}
    </label>
  )
}
