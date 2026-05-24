import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import ConfirmForm from '@/components/ConfirmForm'
import DeviceConfigForm from '@/components/DeviceConfigForm'
import RemoteControlModal from '@/components/RemoteControlModal'
import DeviceSearchAndLimit from '@/components/DeviceSearchAndLimit'
import DevicePagination from '@/components/DevicePagination'
import PageHeader from '@/components/PageHeader'
import EmptyState from '@/components/FeedbackState'
import { redirect } from 'next/navigation'
import { getOnlineThreshold } from '@/lib/time'
import {
  cleanupOfflineDevices,
  getHlsRelayBaseUrl,
  getOfflineAutoDeleteDays,
  setHlsRelayBaseUrl,
  setOfflineAutoDeleteDays,
} from '@/lib/settings'
import { DEFAULT_CUSTOM_M3U_URL, DEFAULT_SYNC_MODE } from '@/lib/defaults'

export const revalidate = 0
type DeviceStatusFilter = 'all' | 'online' | 'offline' | 'disabled'

function getSyncModeLabel(syncMode: string) {
  if (syncMode === 'custom') return 'Custom M3U'
  if (syncMode === 'api_relay') return 'API Relay'
  return 'API Server'
}

function getSyncModeBadgeClass(syncMode: string) {
  if (syncMode === 'custom') return 'badge badge-warning'
  if (syncMode === 'api_relay') return 'badge badge-success'
  return 'badge badge-primary'
}

async function deleteDeviceAction(formData: FormData) {
  'use server'
  const deviceId = formData.get('deviceId') as string
  try {
    await prisma.device.delete({ where: { deviceId } })
    revalidatePath('/dashboard/devices')
    revalidatePath('/dashboard')
  } catch (error) {
    console.error('Delete device error:', error)
  }
}

async function toggleDeviceActiveAction(formData: FormData) {
  'use server'
  const deviceId = formData.get('deviceId') as string
  const currentStatus = formData.get('currentStatus') === 'true'
  try {
    await prisma.$transaction([
      prisma.device.update({ where: { deviceId }, data: { isActive: !currentStatus } }),
      prisma.deviceConfig.upsert({
        where: { deviceId },
        update: { forceSync: true },
        create: { deviceId, lockSettings: true, forceSync: true },
      }),
    ])
    revalidatePath('/dashboard/devices')
    revalidatePath('/dashboard')
  } catch (error) {
    console.error('Toggle device active error:', error)
  }
}

async function saveOfflineCleanupSettingAction(formData: FormData) {
  'use server'
  const days = parseInt(formData.get('offlineAutoDeleteDays') as string, 10)
  try {
    const safeDays = Number.isFinite(days) ? days : 0
    await setOfflineAutoDeleteDays(safeDays)
    await cleanupOfflineDevices(Math.max(0, safeDays))
    revalidatePath('/dashboard/devices')
    revalidatePath('/dashboard')
  } catch (error) {
    console.error('Save offline cleanup setting error:', error)
  }
  redirect('/dashboard/devices?cleanupSaved=1')
}

async function saveStreamRelaySettingAction(formData: FormData) {
  'use server'
  const hlsRelayBaseUrl = formData.get('hlsRelayBaseUrl') as string
  try {
    await setHlsRelayBaseUrl(hlsRelayBaseUrl)
    revalidatePath('/dashboard/devices')
    revalidatePath('/dashboard/channels')
  } catch (error) {
    console.error('Save stream relay setting error:', error)
  }
  redirect('/dashboard/devices?relaySaved=1')
}

async function clearDeviceCacheAction(formData: FormData) {
  'use server'
  const deviceId = formData.get('deviceId') as string
  try {
    await prisma.deviceConfig.update({
      where: { deviceId },
      data: { clearCacheTrigger: true, forceSync: true },
    })
    revalidatePath('/dashboard/devices')
  } catch (error) {
    console.error('Clear cache trigger error:', error)
  }
}

async function saveDeviceConfigAction(formData: FormData) {
  'use server'
  const deviceId = formData.get('deviceId') as string
  const deviceName = formData.get('deviceName') as string
  const aspectRatio = formData.get('aspectRatio') as string
  const syncInterval = parseInt(formData.get('syncInterval') as string)
  const syncMode = formData.get('syncMode') as string
  const customM3uUrl = formData.get('customM3uUrl') as string
  const technicianPin = formData.get('technicianPin') as string
  const educationVideoPath = formData.get('educationVideoPath') as string
  const educationSmbUsername = formData.get('educationSmbUsername') as string
  const educationSmbPassword = formData.get('educationSmbPassword') as string
  const educationSmbDomain = formData.get('educationSmbDomain') as string
  const educationRepeatMode = formData.get('educationRepeatMode') as string
  const educationPlayOrder = formData.get('educationPlayOrder') as string
  const educationSource = formData.get('educationSource') as string
  const educationPlaybackMode = formData.get('educationPlaybackMode') as string
  const educationForceSyncTrigger = formData.get('educationForceSyncTrigger') === 'true'
  const lockSettings = formData.get('lockSettings') === 'on'
  const forceSync = true
  const autoStartOnBoot = formData.get('autoStartOnBoot') === 'on'

  try {
    await prisma.device.update({ where: { deviceId }, data: { deviceName } })
    await prisma.deviceConfig.update({
      where: { deviceId },
      data: {
        aspectRatio,
        syncInterval: syncInterval || 1800,
        syncMode: syncMode || DEFAULT_SYNC_MODE,
        customM3uUrl: (syncMode || DEFAULT_SYNC_MODE) === 'custom' ? (customM3uUrl || DEFAULT_CUSTOM_M3U_URL) : '',
        technicianPin: technicianPin || '2468',
        lockSettings,
        forceSync,
        autoStartOnBoot,
        educationVideoPath: educationVideoPath || '',
        educationSmbUsername: educationSmbUsername || '',
        educationSmbPassword: educationSmbPassword || '',
        educationSmbDomain: educationSmbDomain || '',
        educationRepeatMode: educationRepeatMode || 'all',
        educationPlayOrder: educationPlayOrder || 'alphabetical',
        educationSource: educationSource || 'smb',
        educationPlaybackMode: educationPlaybackMode || 'copy',
        ...(educationForceSyncTrigger ? { educationForceSync: true } : {}),
      },
    })
    revalidatePath('/dashboard/devices')
    revalidatePath('/dashboard')
  } catch (error) {
    console.error('Save config error:', error)
  }
  redirect(`/dashboard/devices?edit=${deviceId}&success=1`)
}

export default async function DevicesPage({
  searchParams,
}: {
  searchParams: Promise<{
    edit?: string; success?: string; status?: string; cleanupSaved?: string
    relaySaved?: string; remote?: string; q?: string; page?: string; limit?: string
  }>
}) {
  const resolvedSearchParams = await searchParams
  const editDeviceId = resolvedSearchParams.edit
  const remoteDeviceId = resolvedSearchParams.remote
  const showSuccess = resolvedSearchParams.success === '1'
  const showCleanupSaved = resolvedSearchParams.cleanupSaved === '1'
  const showRelaySaved = resolvedSearchParams.relaySaved === '1'
  const statusFilter = (['all', 'online', 'offline', 'disabled'].includes(resolvedSearchParams.status || '')
    ? resolvedSearchParams.status : 'all') as DeviceStatusFilter

  const searchQuery = resolvedSearchParams.q || ''
  const limitParam = parseInt(resolvedSearchParams.limit || '25', 10)
  const pageParam = parseInt(resolvedSearchParams.page || '1', 10)
  const allowedLimits = [10, 25, 50, 100]
  const pageSize = allowedLimits.includes(limitParam) ? limitParam : 25
  const currentPage = pageParam > 0 ? pageParam : 1

  const offlineAutoDeleteDays = await getOfflineAutoDeleteDays()
  const hlsRelayBaseUrl = await getHlsRelayBaseUrl()
  const cleanedDeviceCount = await cleanupOfflineDevices(offlineAutoDeleteDays)

  const devices = await prisma.device.findMany({
    orderBy: { lastOnline: 'desc' },
    include: { playlist: true, config: true },
  })

  const editingDevice = editDeviceId ? devices.find((d) => d.deviceId === editDeviceId) : null
  const remoteDevice = remoteDeviceId ? devices.find((d) => d.deviceId === remoteDeviceId) : null

  const tenMinutesAgo = getOnlineThreshold(10)
  const deviceStats = devices.reduce(
    (acc, d) => {
      const isOnline = d.isActive && d.lastOnline && d.lastOnline.getTime() >= tenMinutesAgo.getTime()
      if (!d.isActive) acc.disabled += 1
      else if (isOnline) acc.online += 1
      else acc.offline += 1
      return acc
    },
    { online: 0, offline: 0, disabled: 0 }
  )

  const filteredDevices = devices.filter((d) => {
    const isOnline = d.isActive && d.lastOnline && d.lastOnline.getTime() >= tenMinutesAgo.getTime()
    if (statusFilter === 'online') return Boolean(isOnline)
    if (statusFilter === 'offline') return d.isActive && !isOnline
    if (statusFilter === 'disabled') return !d.isActive
    return true
  })

  const searchedDevices = filteredDevices.filter((d) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      d.deviceName.toLowerCase().includes(q) ||
      d.deviceId.toLowerCase().includes(q) ||
      (d.lastIp && d.lastIp.toLowerCase().includes(q)) ||
      (d.macAddress && d.macAddress.toLowerCase().includes(q))
    )
  })

  const totalItems = searchedDevices.length
  const totalPages = Math.ceil(totalItems / pageSize)
  const safeCurrentPage = Math.min(currentPage, Math.max(1, totalPages))
  const startIndex = (safeCurrentPage - 1) * pageSize
  const paginatedDevices = searchedDevices.slice(startIndex, startIndex + pageSize)

  const filterItems: Array<{ label: string; value: DeviceStatusFilter; count: number }> = [
    { label: 'All', value: 'all', count: devices.length },
    { label: 'Online', value: 'online', count: deviceStats.online },
    { label: 'Offline', value: 'offline', count: deviceStats.offline },
    { label: 'Disabled', value: 'disabled', count: deviceStats.disabled },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Device Fleet Manager"
        description="Monitor all registered Android STBs, control active status, assign playlists, and set remote configuration overrides."
      />

      {/* Status Messages */}
      {showCleanupSaved && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          Offline cleanup setting saved. {cleanedDeviceCount > 0 ? `${cleanedDeviceCount} old offline device(s) were deleted.` : 'No old offline devices matched the threshold.'}
        </div>
      )}
      {showRelaySaved && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          Stream relay base URL saved. API Relay devices will receive the updated HLS URLs on the next sync.
        </div>
      )}

      {/* Settings Panels */}
      <div className="card p-4 rounded-2xl flex flex-col lg:flex-row gap-4 lg:items-end lg:justify-between">
        <div>
          <span className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Filter Devices</span>
          <div className="flex flex-wrap gap-2">
            {filterItems.map((item) => (
              <a
                key={item.value}
                href={`/dashboard/devices?status=${item.value}`}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  statusFilter === item.value
                    ? 'bg-primary/15 text-primary border-primary/30'
                    : 'text-muted-foreground border-border hover:text-foreground hover:bg-accent/50'
                }`}
              >
                {item.label} ({item.count})
              </a>
            ))}
          </div>
        </div>
        <form action={saveOfflineCleanupSettingAction} className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Auto-delete Offline After</label>
            <div className="flex items-center gap-2">
              <input
                type="number" name="offlineAutoDeleteDays" defaultValue={offlineAutoDeleteDays}
                min={0} max={3650}
                className="w-24 px-3 py-1.5 bg-background border border-border rounded-lg text-foreground text-xs font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              />
              <span className="text-xs text-muted-foreground">days</span>
            </div>
            <p className="text-[9px] text-muted-foreground/60 mt-1">0 disables auto-delete</p>
          </div>
          <button type="submit" className="btn btn-primary btn-sm py-2">Save Cleanup</button>
        </form>
      </div>

      <form action={saveStreamRelaySettingAction} className="card p-4 rounded-2xl flex flex-col lg:flex-row gap-4 lg:items-end lg:justify-between">
        <div className="flex-1 min-w-0">
          <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">HLS Relay Base URL</label>
          <input
            type="url" name="hlsRelayBaseUrl" defaultValue={hlsRelayBaseUrl} required
            placeholder="http://10.55.1.5/relay"
            className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-foreground text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 font-mono"
          />
          <p className="text-[9px] text-muted-foreground/60 mt-1">UDP playlist entries are exposed as /channel-slug/index.m3u8 under this base URL.</p>
        </div>
        <button type="submit" className="btn btn-primary btn-sm py-2">Save Relay URL</button>
      </form>

      {/* Device Table */}
      <div className="card rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 className="font-semibold text-foreground text-sm">
            Registered Devices ({searchQuery ? `${searchedDevices.length} found` : `${filteredDevices.length}/${devices.length}`})
          </h3>
        </div>

        <DeviceSearchAndLimit />

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
                <th className="p-4 px-5">Status</th>
                <th className="p-4 min-w-[260px]">Device Details</th>
                <th className="p-4">Sync Mode</th>
                <th className="p-4">Versions & Network</th>
                <th className="p-4 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 text-xs">
              {searchedDevices.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState
                      title={devices.length === 0 ? 'No Devices Registered' : 'No Matching Devices'}
                      description={devices.length === 0
                        ? 'Open the RSDK IPTV Android Player app on any STB to register automatically.'
                        : 'No devices match the selected search query or filter.'}
                    />
                  </td>
                </tr>
              ) : (
                paginatedDevices.map((d) => {
                  const isOnline = d.isActive && d.lastOnline && d.lastOnline.getTime() >= tenMinutesAgo.getTime()
                  return (
                    <tr key={d.id} className="hover:bg-accent/30 transition-colors">
                      <td className="p-4 px-5">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${
                              !d.isActive ? 'bg-destructive' : isOnline ? 'bg-emerald-500' : 'bg-muted'
                            }`} />
                            <span className={`font-semibold text-[10px] tracking-wide ${
                              !d.isActive ? 'text-destructive' : isOnline ? 'text-emerald-400' : 'text-muted-foreground'
                            }`}>
                              {!d.isActive ? 'DISABLED' : isOnline ? 'ONLINE' : 'OFFLINE'}
                            </span>
                          </div>
                          <span className={`badge ${d.isActive ? 'badge-success' : 'badge-destructive'}`}>
                            API {d.isActive ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 min-w-[260px]">
                        <div className="font-semibold text-foreground text-xs">{d.deviceName}</div>
                        <div className="text-muted-foreground text-[10px] mt-0.5 font-mono break-all" title={d.deviceId}>
                          <span className="text-muted-foreground/60">ID:</span> {d.deviceId}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <span className={getSyncModeBadgeClass(d.config?.syncMode || DEFAULT_SYNC_MODE)}>
                            {getSyncModeLabel(d.config?.syncMode || DEFAULT_SYNC_MODE)}
                          </span>
                          {(d.config?.syncMode || DEFAULT_SYNC_MODE) === 'custom' ? (
                            <div className="text-[9px] text-muted-foreground truncate max-w-[130px] font-mono" title={d.config?.customM3uUrl || DEFAULT_CUSTOM_M3U_URL}>
                              {d.config?.customM3uUrl || DEFAULT_CUSTOM_M3U_URL}
                            </div>
                          ) : (
                            <div className="text-[9px] text-muted-foreground/60 italic">Centralized</div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-foreground/80 text-xs">App v{d.appVersion || '1.0.0'} (Android {d.androidVersion || '10'})</div>
                        <div className="text-muted-foreground text-[10px] mt-0.5 font-mono">IP: {d.lastIp || '127.0.0.1'}</div>
                        {d.macAddress && (
                          <div className="text-primary/70 text-[10px] mt-0.5 font-mono">MAC: {d.macAddress}</div>
                        )}
                      </td>
                      <td className="p-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <ConfirmForm
                            action={toggleDeviceActiveAction}
                            message={d.isActive
                              ? `Disable API connection for ${d.deviceName}? The STB will be blocked without deleting its settings.`
                              : `Enable API connection for ${d.deviceName}? The STB can sync and play again.`}
                          >
                            <input type="hidden" name="deviceId" value={d.deviceId} />
                            <input type="hidden" name="currentStatus" value={d.isActive ? 'true' : 'false'} />
                            <button type="submit" className={`btn btn-xs ${d.isActive
                              ? 'text-amber-400 hover:text-amber-300 border border-amber-500/20 hover:bg-amber-500/10'
                              : 'text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/10'
                            }`}>
                              {d.isActive ? 'Disable' : 'Enable'}
                            </button>
                          </ConfirmForm>

                          <a href={`/dashboard/devices?edit=${d.deviceId}`}
                            className="btn btn-xs text-primary hover:text-primary/80 border border-primary/20 hover:bg-primary/10">
                            Config
                          </a>

                          {d.isActive && isOnline ? (
                            <a href={`/dashboard/devices?remote=${d.deviceId}`}
                              className="btn btn-xs text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/10 animate-pulse-glow">
                              Remote
                            </a>
                          ) : (
                            <button disabled
                              className="btn btn-xs text-muted-foreground/30 border border-border/30 cursor-not-allowed"
                              title="Device must be active and online">
                              Remote
                            </button>
                          )}

                          <ConfirmForm
                            action={deleteDeviceAction}
                            message={`Are you sure you want to delete ${d.deviceName}? This will wipe its remote settings.`}
                          >
                            <input type="hidden" name="deviceId" value={d.deviceId} />
                            <button type="submit"
                              className="p-1.5 text-rose-400 hover:text-rose-300 border border-rose-500/10 hover:bg-rose-500/10 rounded-lg transition-all">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                              </svg>
                            </button>
                          </ConfirmForm>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <DevicePagination totalItems={totalItems} pageSize={pageSize} currentPage={safeCurrentPage} />
      </div>

      {/* Config Modal */}
      {editingDevice && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-3xl card p-6 rounded-2xl border border-border shadow-2xl overflow-y-auto max-h-[90vh] animate-slide-up space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
                  <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-foreground text-sm">Remote Config: {editingDevice.deviceName}</h3>
              </div>
              <a href="/dashboard/devices" className="p-1 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-all">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </a>
            </div>

            {showSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Configuration successfully saved & synced!
              </div>
            )}

            <DeviceConfigForm
              key={editingDevice.deviceId}
              editingDevice={editingDevice}
              saveDeviceConfigAction={saveDeviceConfigAction}
              clearDeviceCacheAction={clearDeviceCacheAction}
            />
          </div>
        </div>
      )}

      {remoteDevice && (
        <RemoteControlModal
          deviceId={remoteDevice.deviceId}
          deviceName={remoteDevice.deviceName}
          deviceIp={remoteDevice.lastIp}
          closeUrl="/dashboard/devices"
        />
      )}
    </div>
  )
}
