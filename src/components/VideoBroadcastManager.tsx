'use client'

import { useMemo, useState } from 'react'
import type { DeviceGroup } from '@/lib/deviceGroups'
import type { ResolvedVideoBroadcastConfig } from '@/lib/videoBroadcast'

type VideoOption = {
  id: number
  title: string
  folderName: string | null
  isPublished: boolean
}

type DeviceOption = {
  deviceId: string
  deviceName: string
  isActive: boolean
  groupName: string | null
}

type VideoBroadcastManagerProps = {
  profileId: string
  profileName: string
  config: ResolvedVideoBroadcastConfig
  surface?: 'card' | 'plain'
  videos: VideoOption[]
  groups: DeviceGroup[]
  devices: DeviceOption[]
  onSaveAction: (formData: FormData) => void | Promise<void>
  onResetAction: (formData: FormData) => void | Promise<void>
  onPlayNowAction: (formData: FormData) => void | Promise<void>
  onStopNowAction: (formData: FormData) => void | Promise<void>
}

export default function VideoBroadcastManager({
  profileId,
  profileName,
  config,
  surface = 'card',
  videos,
  groups,
  devices,
  onSaveAction,
  onResetAction,
  onPlayNowAction,
  onStopNowAction,
}: VideoBroadcastManagerProps) {
  const [liveTargetMode, setLiveTargetMode] = useState<'global' | 'group' | 'device' | 'selected'>('global')
  const [liveGroupId, setLiveGroupId] = useState(groups[0]?.id || '')
  const [liveDeviceId, setLiveDeviceId] = useState(devices[0]?.deviceId || '')

  const sortedVideos = useMemo(
    () =>
      [...videos].sort((a, b) =>
        `${a.folderName || ''} ${a.title}`.localeCompare(`${b.folderName || ''} ${b.title}`, 'id')
      ),
    [videos]
  )

  const isPlainSurface = surface === 'plain'

  return (
    <section className={`${isPlainSurface ? 'space-y-4' : 'overflow-hidden rounded-[24px] border border-white/8 bg-slate-900/40 p-5 shadow-2xl backdrop-blur-xl space-y-4'} shrink-0`}>
      {!isPlainSurface && (
        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-white">VIDEO BROADCAST</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            Atur video prioritas dari repository untuk ditampilkan setelah aplikasi restart.
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-primary/15 bg-primary/10 px-3.5 py-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Target Profile Config</div>
        <div className="mt-1 text-sm font-semibold text-white">{profileName || '(Pilih Profile)'}</div>
      </div>

      <form action={onSaveAction} className="space-y-4">
        {/* Hidden inputs to bind profile ID and revision */}
        <input type="hidden" name="profileId" value={profileId} />
        <input type="hidden" name="revision" value={String(config.revision + 1)} />
        <input type="hidden" name="liveTargetMode" value={liveTargetMode} />
        <input type="hidden" name="liveGroupId" value={liveGroupId} />
        <input type="hidden" name="liveDeviceId" value={liveDeviceId} />

        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-3 hover:bg-white/[0.04] transition-colors">
          <input type="checkbox" name="enabled" defaultChecked={config.enabled} className="h-4 w-4 rounded accent-primary cursor-pointer" />
          <span>
            <span className="block text-xs font-semibold text-white select-none">Aktifkan Video Broadcast</span>
            <span className="text-[10px] text-slate-400 select-none">Jika aktif, video ini akan tampil penuh layar setelah splash selesai.</span>
          </span>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Video Repository</span>
          <select
            name="videoId"
            defaultValue={config.videoId || ''}
            className="w-full rounded-xl border border-white/8 bg-slate-950/45 px-3 py-2 text-xs text-white outline-none transition-all focus:border-primary/50 focus:ring-1 focus:ring-primary/20 cursor-pointer"
          >
            <option value="">Pilih video</option>
            {sortedVideos.map((video) => (
              <option key={video.id} value={video.id}>
                {video.folderName ? `[${video.folderName}] ` : ''}{video.title}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Repeat Count</span>
          <input
            type="number"
            name="repeatCount"
            min={1}
            max={100}
            defaultValue={config.repeatCount}
            className="w-full rounded-xl border border-white/8 bg-slate-950/45 px-3 py-2 text-xs text-white outline-none transition-all focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
          />
        </label>

        <div className="rounded-2xl border border-white/8 bg-black/20 p-3.5 text-xs text-slate-300 space-y-1.5 font-medium">
          <div><span className="text-slate-500 font-normal">Video aktif:</span> <span className="font-semibold text-white">{config.videoTitle || 'Belum dipilih'}</span></div>
          <div><span className="text-slate-500 font-normal">Repeat:</span> {config.repeatCount}x</div>
          <div><span className="text-slate-500 font-normal">Status:</span> {config.enabled && config.videoUrl ? 'Siap diputar setelah restart' : 'Tidak aktif'}</div>
        </div>

        <div className="space-y-3 rounded-2xl border border-emerald-400/15 bg-emerald-500/[0.04] p-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300 select-none">Live Target</div>
            <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">Dipakai khusus untuk aksi instant `Tampilkan Sekarang` dan `Stop Broadcast`.</p>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-450">Mode Target</span>
            <select
              value={liveTargetMode}
              onChange={(e) => setLiveTargetMode(e.target.value as 'global' | 'group' | 'device' | 'selected')}
              className="w-full rounded-xl border border-white/8 bg-slate-950/45 px-3 py-2 text-xs text-white outline-none transition-all focus:border-emerald-400/50 focus:ring-1 focus:ring-emerald-400/20 cursor-pointer"
            >
              <option value="global">Semua Device Aktif</option>
              <option value="group">Per Group</option>
              <option value="device">Satu Device</option>
              <option value="selected">Selected Devices</option>
            </select>
          </label>

          {liveTargetMode === 'group' && (
            <label className="block animate-slide-down">
              <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-450">Pilih Group</span>
              <select
                value={liveGroupId}
                onChange={(e) => setLiveGroupId(e.target.value)}
                className="w-full rounded-xl border border-white/8 bg-slate-950/45 px-3 py-2 text-xs text-white outline-none transition-all focus:border-emerald-400/50 focus:ring-1 focus:ring-emerald-400/20 cursor-pointer"
              >
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </select>
            </label>
          )}

          {liveTargetMode === 'device' && (
            <label className="block animate-slide-down">
              <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-455">Pilih Device</span>
              <select
                value={liveDeviceId}
                onChange={(e) => setLiveDeviceId(e.target.value)}
                className="w-full rounded-xl border border-white/8 bg-slate-950/45 px-3 py-2 text-xs text-white outline-none transition-all focus:border-emerald-400/50 focus:ring-1 focus:ring-emerald-400/20 cursor-pointer"
              >
                {devices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.deviceName}{device.groupName ? ` • ${device.groupName}` : ''}
                  </option>
                ))}
              </select>
            </label>
          )}

          {liveTargetMode === 'selected' && (
            <div className="animate-slide-down">
              <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-450">Pilih Manual</span>
              <div className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-white/8 bg-black/20 p-3">
                {devices.map((device) => (
                  <label key={device.deviceId} className="flex cursor-pointer items-start gap-2 rounded-lg border border-white/6 bg-white/[0.02] p-2.5 hover:bg-white/[0.04]">
                    <input type="checkbox" name="selectedDeviceIds" value={device.deviceId} className="mt-0.5 h-4 w-4 rounded accent-emerald-450 cursor-pointer" />
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-white">{device.deviceName}</span>
                      <span className="block break-all text-[10px] text-slate-500 font-mono">{device.deviceId}</span>
                      <span className="block text-[10px] text-slate-400">{device.groupName || 'Tanpa Group'}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button type="submit" className="w-full btn bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 text-xs rounded-xl shadow-[0_4px_12px_rgba(99,102,241,0.2)] cursor-pointer transition-all">
            Simpan ke Profile
          </button>
          <button
            type="submit"
            formAction={onPlayNowAction}
            className="w-full rounded-xl border border-emerald-400/20 bg-emerald-500/10 py-2.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/15 cursor-pointer transition-all"
          >
            Tampilkan Sekarang
          </button>
          <button
            type="submit"
            formAction={onStopNowAction}
            className="w-full rounded-xl border border-rose-400/20 bg-rose-500/10 py-2.5 text-xs font-bold text-rose-300 hover:bg-rose-500/15 cursor-pointer transition-all"
          >
            Stop Broadcast
          </button>
        </div>
      </form>

      <form action={onResetAction} className="border-t border-white/6 pt-4">
        <input type="hidden" name="profileId" value={profileId} />
        <button
          type="submit"
          className="w-full rounded-xl border border-amber-500/20 bg-amber-500/5 py-2.5 text-xs font-bold text-amber-300 hover:bg-amber-500/10 cursor-pointer transition-all"
        >
          Reset Config Video Profile
        </button>
      </form>
    </section>
  )
}
