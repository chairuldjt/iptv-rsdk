import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import ConfirmForm from '@/components/ConfirmForm'
import DeviceConfigModal from '@/components/DeviceConfigModal'
import RemoteControlModal from '@/components/RemoteControlModal'
import DeviceSearchAndLimit from '@/components/DeviceSearchAndLimit'
import DevicePagination from '@/components/DevicePagination'
import PageHeader from '@/components/PageHeader'
import EmptyState from '@/components/FeedbackState'
import { redirect } from 'next/navigation'
import { getOnlineThreshold } from '@/lib/time'
import {
  cleanupOfflineDevices,
  getOfflineAutoDeleteDays,
  setOfflineAutoDeleteDays,
} from '@/lib/settings'
import { DEFAULT_CUSTOM_M3U_URL, DEFAULT_SYNC_MODE, normalizeSyncMode } from '@/lib/defaults'
import { getDeviceGroupAssignments, getDeviceGroups } from '@/lib/deviceGroups'
import { pushCommand } from '@/lib/remoteQueue'

export const revalidate = 0
type DeviceStatusFilter = 'all' | 'online' | 'offline' | 'disabled'

function getSyncModeLabel(syncMode: string) {
  if (syncMode === 'custom') return 'Custom M3U'
  return 'API Server'
}

function getSyncModeBadgeClass(syncMode: string) {
  if (syncMode === 'custom') return 'badge badge-warning'
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
    // Realtime push: ask the device to reload its config immediately instead of
    // waiting for the next heartbeat / sync interval.
    pushCommand(deviceId, 'RELOAD_CONFIG')
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

async function clearDeviceCacheAction(formData: FormData) {
  'use server'
  const deviceId = formData.get('deviceId') as string
  try {
    await prisma.deviceConfig.update({
      where: { deviceId },
      data: { clearCacheTrigger: true, forceSync: true },
    })
    // Realtime push: trigger the device to reload config (which clears cache &
    // re-syncs channels) immediately instead of waiting for the heartbeat.
    pushCommand(deviceId, 'RELOAD_CONFIG')
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
  const syncMode = normalizeSyncMode(formData.get('syncMode') as string)
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
  const apiBaseUrl = (formData.get('apiBaseUrl') as string || '').trim()

  try {
    await prisma.device.update({ where: { deviceId }, data: { deviceName } })
    await prisma.deviceConfig.update({
      where: { deviceId },
      data: {
        aspectRatio,
        syncInterval: syncInterval || 1800,
        syncMode: syncMode || DEFAULT_SYNC_MODE,
        customM3uUrl: syncMode === 'custom' ? (customM3uUrl || DEFAULT_CUSTOM_M3U_URL) : '',
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
        apiBaseUrl: apiBaseUrl || null,
      },
    })
    revalidatePath('/dashboard/devices')
    revalidatePath('/dashboard')
  } catch (error) {
    console.error('Save config error:', error)
  }
  // Realtime push: tell the device to reload config immediately. The DB flags
  // (forceSync / educationForceSync) remain as fallback for offline devices.
  pushCommand(deviceId, 'RELOAD_CONFIG')
  redirect(`/dashboard/devices?edit=${deviceId}&success=1`)
}

export default async function DevicesPage({
  searchParams,
}: {
  searchParams: Promise<{
    edit?: string; success?: string; status?: string; cleanupSaved?: string
    remote?: string; q?: string; page?: string; limit?: string; group?: string
  }>
}) {
  const resolvedSearchParams = await searchParams
  const editDeviceId = resolvedSearchParams.edit
  const remoteDeviceId = resolvedSearchParams.remote
  const showSuccess = resolvedSearchParams.success === '1'
  const showCleanupSaved = resolvedSearchParams.cleanupSaved === '1'
  const statusFilter = (['all', 'online', 'offline', 'disabled'].includes(resolvedSearchParams.status || '')
    ? resolvedSearchParams.status : 'all') as DeviceStatusFilter

  const searchQuery = resolvedSearchParams.q || ''
  const limitParam = parseInt(resolvedSearchParams.limit || '25', 10)
  const pageParam = parseInt(resolvedSearchParams.page || '1', 10)
  const allowedLimits = [10, 25, 50, 100]
  const pageSize = allowedLimits.includes(limitParam) ? limitParam : 25
  const currentPage = pageParam > 0 ? pageParam : 1

  const groupFilter = resolvedSearchParams.group || ''

  const offlineAutoDeleteDays = await getOfflineAutoDeleteDays()
  const cleanedDeviceCount = await cleanupOfflineDevices(offlineAutoDeleteDays)
  const deviceGroups = await getDeviceGroups()
  const groupAssignments = await getDeviceGroupAssignments()

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
    if (statusFilter === 'online' && !isOnline) return false
    if (statusFilter === 'offline' && !(d.isActive && !isOnline)) return false
    if (statusFilter === 'disabled' && d.isActive) return false
    if (groupFilter === '__none__' && groupAssignments[d.deviceId]) return false
    if (groupFilter && groupFilter !== '__none__' && groupAssignments[d.deviceId] !== groupFilter) return false
    return true
  })

  const searchedDevices = filteredDevices.filter((d) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    const groupName = deviceGroups.find((group) => group.id === groupAssignments[d.deviceId])?.name?.toLowerCase() || ''
    return (
      d.deviceName.toLowerCase().includes(q) ||
      d.deviceId.toLowerCase().includes(q) ||
      groupName.includes(q) ||
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

      {showCleanupSaved && (
        <div className="alert-banner alert-banner-success">
          <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          {cleanedDeviceCount > 0 ? `${cleanedDeviceCount} perangkat offline lama dihapus.` : 'Tidak ada perangkat offline yang melewati ambang batas.'}
        </div>
      )}

      <div className="toolbar">
        <span className="text-[0.625rem] font-semibold text-muted-foreground uppercase tracking-wider">Status:</span>
        {filterItems.map((item) => (
          <a
            key={item.value}
            href={`/dashboard/devices?status=${item.value}${groupFilter ? `&group=${encodeURIComponent(groupFilter)}` : ''}`}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              statusFilter === item.value
                ? 'bg-primary/15 text-primary border-primary/30'
                : 'text-muted-foreground border-border hover:text-foreground hover:bg-accent/50'
            }`}
          >
            {item.label} ({item.count})
          </a>
        ))}

        <span className="w-px h-5 bg-border hidden md:block" />

        <span className="text-[0.625rem] font-semibold text-muted-foreground uppercase tracking-wider">Group:</span>
        <a
          href={`/dashboard/devices?status=${statusFilter}`}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
            !groupFilter ? 'bg-primary/15 text-primary border-primary/30' : 'text-muted-foreground border-border hover:text-foreground hover:bg-accent/50'
          }`}
        >
          Semua
        </a>
        {deviceGroups.map((g) => (
          <a
            key={g.id}
            href={`/dashboard/devices?status=${statusFilter}&group=${encodeURIComponent(g.id)}`}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
              groupFilter === g.id ? 'bg-primary/15 text-primary border-primary/30' : 'text-muted-foreground border-border hover:text-foreground hover:bg-accent/50'
            }`}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: g.color }} />
            {g.name}
          </a>
        ))}

        <div className="ml-auto">
          <form action={saveOfflineCleanupSettingAction} className="flex items-center gap-2">
            <label className="text-[0.625rem] text-muted-foreground">Hapus offline &gt;</label>
            <input
              type="number" name="offlineAutoDeleteDays" defaultValue={offlineAutoDeleteDays}
              min={0} max={3650}
              className="w-16 px-2 py-1 bg-background border border-border rounded-lg text-foreground text-xs focus:outline-none focus:border-primary"
            />
            <span className="text-[0.625rem] text-muted-foreground">hari</span>
            <button type="submit" className="btn btn-primary btn-xs">Simpan</button>
          </form>
        </div>
      </div>

      <div className="section-card">
        <div className="section-card-header flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-semibold text-sm text-foreground">
              Daftar Perangkat ({searchQuery ? `${searchedDevices.length} ditemukan` : `${filteredDevices.length}/${devices.length}`})
            </h3>
          </div>
        </div>

        <DeviceSearchAndLimit />

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Status</th>
                <th className="min-w-[240px]">Detail Perangkat</th>
                <th>Group</th>
                <th>Sync Mode</th>
                <th>Versi &amp; Jaringan</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {searchedDevices.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      title={devices.length === 0 ? 'Belum Ada Perangkat' : 'Tidak Ada Hasil'}
                      description={devices.length === 0
                        ? 'Jalankan aplikasi RSDK IPTV di STB Android untuk registrasi otomatis.'
                        : 'Tidak ada perangkat yang cocok dengan filter atau pencarian saat ini.'}
                    />
                  </td>
                </tr>
              ) : (
                paginatedDevices.map((d) => {
                  const isOnline = d.isActive && d.lastOnline && d.lastOnline.getTime() >= tenMinutesAgo.getTime()
                  const assignedGroupId = groupAssignments[d.deviceId] || ''
                  const assignedGroup = deviceGroups.find((group) => group.id === assignedGroupId)
                  return (
                    <tr key={d.id}>
                      <td>
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${!d.isActive ? 'bg-destructive' : isOnline ? 'bg-emerald-500 animate-pulse-glow' : 'bg-muted'}`} />
                            <span className={`font-semibold text-[0.625rem] tracking-wide ${!d.isActive ? 'text-destructive' : isOnline ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                              {!d.isActive ? 'NONAKTIF' : isOnline ? 'ONLINE' : 'OFFLINE'}
                            </span>
                          </div>
                          <span className={`badge ${d.isActive ? 'badge-success' : 'badge-destructive'}`}>
                            {d.isActive ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="font-semibold text-foreground">{d.deviceName}</div>
                        <div className="text-[0.625rem] text-muted-foreground mt-0.5 font-mono break-all">
                          ID: {d.deviceId}
                        </div>
                      </td>
                      <td>
                        {assignedGroup ? (
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: assignedGroup.color }} />
                            <span className="font-medium text-foreground">{assignedGroup.name}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/60 italic text-[0.6875rem]">Tanpa grup</span>
                        )}
                      </td>
                      <td>
                        <span className={getSyncModeBadgeClass(normalizeSyncMode(d.config?.syncMode || DEFAULT_SYNC_MODE))}>
                          {getSyncModeLabel(normalizeSyncMode(d.config?.syncMode || DEFAULT_SYNC_MODE))}
                        </span>
                      </td>
                      <td>
                        <div className="text-foreground/80">App v{d.appVersion || '1.0.0'}</div>
                        <div className="text-[0.625rem] text-muted-foreground mt-0.5 font-mono">IP: {d.lastIp || '-'}</div>
                        {d.macAddress && (
                          <div className="text-[0.625rem] text-muted-foreground font-mono">MAC: {d.macAddress}</div>
                        )}
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <ConfirmForm
                            action={toggleDeviceActiveAction}
                            message={d.isActive ? `Nonaktifkan ${d.deviceName}? Perangkat akan diblokir tanpa menghapus pengaturan.` : `Aktifkan ${d.deviceName}? Perangkat dapat sync dan memutar kembali.`}
                            confirmLabel={d.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                          >
                            <input type="hidden" name="deviceId" value={d.deviceId} />
                            <input type="hidden" name="currentStatus" value={d.isActive ? 'true' : 'false'} />
                            <button type="submit" className={`btn btn-xs rounded-lg ${d.isActive ? 'text-amber-400 border-amber-500/20 hover:bg-amber-500/10' : 'text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10'}`}>
                              {d.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                            </button>
                          </ConfirmForm>

                          <a href={`/dashboard/devices?edit=${d.deviceId}`} className="btn btn-xs text-primary border-primary/20 hover:bg-primary/10 rounded-lg">
                            Konfigurasi
                          </a>

                          {d.isActive && isOnline ? (
                            <a href={`/dashboard/devices?remote=${d.deviceId}`} className="btn btn-xs text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10 rounded-lg animate-pulse-glow">
                              Remote
                            </a>
                          ) : (
                            <button disabled className="btn btn-xs text-muted/30 border-border/30 rounded-lg cursor-not-allowed opacity-40">
                              Remote
                            </button>
                          )}

                          <ConfirmForm
                            action={deleteDeviceAction}
                            message={`Hapus ${d.deviceName}? Semua pengaturan remote akan dihapus permanen.`}
                            confirmLabel="Hapus"
                            successToast="Perangkat berhasil dihapus."
                          >
                            <input type="hidden" name="deviceId" value={d.deviceId} />
                            <button type="submit" className="p-1.5 text-rose-400 hover:text-rose-300 border border-rose-500/10 hover:bg-rose-500/10 rounded-lg transition-all">
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
        <DeviceConfigModal
          editingDevice={editingDevice}
          showSuccess={showSuccess}
          saveDeviceConfigAction={saveDeviceConfigAction}
          clearDeviceCacheAction={clearDeviceCacheAction}
        />
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
