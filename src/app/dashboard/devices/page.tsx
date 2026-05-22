import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import ConfirmForm from '@/components/ConfirmForm'

export const revalidate = 0 // Disable cache for live devices

// Server Action to toggle device active status directly
async function toggleDeviceAction(formData: FormData) {
  'use server'
  const deviceId = formData.get('deviceId') as string
  const currentStatus = formData.get('currentStatus') === 'true'

  try {
    await prisma.device.update({
      where: { deviceId },
      data: { isActive: !currentStatus },
    })
    revalidatePath('/dashboard/devices')
    revalidatePath('/dashboard')
  } catch (error) {
    console.error('Toggle device error:', error)
  }
}

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

// Server Action to update device config and custom settings
async function saveDeviceConfigAction(formData: FormData) {
  'use server'
  const deviceId = formData.get('deviceId') as string
  const deviceName = formData.get('deviceName') as string
  const playlistIdRaw = formData.get('playlistId') as string
  const aspectRatio = formData.get('aspectRatio') as string
  const syncInterval = parseInt(formData.get('syncInterval') as string)
  const technicianPin = formData.get('technicianPin') as string
  
  const educationVideoPath = formData.get('educationVideoPath') as string
  const educationSmbUsername = formData.get('educationSmbUsername') as string
  const educationSmbPassword = formData.get('educationSmbPassword') as string
  const educationSmbDomain = formData.get('educationSmbDomain') as string

  const isActive = formData.get('isActive') === 'on'
  const lockSettings = formData.get('lockSettings') === 'on'
  const forceSync = true // Always force sync on any configuration change
  const autoStartOnBoot = formData.get('autoStartOnBoot') === 'on'

  const playlistId = playlistIdRaw ? parseInt(playlistIdRaw) : null

  try {
    // 1. Update Device table
    await prisma.device.update({
      where: { deviceId },
      data: {
        deviceName,
        playlistId,
        isActive,
      },
    })

    // 2. Update DeviceConfig table
    await prisma.deviceConfig.update({
      where: { deviceId },
      data: {
        aspectRatio,
        syncInterval: syncInterval || 1800,
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
}

export default async function DevicesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const editDeviceId = resolvedSearchParams.edit

  // Fetch all devices
  const devices = await prisma.device.findMany({
    orderBy: { lastOnline: 'desc' },
    include: {
      playlist: true,
      config: true,
    },
  })

  // Fetch playlists for dropdown assignment
  const playlists = await prisma.playlist.findMany({
    orderBy: { name: 'asc' },
  })

  // Find the selected device for edit panel
  const editingDevice = editDeviceId
    ? devices.find((d) => d.deviceId === editDeviceId)
    : null

  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white">Device Fleet Manager</h2>
        <p className="text-slate-400 mt-1 text-sm">Monitor all registered Android STBs, control active status, assign playlists, and set remote configuration overrides.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Device List Table Card */}
        <div className={`${editingDevice ? 'xl:col-span-2' : 'xl:col-span-3'} glass-card rounded-2xl border border-border overflow-hidden`}>
          <div className="px-6 py-5 border-b border-border">
            <h3 className="font-bold text-white text-lg">Registered Devices ({devices.length})</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/80 text-slate-400 text-xs font-semibold uppercase tracking-wider bg-slate-900/30">
                  <th className="p-4 px-6">Status</th>
                  <th className="p-4 min-w-[320px]">Device Details</th>
                  <th className="p-4">Assigned Playlist</th>
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
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${d.playlist ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                            {d.playlist ? d.playlist.name : 'Global Default'}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="text-slate-300 text-xs">App v{d.appVersion || '1.0.0'} (Android {d.androidVersion || '10'})</div>
                          <div className="text-slate-500 text-xs mt-0.5 font-mono">IP: {d.lastIp || '127.0.0.1'}</div>
                        </td>
                        <td className="p-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-3">
                            {/* Toggle Button Form */}
                            <form action={toggleDeviceAction}>
                              <input type="hidden" name="deviceId" value={d.deviceId} />
                              <input type="hidden" name="currentStatus" value={d.isActive ? 'true' : 'false'} />
                              <button
                                type="submit"
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                  d.isActive
                                    ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/10'
                                    : 'bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 border border-rose-500/10'
                                }`}
                              >
                                {d.isActive ? 'Active' : 'Disabled'}
                              </button>
                            </form>

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

        {/* Edit Configuration Override Panel Card */}
        {editingDevice && (
          <div className="lg:col-span-1 glass-card p-6 rounded-2xl border border-border h-fit animate-slide-in">
            <div className="flex items-center justify-between mb-4 border-b border-border/80 pb-3">
              <h3 className="font-bold text-white text-lg">Remote Configuration</h3>
              <a href="/dashboard/devices" className="text-xs font-bold text-slate-400 hover:text-white">✕ Close</a>
            </div>

            <form action={saveDeviceConfigAction} className="space-y-4">
              <input type="hidden" name="deviceId" value={editingDevice.deviceId} />

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Friendly Name</label>
                <input
                  type="text"
                  name="deviceName"
                  defaultValue={editingDevice.deviceName}
                  required
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Assign Custom Playlist</label>
                <select
                  name="playlistId"
                  defaultValue={editingDevice.playlistId || ''}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-primary"
                >
                  <option value="">Global Default Playlist</option>
                  {playlists.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.totalChannels} ch)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Aspect Ratio</label>
                <select
                  name="aspectRatio"
                  defaultValue={editingDevice.config?.aspectRatio || 'fit'}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-primary"
                >
                  <option value="fit">Fit (Original Scale)</option>
                  <option value="stretch">Stretch (Fullscreen)</option>
                  <option value="zoom">Zoom (Cropped Full)</option>
                  <option value="16_9">Force 16:9</option>
                  <option value="4_3">Force 4:3</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Sync (Seconds)</label>
                  <input
                    type="number"
                    name="syncInterval"
                    defaultValue={editingDevice.config?.syncInterval || 1800}
                    required
                    min={60}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Technician PIN</label>
                  <input
                    type="text"
                    name="technicianPin"
                    defaultValue={editingDevice.config?.technicianPin || '2468'}
                    required
                    maxLength={8}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-primary font-mono text-center"
                  />
                </div>
              </div>

              {/* SMB Education Settings Block */}
              <div className="pt-4 border-t border-border/60 space-y-4">
                <div className="flex items-center gap-2 text-indigo-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <span className="text-xs font-extrabold uppercase tracking-wider">Konten Edukasi (SMB Share)</span>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Jalur Folder Video (SMB Share)</label>
                  <input
                    type="text"
                    name="educationVideoPath"
                    defaultValue={editingDevice.config?.educationVideoPath || ''}
                    placeholder="Contoh: \\10.45.128.129\edukasi"
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-primary font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Username SMB</label>
                    <input
                      type="text"
                      name="educationSmbUsername"
                      defaultValue={editingDevice.config?.educationSmbUsername || ''}
                      placeholder="Guest jika kosong"
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Domain SMB</label>
                    <input
                      type="text"
                      name="educationSmbDomain"
                      defaultValue={editingDevice.config?.educationSmbDomain || ''}
                      placeholder="Opsional"
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Password SMB</label>
                  <input
                    type="password"
                    name="educationSmbPassword"
                    defaultValue={editingDevice.config?.educationSmbPassword || ''}
                    placeholder="Kosongkan jika tanpa password"
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-2 pt-2 border-t border-border/60">
                <label className="flex items-center gap-3 cursor-pointer p-1.5 hover:bg-slate-800/20 rounded-lg transition-colors">
                  <input
                    type="checkbox"
                    name="isActive"
                    defaultChecked={editingDevice.isActive}
                    className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary"
                  />
                  <div>
                    <span className="text-xs font-bold text-white">Device Active Status</span>
                    <p className="text-[10px] text-slate-500">Enable or block device stream access.</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer p-1.5 hover:bg-slate-800/20 rounded-lg transition-colors">
                  <input
                    type="checkbox"
                    name="lockSettings"
                    defaultChecked={editingDevice.config?.lockSettings}
                    className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary"
                  />
                  <div>
                    <span className="text-xs font-bold text-white">Lock Settings in Client</span>
                    <p className="text-[10px] text-slate-500">Block users from changing URL at STB.</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer p-1.5 hover:bg-slate-800/20 rounded-lg transition-colors">
                  <input
                    type="checkbox"
                    name="autoStartOnBoot"
                    defaultChecked={editingDevice.config?.autoStartOnBoot}
                    className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary"
                  />
                  <div>
                    <span className="text-xs font-bold text-white">Auto Start on Boot</span>
                    <p className="text-[10px] text-slate-500">Launch player right after STB turns on.</p>
                  </div>
                </label>

                <div className="flex items-center gap-3 p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/15">
                  <div className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-indigo-400 block">Real-Time Sync Active</span>
                    <p className="text-[10px] text-indigo-400/70">Changes are automatically pushed to the device in 5 seconds.</p>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-4 py-3 rounded-xl bg-primary hover:bg-indigo-500 font-bold text-white text-sm transition-all duration-200 cursor-pointer text-center glow-indigo"
              >
                Save Configuration Override
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
