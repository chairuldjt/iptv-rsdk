import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import ConfirmForm from '@/components/ConfirmForm'
import DeviceConfigForm from '@/components/DeviceConfigForm'
import { redirect } from 'next/navigation'
import { getOnlineThreshold } from '@/lib/time'
import { cleanupOfflineDevices, getOfflineAutoDeleteDays, setOfflineAutoDeleteDays } from '@/lib/settings'
import { DEFAULT_CUSTOM_M3U_URL, DEFAULT_SYNC_MODE } from '@/lib/defaults'

export const revalidate = 0 // Disable cache for live devices
type DeviceStatusFilter = 'all' | 'online' | 'offline' | 'disabled'

// Server Action to delete a device
async function deleteDeviceAction(formData: FormData) {
  'use server'
  const deviceId = formData.get('deviceId') as string

  try {
    await prisma.device.delete({
      where: { deviceId },
    })
    revalidatePath('/dashboard/devices')
    revalidatePath('/dashboard')
  } catch (error) {
    console.error('Delete device error:', error)
  }
}

// Server Action to enable/disable a device without deleting its remote settings
async function toggleDeviceActiveAction(formData: FormData) {
  'use server'
  const deviceId = formData.get('deviceId') as string
  const currentStatus = formData.get('currentStatus') === 'true'

  try {
    await prisma.$transaction([
      prisma.device.update({
        where: { deviceId },
        data: {
          isActive: !currentStatus,
        },
      }),
      prisma.deviceConfig.upsert({
        where: { deviceId },
        update: {
          forceSync: true,
        },
        create: {
          deviceId,
          lockSettings: true,
          forceSync: true,
        },
      }),
    ])
    revalidatePath('/dashboard/devices')
    revalidatePath('/dashboard')
  } catch (error) {
    console.error('Toggle device active error:', error)
  }
}

// Server Action to save automatic offline cleanup threshold
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

// Server Action to trigger a remote cache clear
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

// Server Action to update device config and custom settings
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
  const educationForceSyncTrigger = formData.get('educationForceSyncTrigger') === 'true'

  const lockSettings = formData.get('lockSettings') === 'on'
  const forceSync = true // Always force sync on any configuration change
  const autoStartOnBoot = formData.get('autoStartOnBoot') === 'on'

  try {
    // 1. Update Device table
    await prisma.device.update({
      where: { deviceId },
      data: {
        deviceName,
      },
    })

    // 2. Update DeviceConfig table
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
  searchParams: Promise<{ edit?: string; success?: string; status?: string; cleanupSaved?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const editDeviceId = resolvedSearchParams.edit
  const showSuccess = resolvedSearchParams.success === '1'
  const showCleanupSaved = resolvedSearchParams.cleanupSaved === '1'
  const statusFilter = (['all', 'online', 'offline', 'disabled'].includes(resolvedSearchParams.status || '')
    ? resolvedSearchParams.status
    : 'all') as DeviceStatusFilter
  const offlineAutoDeleteDays = await getOfflineAutoDeleteDays()
  const cleanedDeviceCount = await cleanupOfflineDevices(offlineAutoDeleteDays)

  // Fetch all devices
  const devices = await prisma.device.findMany({
    orderBy: { lastOnline: 'desc' },
    include: {
      playlist: true,
      config: true,
    },
  })

  // Find the selected device for edit panel
  const editingDevice = editDeviceId
    ? devices.find((d) => d.deviceId === editDeviceId)
    : null

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
  const filterItems: Array<{ label: string; value: DeviceStatusFilter; count: number }> = [
    { label: 'All', value: 'all', count: devices.length },
    { label: 'Online', value: 'online', count: deviceStats.online },
    { label: 'Offline', value: 'offline', count: deviceStats.offline },
    { label: 'Disabled', value: 'disabled', count: deviceStats.disabled },
  ]

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white">Device Fleet Manager</h2>
        <p className="text-slate-400 mt-1 text-sm">Monitor all registered Android STBs, control active status, assign playlists, and set remote configuration overrides.</p>
      </div>

      <div className="space-y-8 animate-fade-in">
        {showCleanupSaved && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold">
            Offline cleanup setting saved. {cleanedDeviceCount > 0 ? `${cleanedDeviceCount} old offline device(s) were deleted.` : 'No old offline devices matched the threshold.'}
          </div>
        )}

        <div className="glass-panel p-4 rounded-2xl border border-border flex flex-col lg:flex-row gap-4 lg:items-end lg:justify-between">
          <div>
            <span className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Filter Devices</span>
            <div className="flex flex-wrap gap-2">
              {filterItems.map((item) => (
                <a
                  key={item.value}
                  href={`/dashboard/devices?status=${item.value}`}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                    statusFilter === item.value
                      ? 'bg-indigo-500/20 text-white border-indigo-500/40'
                      : 'text-slate-400 border-slate-700 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  {item.label} ({item.count})
                </a>
              ))}
            </div>
          </div>

          <form action={saveOfflineCleanupSettingAction} className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Auto-delete Offline After</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  name="offlineAutoDeleteDays"
                  defaultValue={offlineAutoDeleteDays}
                  min={0}
                  max={3650}
                  className="w-28 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-primary"
                />
                <span className="text-xs text-slate-400">days</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">0 disables auto-delete. Disabled API devices are kept.</p>
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-primary hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer"
            >
              Save Cleanup
            </button>
          </form>
        </div>

        {/* Device List Table Card - Always Full Width */}
        <div className="glass-card rounded-2xl border border-border overflow-hidden">
          <div className="px-6 py-5 border-b border-border">
            <h3 className="font-bold text-white text-lg">Registered Devices ({filteredDevices.length}/{devices.length})</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/80 text-slate-400 text-xs font-semibold uppercase tracking-wider bg-slate-900/30">
                  <th className="p-4 px-6">Status</th>
                  <th className="p-4 min-w-[320px]">Device Details</th>
                  <th className="p-4">Sync Mode</th>
                  <th className="p-4">Versions & Network</th>
                  <th className="p-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredDevices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-500 text-sm">
                      {devices.length === 0
                        ? 'No STB devices registered yet. Open the RSDK IPTV Android Player app on any STB to register automatically!'
                        : 'No devices match the selected filter.'}
                    </td>
                  </tr>
                ) : (
                  filteredDevices.map((d) => {
                    const isOnline = d.isActive && d.lastOnline && d.lastOnline.getTime() >= tenMinutesAgo.getTime()
                    return (
                      <tr key={d.id} className="hover:bg-slate-800/10 transition-colors">
                        <td className="p-4 px-6">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <span className={`w-2.5 h-2.5 rounded-full ${
                                !d.isActive ? 'bg-rose-500' : isOnline ? 'bg-emerald-500 glow-green' : 'bg-slate-600'
                              }`}></span>
                              <span className={`font-semibold text-xs ${
                                !d.isActive ? 'text-rose-400' : isOnline ? 'text-emerald-400' : 'text-slate-400'
                              }`}>
                                {!d.isActive ? 'DISABLED' : isOnline ? 'ONLINE' : 'OFFLINE'}
                              </span>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold w-fit border ${
                              d.isActive
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}>
                              API {d.isActive ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 min-w-[320px]">
                          <div className="font-bold text-white">{d.deviceName}</div>
                          <div
                            className="text-slate-400 text-xs mt-1 font-mono leading-relaxed break-all"
                            title={d.deviceId}
                          >
                            <span className="text-slate-500">ID:</span> {d.deviceId}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold w-fit uppercase ${(d.config?.syncMode || DEFAULT_SYNC_MODE) === 'custom' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'}`}>
                              {(d.config?.syncMode || DEFAULT_SYNC_MODE) === 'custom' ? 'Custom M3U' : 'API Server'}
                            </span>
                            {(d.config?.syncMode || DEFAULT_SYNC_MODE) === 'custom' ? (
                              <div className="text-[10px] text-slate-500 truncate max-w-[150px] font-mono" title={d.config?.customM3uUrl || DEFAULT_CUSTOM_M3U_URL}>
                                {d.config?.customM3uUrl || DEFAULT_CUSTOM_M3U_URL}
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-500 italic">Centralized</div>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-slate-300 text-xs">App v{d.appVersion || '1.0.0'} (Android {d.androidVersion || '10'})</div>
                          <div className="text-slate-500 text-xs mt-0.5 font-mono">IP: {d.lastIp || '127.0.0.1'}</div>
                          {d.macAddress && (
                            <div className="text-indigo-400/90 text-xs mt-0.5 font-mono">MAC: {d.macAddress}</div>
                          )}
                        </td>
                        <td className="p-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <ConfirmForm
                              action={toggleDeviceActiveAction}
                              message={
                                d.isActive
                                  ? `Disable API connection for ${d.deviceName}? The STB will be blocked without deleting its settings.`
                                  : `Enable API connection for ${d.deviceName}? The STB can sync and play again.`
                              }
                            >
                              <input type="hidden" name="deviceId" value={d.deviceId} />
                              <input type="hidden" name="currentStatus" value={d.isActive ? 'true' : 'false'} />
                              <button
                                type="submit"
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                  d.isActive
                                    ? 'text-amber-400 hover:text-white border-amber-500/20 hover:bg-amber-500/15'
                                    : 'text-emerald-400 hover:text-white border-emerald-500/20 hover:bg-emerald-500/15'
                                }`}
                              >
                                {d.isActive ? 'Disable API' : 'Enable API'}
                              </button>
                            </ConfirmForm>

                            {/* Edit Config Button */}
                            <a
                              href={`/dashboard/devices?edit=${d.deviceId}`}
                              className="px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-400 hover:text-white border border-indigo-500/20 hover:bg-indigo-500/15 transition-all"
                            >
                              Config
                            </a>

                            {/* Delete Form */}
                            <ConfirmForm
                              action={deleteDeviceAction}
                              message={`Are you sure you want to delete ${d.deviceName}? This will wipe its remote settings.`}
                            >
                              <input type="hidden" name="deviceId" value={d.deviceId} />
                              <button
                                type="submit"
                                className="p-1.5 text-rose-500 hover:text-white border border-rose-500/10 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer"
                                title="Delete Device"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
        </div>

        {/* Modal Backdrop & Configuration Panel */}
        {editingDevice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-3xl glass-card p-6 rounded-2xl border border-border shadow-2xl overflow-y-auto max-h-[90vh] animate-slide-up">
              <div className="flex items-center justify-between mb-6 border-b border-border/80 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-500/10 rounded-lg">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-white text-lg">Remote Config: {editingDevice.deviceName}</h3>
                </div>
                <a href="/dashboard/devices" className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </a>
              </div>

            {showSuccess && (
              <div className="mb-6 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in">
                <svg className="w-4 h-4 text-emerald-400 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Configuration successfully saved & synced!</span>
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
      </div>
    </div>
  )
}
