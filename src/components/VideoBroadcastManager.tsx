'use client'

import { useMemo } from 'react'
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
}: VideoBroadcastManagerProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

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

        <button type="submit" className="w-full btn bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 text-xs rounded-xl shadow-[0_4px_12px_rgba(99,102,241,0.2)] cursor-pointer transition-all">
          Simpan Video Broadcast
        </button>
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
