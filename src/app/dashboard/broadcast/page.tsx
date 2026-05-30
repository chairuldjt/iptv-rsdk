import { redirect } from 'next/navigation'
import prisma from '@/lib/db'
import {
  FALLBACK_VIDEO_BROADCAST_CONFIG,
  getVideoBroadcastProfiles,
  getVideoGlobalProfileId,
  getVideoBroadcastGroupProfileMap,
  getVideoBroadcastDeviceProfileMap,
  getVideoBroadcastProfileConfig,
} from '@/lib/videoBroadcast'
import {
  FALLBACK_RUNNING_TEXT_CONFIG,
  getRunningTextProfiles,
  getRunningGlobalProfileId,
  getRunningTextGroupProfileMap,
  getRunningTextDeviceProfileMap,
  getRunningTextProfileConfig,
} from '@/lib/runningText'
import { getDeviceGroupAssignments, getDeviceGroups } from '@/lib/deviceGroups'

import VideoBroadcastManager from '@/components/VideoBroadcastManager'
import RunningTextPanelClient from '@/components/RunningTextPanelClient'

import TabsNavigation from './_components/TabsNavigation'
import ProfileCardItem from './_components/ProfileCardItem'
import NotificationBar from './_components/NotificationBar'
import BackBreadcrumb from './_components/BackBreadcrumb'

import {
  createVideoProfileAction,
  saveVideoProfileConfigAction,
  deleteVideoProfileAction,
  setVideoGlobalAction,
  playVideoBroadcastNowAction,
  stopVideoBroadcastNowAction,
  cloneVideoProfileAction,
  exportVideoProfileAction,
  toggleVideoLockAction,
  toggleVideoEnabledAction,
  unsetVideoGlobalAction,
  assignVideoGroupModalAction,
  assignVideoDeviceModalAction,
} from './actions/videoActions'

import {
  createRunningProfileAction,
  saveRunningProfileConfigAction,
  deleteRunningProfileAction,
  setRunningGlobalAction,
  pushRunningTextLiveAction,
  stopRunningTextLiveAction,
  cloneRunningProfileAction,
  exportRunningProfileAction,
  toggleRunningLockAction,
  toggleRunningEnabledAction,
  unsetRunningGlobalAction,
  assignRunningGroupModalAction,
  assignRunningDeviceModalAction,
} from './actions/runningTextActions'

export const revalidate = 0

// ── Search Params Type ────────────────────────────────────────────────────────

type BroadcastSearchParams = {
  tab?: string
  editVideoProfile?: string
  assignVideoProfile?: string
  editRunningProfile?: string
  assignRunningProfile?: string
  created?: string
  saved?: string
  reset?: string
  updated?: string
  deleted?: string
  globalSet?: string
  globalUnset?: string
  ok?: string
  notice?: string
  pushed?: string
  error?: string
  count?: string
  skipped?: string
  cloned?: string
  imported?: string
  importError?: string
  locked?: string
  enabledToggled?: string
}

function countVideoProfileRecipients(params: {
  profileId: string
  isGlobal: boolean
  devices: Array<{ deviceId: string; isActive: boolean }>
  groupAssignments: Record<string, string>
  groupProfileMap: Record<string, string>
  deviceProfileMap: Record<string, string>
}): number {
  const { profileId, isGlobal, devices, groupAssignments, groupProfileMap, deviceProfileMap } = params
  const activeDeviceIds = devices.filter((device) => device.isActive).map((device) => device.deviceId)
  if (isGlobal) return activeDeviceIds.length

  const assignedGroupIds = Object.entries(groupProfileMap)
    .filter(([, pid]) => pid === profileId)
    .map(([groupId]) => groupId)

  const assignedDeviceIds = Object.entries(deviceProfileMap)
    .filter(([, pid]) => pid === profileId)
    .map(([deviceId]) => deviceId)

  const recipients = activeDeviceIds.filter((deviceId) => {
    const assignedGroupId = groupAssignments[deviceId]
    return assignedDeviceIds.includes(deviceId) || (assignedGroupId ? assignedGroupIds.includes(assignedGroupId) : false)
  })

  return Array.from(new Set(recipients)).length
}

function buildVideoNotice(sp: BroadcastSearchParams): { message: string; tone: 'success' | 'error' | 'info' } | null {
  if (sp.error) {
    return {
      message: decodeURIComponent(sp.error),
      tone: 'error',
    }
  }

  if (sp.saved) {
    return { message: 'Konfigurasi Video Broadcast berhasil disimpan.', tone: 'success' }
  }

  if (sp.notice === 'broadcast-live-played') {
    const count = Number.parseInt(sp.count || '0', 10) || 0
    const skipped = Number.parseInt(sp.skipped || '0', 10) || 0
    const baseMessage = `Live broadcast berhasil dikirim ke ${count} device aktif.`
    return skipped > 0
      ? { message: `${baseMessage} ${skipped} item tidak ikut terkirim karena sudah tidak playable.`, tone: 'info' }
      : { message: baseMessage, tone: 'success' }
  }

  if (sp.notice === 'broadcast-live-stopped') {
    const count = Number.parseInt(sp.count || '0', 10) || 0
    return { message: `Perintah stop broadcast berhasil dikirim ke ${count} device aktif.`, tone: 'success' }
  }

  return null
}

function buildRunningNotice(sp: BroadcastSearchParams): { message: string; tone: 'success' | 'error' | 'info' } | null {
  if (sp.error) {
    return {
      message: decodeURIComponent(sp.error),
      tone: 'error',
    }
  }

  if (sp.saved) {
    return { message: 'Konfigurasi Running Text berhasil disimpan ke profile.', tone: 'success' }
  }

  if (sp.notice === 'running-live-queued') {
    const count = Number.parseInt(sp.count || '0', 10) || 0
    return {
      message: `Perintah marquee live berhasil diantrikan ke ${count} device aktif.`,
      tone: 'success',
    }
  }

  if (sp.notice === 'running-live-stopped') {
    const count = Number.parseInt(sp.count || '0', 10) || 0
    return {
      message: `Perintah stop marquee berhasil diantrikan ke ${count} device aktif.`,
      tone: 'success',
    }
  }

  return null
}

// ── Page Component ────────────────────────────────────────────────────────────

export default async function BroadcastPage({
  searchParams,
}: {
  searchParams: Promise<BroadcastSearchParams>
}) {
  const sp = await searchParams
  const activeTab = sp.tab === 'ticker' ? 'ticker' : 'video'
  const hasNotif = sp.created || sp.saved || sp.updated || sp.deleted || sp.globalSet || sp.globalUnset || sp.ok || sp.notice || sp.pushed || sp.cloned || sp.imported || sp.importError || sp.locked

  // Load common data
  const [groups, groupAssignments, devices, broadcastVideos, folders] = await Promise.all([
    getDeviceGroups(),
    getDeviceGroupAssignments(),
    prisma.device.findMany({
      orderBy: [{ deviceName: 'asc' }],
      select: { deviceId: true, deviceName: true, isActive: true },
    }),
    prisma.educationVideo.findMany({
      where: {
        isPublished: true,
        OR: [{ folderId: null }, { folder: { isPublished: true } }],
      },
      orderBy: [{ folder: { name: 'asc' } }, { title: 'asc' }],
      select: { id: true, title: true, videoUrl: true, isPublished: true, folder: { select: { name: true } } },
    }),
    prisma.educationFolder.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ])

  // ── Tab 1: Video Broadcast ────────────────────────────────────────────────

  if (activeTab === 'video') {
    const videoProfiles = await getVideoBroadcastProfiles()
    const globalVideoProfileId = await getVideoGlobalProfileId()
    const groupVideoProfileMap = await getVideoBroadcastGroupProfileMap()
    const deviceVideoProfileMap = await getVideoBroadcastDeviceProfileMap()

    // Mode: Edit Profile Config
    if (sp.editVideoProfile) {
      const profile = videoProfiles.find((p) => p.id === sp.editVideoProfile)
      if (!profile) redirect('/dashboard/broadcast?tab=video')

      const rawConfig = (await getVideoBroadcastProfileConfig(profile.id)) ?? FALLBACK_VIDEO_BROADCAST_CONFIG

      const notification = buildVideoNotice(sp)
      const activeRecipientCount = countVideoProfileRecipients({
        profileId: profile.id,
        isGlobal: globalVideoProfileId === profile.id,
        devices,
        groupAssignments,
        groupProfileMap: groupVideoProfileMap,
        deviceProfileMap: deviceVideoProfileMap,
      })

      return (
        <div className="space-y-6 animate-fade-in">
          <BackBreadcrumb
            href="/dashboard/broadcast?tab=video"
            backLabel="Kembali ke Daftar Profile Video"
            currentLabel={`Edit Config: ${profile.name}`}
          />
          {notification && <NotificationBar message={notification.message} tone={notification.tone} />}
          <VideoBroadcastManager
            profileId={profile.id}
            profileName={profile.name}
            initialVideoId={rawConfig.videoId}
            initialRepeatCount={rawConfig.repeatCount}
            initialItems={rawConfig.items || []}
            initialOverlay={rawConfig.runningText}
            videos={broadcastVideos.map((v) => ({
              id: v.id,
              title: v.title,
              folderName: v.folder?.name || null,
              isPublished: v.isPublished,
            }))}
            isGlobal={globalVideoProfileId === profile.id}
            assignedGroupCount={Object.values(groupVideoProfileMap).filter((pid) => pid === profile.id).length}
            assignedDeviceCount={Object.values(deviceVideoProfileMap).filter((pid) => pid === profile.id).length}
            activeRecipientCount={activeRecipientCount}
            folders={folders}
            onSaveAction={saveVideoProfileConfigAction}
            onPlayNowAction={playVideoBroadcastNowAction}
            onStopNowAction={stopVideoBroadcastNowAction}
          />
        </div>
      )
    }

    // Default: Video Profile List
    return (
      <div className="space-y-6">
        <TabsNavigation activeTab={activeTab} />

        {hasNotif && (
          <NotificationBar
            message={
              sp.created ? 'Video Broadcast Profile baru berhasil dibuat.'
              : sp.deleted ? 'Profile berhasil dihapus.'
              : sp.globalSet ? 'Global Video profile berhasil diperbarui.'
              : sp.globalUnset ? 'Global Video profile berhasil di-unset.'
              : sp.cloned ? 'Profile berhasil di-clone.'
              : sp.imported ? 'Profile berhasil di-import.'
              : sp.locked ? 'Status lock profile berhasil diubah.'
              : sp.importError ? `Import gagal: ${decodeURIComponent(sp.importError)}`
              : buildVideoNotice(sp)?.message || ''
            }
            tone={
              sp.created || sp.deleted || sp.globalSet || sp.globalUnset || sp.cloned || sp.imported || sp.locked
                ? 'success'
                : buildVideoNotice(sp)?.tone || 'success'
            }
          />
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[340px_minmax(0,1fr)] gap-6 items-start animate-fade-in">
          {/* Create Profile Card */}
          <div className="card rounded-2xl p-5 border border-border bg-card space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Buat Profile Video</h3>
            <form action={createVideoProfileAction} className="space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Nama Profile</span>
                <input type="text" name="profileName" required className="field-input" placeholder="Contoh: Promo RS, Video Hari Raya" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Deskripsi</span>
                <input type="text" name="profileDescription" className="field-input" placeholder="Opsional" />
              </label>
              <button type="submit" className="w-full btn btn-primary py-2.5">+ Buat Profile</button>
            </form>
          </div>

          {/* Profile List */}
          <div className="space-y-3">
            {videoProfiles.length === 0 ? (
              <div className="card rounded-2xl p-10 text-center text-xs text-muted-foreground border border-border bg-card">
                Belum ada Video Broadcast Profile. Buat profile baru di panel sebelah kiri.
              </div>
            ) : (
              videoProfiles.map((p) => {
                const isGlobal = globalVideoProfileId === p.id
                const assignedGroupCount = Object.values(groupVideoProfileMap).filter((pid) => pid === p.id).length
                const assignedDeviceCount = Object.values(deviceVideoProfileMap).filter((pid) => pid === p.id).length

                const profileGroups = groups.map((g) => ({
                  id: g.id,
                  name: g.name,
                  isAssigned: groupVideoProfileMap[g.id] === p.id,
                  currentProfileName: (() => {
                    const curPid = groupVideoProfileMap[g.id]
                    return curPid && curPid !== p.id ? videoProfiles.find((vp) => vp.id === curPid)?.name || null : null
                  })(),
                  color: g.color,
                  memberCount: Object.values(groupAssignments).filter((gid) => gid === g.id).length,
                }))

                const profileDevices = devices.map((d) => ({
                  id: d.deviceId,
                  name: d.deviceName,
                  isAssigned: deviceVideoProfileMap[d.deviceId] === p.id,
                  currentProfileName: (() => {
                    const curPid = deviceVideoProfileMap[d.deviceId]
                    return curPid && curPid !== p.id ? videoProfiles.find((vp) => vp.id === curPid)?.name || null : null
                  })(),
                }))

                return (
                  <ProfileCardItem
                    key={p.id}
                    profile={p}
                    isGlobal={isGlobal}
                    editHref={`/dashboard/broadcast?tab=video&editVideoProfile=${p.id}`}
                    deleteAction={deleteVideoProfileAction}
                    setGlobalAction={setVideoGlobalAction}
                    cloneAction={cloneVideoProfileAction}
                    exportAction={exportVideoProfileAction}
                    toggleLockAction={toggleVideoLockAction}
                    toggleEnabledAction={toggleVideoEnabledAction}
                    unsetGlobalAction={unsetVideoGlobalAction}
                    assignedGroupCount={assignedGroupCount}
                    assignedDeviceCount={assignedDeviceCount}
                    groups={profileGroups}
                    devices={profileDevices}
                    onAssignGroup={assignVideoGroupModalAction}
                    onAssignDevice={assignVideoDeviceModalAction}
                  />
                )
              })
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Tab 2: Running Text Ticker ──────────────────────────────────────────────

  if (activeTab === 'ticker') {
    const runningProfiles = await getRunningTextProfiles()
    const globalRunningProfileId = await getRunningGlobalProfileId()
    const groupRunningProfileMap = await getRunningTextGroupProfileMap()
    const deviceRunningProfileMap = await getRunningTextDeviceProfileMap()

    // Mode: Edit Profile Config
    if (sp.editRunningProfile) {
      const profile = runningProfiles.find((p) => p.id === sp.editRunningProfile)
      if (!profile) redirect('/dashboard/broadcast?tab=ticker')

      const rawConfig = (await getRunningTextProfileConfig(profile.id)) ?? FALLBACK_RUNNING_TEXT_CONFIG

      const runningNotice = buildRunningNotice(sp)

      return (
        <div className="space-y-6 animate-fade-in">
          <BackBreadcrumb
            href="/dashboard/broadcast?tab=ticker"
            backLabel="Kembali ke Daftar Profile Running Text"
            currentLabel={`Edit Config: ${profile.name}`}
          />
          {runningNotice && <NotificationBar message={runningNotice.message} tone={runningNotice.tone} />}
          <RunningTextPanelClient
            profileId={profile.id}
            profileName={profile.name}
            runningText={rawConfig}
            isGlobal={globalRunningProfileId === profile.id}
            assignedGroupCount={Object.values(groupRunningProfileMap).filter((pid) => pid === profile.id).length}
            assignedDeviceCount={Object.values(deviceRunningProfileMap).filter((pid) => pid === profile.id).length}
            saveAction={saveRunningProfileConfigAction}
            pushLiveAction={pushRunningTextLiveAction}
            stopLiveAction={stopRunningTextLiveAction}
          />
        </div>
      )
    }

    // Default: Running Profile List
    return (
      <div className="space-y-6">
        <TabsNavigation activeTab={activeTab} />

        {hasNotif && (
          <NotificationBar
            message={
              sp.created ? 'Running Text Profile baru berhasil dibuat.'
              : sp.deleted ? 'Profile berhasil dihapus.'
              : sp.globalSet ? 'Global Running Text profile berhasil diperbarui.'
              : sp.globalUnset ? 'Global Running Text profile berhasil di-unset.'
              : sp.cloned ? 'Profile berhasil di-clone.'
              : sp.imported ? 'Profile berhasil di-import.'
              : sp.locked ? 'Status lock profile berhasil diubah.'
              : sp.importError ? `Import gagal: ${decodeURIComponent(sp.importError)}`
              : ''
            }
          />
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[340px_minmax(0,1fr)] gap-6 items-start animate-fade-in">
          {/* Create Profile Card */}
          <div className="card rounded-2xl p-5 border border-border bg-card space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Buat Profile Running Text</h3>
            <form action={createRunningProfileAction} className="space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Nama Profile</span>
                <input type="text" name="profileName" required className="field-input" placeholder="Contoh: Info Harian RS, Pengumuman Rawat Inap" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Deskripsi</span>
                <input type="text" name="profileDescription" className="field-input" placeholder="Opsional" />
              </label>
              <button type="submit" className="w-full btn btn-primary py-2.5">+ Buat Profile</button>
            </form>
          </div>

          {/* Profile List */}
          <div className="space-y-3">
            {runningProfiles.length === 0 ? (
              <div className="card rounded-2xl p-10 text-center text-xs text-muted-foreground border border-border bg-card">
                Belum ada Running Text Profile. Buat profile baru di panel sebelah kiri.
              </div>
            ) : (
              runningProfiles.map((p) => {
                const isGlobal = globalRunningProfileId === p.id
                const assignedGroupCount = Object.values(groupRunningProfileMap).filter((pid) => pid === p.id).length
                const assignedDeviceCount = Object.values(deviceRunningProfileMap).filter((pid) => pid === p.id).length

                const profileGroups = groups.map((g) => ({
                  id: g.id,
                  name: g.name,
                  isAssigned: groupRunningProfileMap[g.id] === p.id,
                  currentProfileName: (() => {
                    const curPid = groupRunningProfileMap[g.id]
                    return curPid && curPid !== p.id ? runningProfiles.find((rp) => rp.id === curPid)?.name || null : null
                  })(),
                  color: g.color,
                  memberCount: Object.values(groupAssignments).filter((gid) => gid === g.id).length,
                }))

                const profileDevices = devices.map((d) => ({
                  id: d.deviceId,
                  name: d.deviceName,
                  isAssigned: deviceRunningProfileMap[d.deviceId] === p.id,
                  currentProfileName: (() => {
                    const curPid = deviceRunningProfileMap[d.deviceId]
                    return curPid && curPid !== p.id ? runningProfiles.find((rp) => rp.id === curPid)?.name || null : null
                  })(),
                }))

                return (
                  <ProfileCardItem
                    key={p.id}
                    profile={p}
                    isGlobal={isGlobal}
                    editHref={`/dashboard/broadcast?tab=ticker&editRunningProfile=${p.id}`}
                    deleteAction={deleteRunningProfileAction}
                    setGlobalAction={setRunningGlobalAction}
                    cloneAction={cloneRunningProfileAction}
                    exportAction={exportRunningProfileAction}
                    toggleLockAction={toggleRunningLockAction}
                    toggleEnabledAction={toggleRunningEnabledAction}
                    unsetGlobalAction={unsetRunningGlobalAction}
                    assignedGroupCount={assignedGroupCount}
                    assignedDeviceCount={assignedDeviceCount}
                    groups={profileGroups}
                    devices={profileDevices}
                    onAssignGroup={assignRunningGroupModalAction}
                    onAssignDevice={assignRunningDeviceModalAction}
                  />
                )
              })
            )}
          </div>
        </div>
      </div>
    )
  }
}
