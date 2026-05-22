import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import ConfirmForm from '@/components/ConfirmForm'
import DeviceConfigForm from '@/components/DeviceConfigForm'
import { redirect } from 'next/navigation'
import { getOnlineThreshold } from '@/lib/time'

export const revalidate = 0 // Disable cache for live devices

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
        syncMode: syncMode || 'api',
        customM3uUrl: customM3uUrl || '',
        technicianPin: technicianPin || '2468',
        lockSettings,
        forceSync,
        autoStartOnBoot,
        educationVideoPath: educationVideoPath || '',
        educationSmbUsername: educationSmbUsername || '',
        educationSmbPassword: educationSmbPassword || '',
        educationSmbDomain: educationSmbDomain || '',
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
  searchParams: Promise<{ edit?: string; success?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const editDeviceId = resolvedSearchParams.edit
  const showSuccess = resolvedSearchParams.success === '1'

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

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white">Device Fleet Manager</h2>
        <p className="text-slate-400 mt-1 text-sm">Monitor all registered Android STBs, control active status, assign playlists, and set remote configuration overrides.</p>
      </div>

      <div className="space-y-8 animate-fade-in">
        {/* Device List Table Card - Always Full Width */}
        <div className="glass-card rounded-2xl border border-border overflow-hidden">
          <div className="px-6 py-5 border-b border-border">
            <h3 className="font-bold text-white text-lg">Registered Devices ({devices.length})</h3>
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
                {devices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-500 text-sm">
                      No STB devices registered yet. Open the RSDK IPTV Android Player app on any STB to register automatically!
                    </td>
                  </tr>
                ) : (
                  devices.map((d) => {
                    const isOnline = d.lastOnline && d.lastOnline.getTime() >= tenMinutesAgo.getTime()
                    return (
                      <tr key={d.id} className="hover:bg-slate-800/10 transition-colors">
                        <td className="p-4 px-6">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-500 glow-green' : 'bg-slate-600'}`}></span>
                            <span className={`font-semibold text-xs ${isOnline ? 'text-emerald-400' : 'text-slate-400'}`}>
                              {isOnline ? 'ONLINE' : 'OFFLINE'}
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
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold w-fit uppercase ${d.config?.syncMode === 'custom' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'}`}>
                              {d.config?.syncMode === 'custom' ? 'Custom M3U' : 'API Server'}
                            </span>
                            {d.config?.syncMode === 'custom' ? (
                              <div className="text-[10px] text-slate-500 truncate max-w-[150px] font-mono" title={d.config.customM3uUrl || ''}>
                                {d.config.customM3uUrl || 'No URL'}
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
