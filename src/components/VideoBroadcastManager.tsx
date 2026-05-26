'use client'

import { useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { DeviceGroup } from '@/lib/deviceGroups'
import type { ResolvedVideoBroadcastConfig, VideoBroadcastScope } from '@/lib/videoBroadcast'

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
  scope: VideoBroadcastScope
  targetId: string
  currentScopeLabel: string
  config: ResolvedVideoBroadcastConfig
  videos: VideoOption[]
  groups: DeviceGroup[]
  devices: DeviceOption[]
  onSaveAction: (formData: FormData) => void | Promise<void>
  onResetAction: (formData: FormData) => void | Promise<void>
  onPlayNowAction: (formData: FormData) => void | Promise<void>
  onStopNowAction: (formData: FormData) => void | Promise<void>
}

export default function VideoBroadcastManager({
  scope,
  targetId,
  currentScopeLabel,
  config,
  videos,
  groups,
  devices,
  onSaveAction,
  onResetAction,
  onPlayNowAction,
  onStopNowAction,
}: VideoBroadcastManagerProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [liveTargetMode, setLiveTargetMode] = useState<'global' | 'group' | 'device' | 'selected'>(scope)
  const [liveGroupId, setLiveGroupId] = useState(scope === 'group' ? targetId : groups[0]?.id || '')
  const [liveDeviceId, setLiveDeviceId] = useState(scope === 'device' ? targetId : devices[0]?.deviceId || '')

  const sortedVideos = useMemo(
    () =>
      [...videos].sort((a, b) =>
        `${a.folderName || ''} ${a.title}`.localeCompare(`${b.folderName || ''} ${b.title}`, 'id')
      ),
    [videos]
  )

  const updateScope = (nextScope: VideoBroadcastScope, nextTargetId: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('broadcastScope', nextScope)
    if (nextScope === 'global') {
      params.delete('broadcastId')
    } else {
      params.set('broadcastId', nextTargetId)
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <section className="overflow-hidden rounded-[24px] border border-white/8 bg-slate-900/40 backdrop-blur-xl p-5 shadow-2xl shrink-0 space-y-4">
      <div>
        <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-white">VIDEO BROADCAST</h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">
          Atur video prioritas dari repository untuk ditampilkan setelah aplikasi restart. Scope mengikuti prioritas Global -&gt; Group -&gt; Device.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <label>
          <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Scope</span>
          <select
            value={scope}
            onChange={(e) => {
              const nextScope = e.target.value as VideoBroadcastScope
              const nextTargetId =
                nextScope === 'group'
                  ? groups[0]?.id || ''
                  : nextScope === 'device'
                    ? devices[0]?.deviceId || ''
                    : ''
              updateScope(nextScope, nextTargetId)
            }}
            className="w-full rounded-xl border border-white/8 bg-slate-950/45 px-3 py-2 text-xs text-white outline-none transition-all focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
          >
            <option value="global">Global</option>
            <option value="group">Group</option>
            <option value="device">Device</option>
          </select>
        </label>

        {scope === 'group' && (
          <label>
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Target Group</span>
            <select
              value={targetId}
              onChange={(e) => updateScope('group', e.target.value)}
              className="w-full rounded-xl border border-white/8 bg-slate-950/45 px-3 py-2 text-xs text-white outline-none transition-all focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
            >
              {groups.length === 0 ? (
                <option value="">Belum ada group</option>
              ) : (
                groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))
              )}
            </select>
          </label>
        )}

        {scope === 'device' && (
          <label>
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Target Device</span>
            <select
              value={targetId}
              onChange={(e) => updateScope('device', e.target.value)}
              className="w-full rounded-xl border border-white/8 bg-slate-950/45 px-3 py-2 text-xs text-white outline-none transition-all focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
            >
              {devices.length === 0 ? (
                <option value="">Belum ada device</option>
              ) : (
                devices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.deviceName}{device.groupName ? ` • ${device.groupName}` : ''}
                  </option>
                ))
              )}
            </select>
          </label>
        )}
      </div>

      <div className="rounded-2xl border border-primary/15 bg-primary/10 px-3.5 py-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Scope Aktif</div>
        <div className="mt-1 text-sm font-semibold text-white">{currentScopeLabel}</div>
        <div className="mt-1 text-[11px] text-slate-300">
          Effective source saat ini: <span className="font-semibold text-white">{labelScopeApplied(config.scopeApplied)}</span>
        </div>
      </div>

      <form action={onSaveAction} className="space-y-4">
        <input type="hidden" name="scope" value={scope} />
        <input type="hidden" name="targetId" value={targetId} />
        <input type="hidden" name="revision" value={String(config.revision + 1)} />
        <input type="hidden" name="returnQuery" value={searchParams.toString()} />
        <input type="hidden" name="liveTargetMode" value={liveTargetMode} />
        <input type="hidden" name="liveGroupId" value={liveGroupId} />
        <input type="hidden" name="liveDeviceId" value={liveDeviceId} />

        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-3 hover:bg-white/[0.04] transition-colors">
          <input type="checkbox" name="enabled" defaultChecked={config.enabled} className="h-4 w-4 rounded accent-primary" />
          <span>
            <span className="block text-xs font-semibold text-white">Aktifkan Video Broadcast</span>
            <span className="text-[10px] text-slate-400">Jika aktif, video ini akan tampil penuh layar setelah splash selesai.</span>
          </span>
        </label>

        <label>
          <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Video Repository</span>
          <select
            name="videoId"
            defaultValue={config.videoId || ''}
            className="w-full rounded-xl border border-white/8 bg-slate-950/45 px-3 py-2 text-xs text-white outline-none transition-all focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
          >
            <option value="">Pilih video</option>
            {sortedVideos.map((video) => (
              <option key={video.id} value={video.id}>
                {video.folderName ? `[${video.folderName}] ` : ''}{video.title}
              </option>
            ))}
          </select>
        </label>

        <label>
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

        <div className="rounded-2xl border border-white/8 bg-black/20 p-3.5 text-xs text-slate-300 space-y-1.5">
          <div><span className="text-slate-500">Video aktif:</span> <span className="font-semibold text-white">{config.videoTitle || 'Belum dipilih'}</span></div>
          <div><span className="text-slate-500">Repeat:</span> {config.repeatCount}x</div>
          <div><span className="text-slate-500">Status:</span> {config.enabled && config.videoUrl ? 'Siap diputar setelah restart' : 'Tidak aktif'}</div>
        </div>

        <div className="space-y-3 rounded-2xl border border-emerald-400/15 bg-emerald-500/[0.04] p-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">Live Target</div>
            <p className="mt-1 text-[11px] text-slate-400">Dipakai khusus untuk aksi `Tampilkan Sekarang` dan `Stop Broadcast`.</p>
          </div>

          <label>
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Mode</span>
            <select
              value={liveTargetMode}
              onChange={(e) => setLiveTargetMode(e.target.value as 'global' | 'group' | 'device' | 'selected')}
              className="w-full rounded-xl border border-white/8 bg-slate-950/45 px-3 py-2 text-xs text-white outline-none transition-all focus:border-emerald-400/50 focus:ring-1 focus:ring-emerald-400/20"
            >
              <option value="global">Semua Device Aktif</option>
              <option value="group">Per Group</option>
              <option value="device">Satu Device</option>
              <option value="selected">Selected Devices</option>
            </select>
          </label>

          {liveTargetMode === 'group' && (
            <label>
              <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Pilih Group</span>
              <select
                value={liveGroupId}
                onChange={(e) => setLiveGroupId(e.target.value)}
                className="w-full rounded-xl border border-white/8 bg-slate-950/45 px-3 py-2 text-xs text-white outline-none transition-all focus:border-emerald-400/50 focus:ring-1 focus:ring-emerald-400/20"
              >
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </select>
            </label>
          )}

          {liveTargetMode === 'device' && (
            <label>
              <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Pilih Device</span>
              <select
                value={liveDeviceId}
                onChange={(e) => setLiveDeviceId(e.target.value)}
                className="w-full rounded-xl border border-white/8 bg-slate-950/45 px-3 py-2 text-xs text-white outline-none transition-all focus:border-emerald-400/50 focus:ring-1 focus:ring-emerald-400/20"
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
            <div>
              <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Selected Devices</span>
              <div className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-white/8 bg-black/20 p-3">
                {devices.map((device) => (
                  <label key={device.deviceId} className="flex cursor-pointer items-start gap-2 rounded-lg border border-white/6 bg-white/[0.02] p-2.5 hover:bg-white/[0.04]">
                    <input type="checkbox" name="selectedDeviceIds" value={device.deviceId} className="mt-0.5 h-4 w-4 rounded accent-emerald-400" />
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-white">{device.deviceName}</span>
                      <span className="block break-all text-[10px] text-slate-500">{device.deviceId}</span>
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
            Simpan Broadcast
          </button>
          <button
            type="submit"
            formAction={onPlayNowAction}
            className="w-full rounded-xl border border-emerald-400/20 bg-emerald-500/10 py-2.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/15"
          >
            Tampilkan Sekarang
          </button>
          <button
            type="submit"
            formAction={onStopNowAction}
            className="w-full rounded-xl border border-rose-400/20 bg-rose-500/10 py-2.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/15"
          >
            Stop Broadcast
          </button>
        </div>
      </form>

      <form action={onResetAction} className="border-t border-white/6 pt-4">
        <input type="hidden" name="scope" value={scope} />
        <input type="hidden" name="targetId" value={targetId} />
        <input type="hidden" name="returnQuery" value={searchParams.toString()} />
        <button
          type="submit"
          className="w-full rounded-xl border border-amber-500/20 bg-amber-500/5 py-2.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/10"
        >
          {scope === 'global' ? 'Reset Global Broadcast' : 'Clear Override Scope Ini'}
        </button>
      </form>
    </section>
  )
}

function labelScopeApplied(scopeApplied: ResolvedVideoBroadcastConfig['scopeApplied']) {
  switch (scopeApplied) {
    case 'device':
      return 'Device Override'
    case 'group':
      return 'Group Profile'
    case 'global':
      return 'Global Profile'
    default:
      return 'Fallback'
  }
}
