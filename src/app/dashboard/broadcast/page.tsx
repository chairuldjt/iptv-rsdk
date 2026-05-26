import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import prisma from '@/lib/db'
import PageHeader from '@/components/PageHeader'
import ConfirmForm from '@/components/ConfirmForm'
import VideoBroadcastManager from '@/components/VideoBroadcastManager'
import RunningTextPanelClient from '@/components/RunningTextPanelClient'
import {
  FALLBACK_VIDEO_BROADCAST_CONFIG,
  getVideoBroadcastProfiles,
  getVideoGlobalProfileId,
  getVideoBroadcastGroupProfileMap,
  getVideoBroadcastDeviceProfileMap,
  getVideoBroadcastProfileConfig,
  createVideoBroadcastProfile,
  updateVideoBroadcastProfileMeta,
  saveVideoBroadcastProfileConfig,
  deleteVideoBroadcastProfile,
  setVideoGlobalProfileId,
  assignVideoBroadcastProfileToGroup,
  assignVideoBroadcastProfileToDevice,
  type VideoBroadcastProfile,
  type VideoBroadcastConfig,
  videoBroadcastFromFormData,
} from '@/lib/videoBroadcast'
import {
  FALLBACK_RUNNING_TEXT_CONFIG,
  getRunningTextProfiles,
  getRunningGlobalProfileId,
  getRunningTextGroupProfileMap,
  getRunningTextDeviceProfileMap,
  getRunningTextProfileConfig,
  createRunningTextProfile,
  updateRunningTextProfileMeta,
  saveRunningTextProfileConfig,
  deleteRunningTextProfile,
  setRunningGlobalProfileId,
  assignRunningTextProfileToGroup,
  assignRunningTextProfileToDevice,
  type RunningTextProfile,
  type RunningTextConfig,
} from '@/lib/runningText'
import type { HomeExperienceRunningTextItem } from '@/lib/homeExperience'
import { getDeviceGroupAssignments, getDeviceGroups } from '@/lib/deviceGroups'
import { pushCommand } from '@/lib/remoteQueue'

export const revalidate = 0

// ── 📹 Video Profile Server Actions ───────────────────────────────────────────

async function createVideoProfileAction(formData: FormData) {
  'use server'
  const name = (formData.get('profileName') as string) || ''
  const description = (formData.get('profileDescription') as string) || ''
  const profile = await createVideoBroadcastProfile({ name, description })
  revalidatePath('/dashboard/broadcast')
  redirect(`/dashboard/broadcast?tab=video&editVideoProfile=${encodeURIComponent(profile.id)}&created=1`)
}

async function updateVideoProfileMetaAction(formData: FormData) {
  'use server'
  const profileId = (formData.get('profileId') as string) || ''
  const name = (formData.get('profileName') as string) || ''
  const description = (formData.get('profileDescription') as string) || ''
  if (profileId) await updateVideoBroadcastProfileMeta(profileId, { name, description })
  revalidatePath('/dashboard/broadcast')
  redirect(`/dashboard/broadcast?tab=video&updated=1`)
}

async function saveVideoProfileConfigAction(formData: FormData) {
  'use server'
  const profileId = (formData.get('profileId') as string) || ''
  if (!profileId) return
  const enabled = formData.get('enabled') === 'on'
  const videoId = formData.get('videoId') ? parseInt(formData.get('videoId') as string, 10) : null
  const repeatCount = parseInt((formData.get('repeatCount') as string) || '1', 10)

  await saveVideoBroadcastProfileConfig(profileId, {
    revision: 1,
    enabled,
    videoId,
    repeatCount: Math.max(1, Math.min(100, repeatCount)),
  })

  revalidatePath('/dashboard/broadcast')
  redirect(`/dashboard/broadcast?tab=video&editVideoProfile=${encodeURIComponent(profileId)}&saved=1`)
}

async function resetVideoProfileConfigAction(formData: FormData) {
  'use server'
  const profileId = (formData.get('profileId') as string) || ''
  if (!profileId) return
  await saveVideoBroadcastProfileConfig(profileId, FALLBACK_VIDEO_BROADCAST_CONFIG)
  revalidatePath('/dashboard/broadcast')
  redirect(`/dashboard/broadcast?tab=video&editVideoProfile=${encodeURIComponent(profileId)}&reset=1`)
}

async function deleteVideoProfileAction(formData: FormData) {
  'use server'
  const profileId = (formData.get('profileId') as string) || ''
  if (profileId) await deleteVideoBroadcastProfile(profileId)
  revalidatePath('/dashboard/broadcast')
  redirect('/dashboard/broadcast?tab=video&deleted=1')
}

async function setVideoGlobalAction(formData: FormData) {
  'use server'
  const profileId = (formData.get('profileId') as string) || ''
  if (profileId) await setVideoGlobalProfileId(profileId)
  revalidatePath('/dashboard/broadcast')
  redirect('/dashboard/broadcast?tab=video&globalSet=1')
}

async function assignVideoGroupAction(formData: FormData) {
  'use server'
  const profileId = (formData.get('profileId') as string) || ''
  const groupId = (formData.get('groupId') as string) || ''
  const action = (formData.get('action') as string) || 'assign'
  if (profileId && groupId) {
    await assignVideoBroadcastProfileToGroup(groupId, action === 'assign' ? profileId : null)
  }
  revalidatePath('/dashboard/broadcast')
  redirect(`/dashboard/broadcast?tab=video&assignVideoProfile=${encodeURIComponent(profileId)}&ok=1`)
}

async function assignVideoDeviceAction(formData: FormData) {
  'use server'
  const profileId = (formData.get('profileId') as string) || ''
  const deviceId = (formData.get('deviceId') as string) || ''
  const action = (formData.get('action') as string) || 'assign'
  if (profileId && deviceId) {
    await assignVideoBroadcastProfileToDevice(deviceId, action === 'assign' ? profileId : null)
  }
  revalidatePath('/dashboard/broadcast')
  redirect(`/dashboard/broadcast?tab=video&assignVideoProfile=${encodeURIComponent(profileId)}&ok=1`)
}

// ── Video Live Execution Actions ──────────────────────────────────────────────

async function playVideoBroadcastNowAction(formData: FormData) {
  'use server'
  const profileId = (formData.get('profileId') as string) || ''
  const videoId = formData.get('videoId') ? parseInt(formData.get('videoId') as string, 10) : null
  const repeatCount = parseInt((formData.get('repeatCount') as string) || '1', 10)
  
  if (!videoId) {
    redirect(`/dashboard/broadcast?tab=video&profileId=${profileId}&notice=broadcast-live`)
  }

  const video = await prisma.educationVideo.findUnique({ where: { id: videoId } })
  if (!video || !video.isPublished) {
    redirect(`/dashboard/broadcast?tab=video&profileId=${profileId}&notice=broadcast-live`)
  }

  const payload = {
    videoUrl: video.videoUrl,
    repeatCount: Math.max(1, Math.min(100, repeatCount)),
  }

  const liveTargetMode = (formData.get('liveTargetMode') as string) || 'global'
  const liveGroupId = (formData.get('liveGroupId') as string) || ''
  const liveDeviceId = (formData.get('liveDeviceId') as string) || ''
  const selectedDeviceIds = (formData.getAll('selectedDeviceIds') as string[])

  let recipients: string[] = []
  if (liveTargetMode === 'global') {
    const devices = await prisma.device.findMany({ where: { isActive: true }, select: { deviceId: true } })
    recipients = devices.map((d) => d.deviceId)
  } else if (liveTargetMode === 'group' && liveGroupId) {
    const assignments = await getDeviceGroupAssignments()
    const groupDeviceIds = Object.entries(assignments)
      .filter(([, gid]) => gid === liveGroupId)
      .map(([did]) => did)
    const devices = await prisma.device.findMany({
      where: { deviceId: { in: groupDeviceIds }, isActive: true },
      select: { deviceId: true },
    })
    recipients = devices.map((d) => d.deviceId)
  } else if (liveTargetMode === 'device' && liveDeviceId) {
    recipients = [liveDeviceId]
  } else if (liveTargetMode === 'selected' && selectedDeviceIds.length > 0) {
    recipients = selectedDeviceIds
  }

  for (const deviceId of recipients) {
    pushCommand(deviceId, 'PLAY_VIDEO_BROADCAST', JSON.stringify(payload))
  }

  revalidatePath('/dashboard/broadcast')
  redirect(`/dashboard/broadcast?tab=video&notice=broadcast-live`)
}

async function stopVideoBroadcastNowAction(formData: FormData) {
  'use server'
  const liveTargetMode = (formData.get('liveTargetMode') as string) || 'global'
  const liveGroupId = (formData.get('liveGroupId') as string) || ''
  const liveDeviceId = (formData.get('liveDeviceId') as string) || ''
  const selectedDeviceIds = (formData.getAll('selectedDeviceIds') as string[])

  let recipients: string[] = []
  if (liveTargetMode === 'global') {
    const devices = await prisma.device.findMany({ where: { isActive: true }, select: { deviceId: true } })
    recipients = devices.map((d) => d.deviceId)
  } else if (liveTargetMode === 'group' && liveGroupId) {
    const assignments = await getDeviceGroupAssignments()
    const groupDeviceIds = Object.entries(assignments)
      .filter(([, gid]) => gid === liveGroupId)
      .map(([did]) => did)
    const devices = await prisma.device.findMany({
      where: { deviceId: { in: groupDeviceIds }, isActive: true },
      select: { deviceId: true },
    })
    recipients = devices.map((d) => d.deviceId)
  } else if (liveTargetMode === 'device' && liveDeviceId) {
    recipients = [liveDeviceId]
  } else if (liveTargetMode === 'selected' && selectedDeviceIds.length > 0) {
    recipients = selectedDeviceIds
  }

  for (const deviceId of recipients) {
    pushCommand(deviceId, 'STOP_VIDEO_BROADCAST')
  }

  revalidatePath('/dashboard/broadcast')
  redirect(`/dashboard/broadcast?tab=video&notice=broadcast-live`)
}


// ── 📢 Running Text Profile Server Actions ────────────────────────────────────

async function createRunningProfileAction(formData: FormData) {
  'use server'
  const name = (formData.get('profileName') as string) || ''
  const description = (formData.get('profileDescription') as string) || ''
  const profile = await createRunningTextProfile({ name, description })
  revalidatePath('/dashboard/broadcast')
  redirect(`/dashboard/broadcast?tab=ticker&editRunningProfile=${encodeURIComponent(profile.id)}&created=1`)
}

async function updateRunningProfileMetaAction(formData: FormData) {
  'use server'
  const profileId = (formData.get('profileId') as string) || ''
  const name = (formData.get('profileName') as string) || ''
  const description = (formData.get('profileDescription') as string) || ''
  if (profileId) await updateRunningTextProfileMeta(profileId, { name, description })
  revalidatePath('/dashboard/broadcast')
  redirect(`/dashboard/broadcast?tab=ticker&updated=1`)
}

async function saveRunningProfileConfigAction(formData: FormData) {
  'use server'
  const profileId = (formData.get('profileId') as string) || ''
  if (!profileId) return
  const items: HomeExperienceRunningTextItem[] = parseRunningTextItems(formData)
  const enabled = formData.get('rtEnabled') === 'on'
  const visibleCount = parseInt((formData.get('rtVisibleCount') as string) || '1', 10)
  const rotationSeconds = parseInt((formData.get('rtRotationSeconds') as string) || '10', 10)
  const displaySeconds = parseInt((formData.get('rtDisplaySeconds') as string) || '10', 10)

  await saveRunningTextProfileConfig(profileId, {
    enabled,
    visibleCount: Math.max(1, Math.min(10, visibleCount)),
    rotationSeconds: Math.max(1, Math.min(600, rotationSeconds)),
    displaySeconds: Math.max(1, Math.min(600, displaySeconds)),
    items,
  })

  revalidatePath('/dashboard/broadcast')
  redirect(`/dashboard/broadcast?tab=ticker&editRunningProfile=${encodeURIComponent(profileId)}&saved=1`)
}

async function deleteRunningProfileAction(formData: FormData) {
  'use server'
  const profileId = (formData.get('profileId') as string) || ''
  if (profileId) await deleteRunningTextProfile(profileId)
  revalidatePath('/dashboard/broadcast')
  redirect('/dashboard/broadcast?tab=ticker&deleted=1')
}

async function setRunningGlobalAction(formData: FormData) {
  'use server'
  const profileId = (formData.get('profileId') as string) || ''
  if (profileId) await setRunningGlobalProfileId(profileId)
  revalidatePath('/dashboard/broadcast')
  redirect('/dashboard/broadcast?tab=ticker&globalSet=1')
}

async function assignRunningGroupAction(formData: FormData) {
  'use server'
  const profileId = (formData.get('profileId') as string) || ''
  const groupId = (formData.get('groupId') as string) || ''
  const action = (formData.get('action') as string) || 'assign'
  if (profileId && groupId) {
    await assignRunningTextProfileToGroup(groupId, action === 'assign' ? profileId : null)
  }
  revalidatePath('/dashboard/broadcast')
  redirect(`/dashboard/broadcast?tab=ticker&assignRunningProfile=${encodeURIComponent(profileId)}&ok=1`)
}

async function assignRunningDeviceAction(formData: FormData) {
  'use server'
  const profileId = (formData.get('profileId') as string) || ''
  const deviceId = (formData.get('deviceId') as string) || ''
  const action = (formData.get('action') as string) || 'assign'
  if (profileId && deviceId) {
    await assignRunningTextProfileToDevice(deviceId, action === 'assign' ? profileId : null)
  }
  revalidatePath('/dashboard/broadcast')
  redirect(`/dashboard/broadcast?tab=ticker&assignRunningProfile=${encodeURIComponent(profileId)}&ok=1`)
}

// ── Running Text Live Execution Action ────────────────────────────────────────

async function pushRunningTextLiveAction(formData: FormData) {
  'use server'
  const items: HomeExperienceRunningTextItem[] = parseRunningTextItems(formData)
  const enabled = formData.get('rtEnabled') === 'on'
  const visibleCount = parseInt((formData.get('rtVisibleCount') as string) || '1', 10)
  const targetMode = (formData.get('rtLiveTarget') as string) || 'global'
  const targetGroupId = (formData.get('rtLiveGroupId') as string) || ''
  const targetDeviceId = (formData.get('rtLiveDeviceId') as string) || ''
  const selectedDeviceIds = (formData.getAll('rtSelectedDeviceIds') as string[])

  const payload = JSON.stringify({ enabled, items, visibleCount })

  let recipients: string[] = []
  if (targetMode === 'global') {
    const devices = await prisma.device.findMany({ where: { isActive: true }, select: { deviceId: true } })
    recipients = devices.map((d) => d.deviceId)
  } else if (targetMode === 'group' && targetGroupId) {
    const assignments = await getDeviceGroupAssignments()
    const groupDeviceIds = Object.entries(assignments)
      .filter(([, gid]) => gid === targetGroupId)
      .map(([did]) => did)
    const devices = await prisma.device.findMany({
      where: { deviceId: { in: groupDeviceIds }, isActive: true },
      select: { deviceId: true },
    })
    recipients = devices.map((d) => d.deviceId)
  } else if (targetMode === 'device' && targetDeviceId) {
    recipients = [targetDeviceId]
  } else if (targetMode === 'selected' && selectedDeviceIds.length > 0) {
    recipients = selectedDeviceIds
  }

  for (const deviceId of recipients) {
    pushCommand(deviceId, 'UPDATE_RUNNING_TEXT', payload)
  }

  revalidatePath('/dashboard/broadcast')
  redirect(`/dashboard/broadcast?tab=ticker&pushed=1`)
}

// ── Page Component ────────────────────────────────────────────────────────────

export default async function BroadcastPage({
  searchParams,
}: {
  searchParams: Promise<{
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
    ok?: string
    notice?: string
    pushed?: string
  }>
}) {
  const sp = await searchParams
  const activeTab = sp.tab === 'ticker' ? 'ticker' : 'video'
  const hasNotif = sp.created || sp.saved || sp.reset || sp.updated || sp.deleted || sp.globalSet || sp.ok || sp.notice || sp.pushed

  // Load common data
  const [groups, groupAssignments, devices, broadcastVideos] = await Promise.all([
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
  ])

  const deviceOptions = devices.map((d) => ({
    deviceId: d.deviceId,
    deviceName: d.deviceName,
    isActive: d.isActive,
    groupName: groups.find((g) => g.id === (groupAssignments[d.deviceId] || ''))?.name || null,
  }))

  // ── Tab 1: Video Broadcast ──────────────────────────────────────────────────
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

      let videoTitle = ''
      let videoUrl = ''
      let thumbnailUrl = ''
      if (rawConfig.videoId) {
        const video = await prisma.educationVideo.findUnique({ where: { id: rawConfig.videoId }, include: { folder: true } })
        if (video && video.isPublished && (!video.folder || video.folder.isPublished)) {
          videoTitle = video.title
          videoUrl = video.videoUrl
          thumbnailUrl = video.thumbnailUrl || ''
        }
      }

      const resolvedConfig = {
        ...rawConfig,
        videoTitle,
        videoUrl,
        thumbnailUrl,
        scopeApplied: (globalVideoProfileId === profile.id ? 'global' : 'fallback') as any,
      }

      return (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center gap-3">
            <a
              href="/dashboard/broadcast?tab=video"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Kembali ke Daftar Profile Video
            </a>
            <span className="text-border">/</span>
            <span className="text-xs text-foreground font-semibold">Edit Config: {profile.name}</span>
          </div>

          {(sp.saved || sp.reset || sp.notice) && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold animate-fade-in">
              {sp.saved && 'Konfigurasi Video Broadcast berhasil disimpan.'}
              {sp.reset && 'Konfigurasi Video Broadcast berhasil di-reset.'}
              {sp.notice === 'broadcast-live' && 'Command live trigger berhasil dikirim.'}
            </div>
          )}

          <div className="card rounded-2xl p-5 border border-border bg-card">
            <VideoBroadcastManager
              profileId={profile.id}
              profileName={profile.name}
              config={resolvedConfig}
              surface="plain"
              videos={broadcastVideos.map((v) => ({
                id: v.id,
                title: v.title,
                folderName: v.folder?.name || null,
                isPublished: v.isPublished,
              }))}
              groups={groups}
              devices={deviceOptions}
              onSaveAction={saveVideoProfileConfigAction}
              onResetAction={resetVideoProfileConfigAction}
              onPlayNowAction={playVideoBroadcastNowAction}
              onStopNowAction={stopVideoBroadcastNowAction}
            />
          </div>
        </div>
      )
    }

    // Mode: Assign Profile
    if (sp.assignVideoProfile) {
      const profile = videoProfiles.find((p) => p.id === sp.assignVideoProfile)
      if (!profile) redirect('/dashboard/broadcast?tab=video')

      const assignedGroupIds = new Set(Object.entries(groupVideoProfileMap).filter(([, pid]) => pid === profile.id).map(([gid]) => gid))
      const assignedDeviceIds = new Set(Object.entries(deviceVideoProfileMap).filter(([, pid]) => pid === profile.id).map(([did]) => did))

      return (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center gap-3">
            <a
              href="/dashboard/broadcast?tab=video"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Kembali ke Daftar Profile Video
            </a>
            <span className="text-border">/</span>
            <span className="text-xs text-foreground font-semibold">Assign Profile Video: {profile.name}</span>
          </div>

          {sp.ok && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              Assignment berhasil diperbarui.
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="card rounded-2xl overflow-hidden border border-border bg-card">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">Group Level (Video)</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Device dalam grup terhubung akan memutar video broadcast ini.</p>
              </div>
              <div className="divide-y divide-border/50">
                {groups.length === 0 ? (
                  <div className="px-5 py-6 text-center text-xs text-muted-foreground">Belum ada grup.</div>
                ) : (
                  groups.map((group) => {
                    const isAssigned = assignedGroupIds.has(group.id)
                    const curPid = groupVideoProfileMap[group.id]
                    const curProfile = curPid && curPid !== profile.id ? videoProfiles.find((p) => p.id === curPid) : null
                    return (
                      <div key={group.id} className="flex items-center justify-between gap-3 px-5 py-3 text-xs">
                        <span className="font-semibold text-foreground">{group.name} {curProfile && `(aktif: ${curProfile.name})`}</span>
                        <form action={assignVideoGroupAction}>
                          <input type="hidden" name="profileId" value={profile.id} />
                          <input type="hidden" name="groupId" value={group.id} />
                          <input type="hidden" name="action" value={isAssigned ? 'remove' : 'assign'} />
                          <button type="submit" className={`btn btn-xs ${isAssigned ? 'btn-danger' : 'btn-primary'}`}>
                            {isAssigned ? 'Remove' : 'Assign'}
                          </button>
                        </form>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            <div className="card rounded-2xl overflow-hidden border border-border bg-card">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">Device Level Override (Video)</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Override khusus per device, melompati aturan grup.</p>
              </div>
              <div className="divide-y divide-border/50 max-h-96 overflow-y-auto">
                {devices.map((device) => {
                  const isAssigned = assignedDeviceIds.has(device.deviceId)
                  const curPid = deviceVideoProfileMap[device.deviceId]
                  const curProfile = curPid && curPid !== profile.id ? videoProfiles.find((p) => p.id === curPid) : null
                  return (
                    <div key={device.deviceId} className="flex items-center justify-between gap-3 px-5 py-3 text-xs">
                      <span className="font-semibold text-foreground">{device.deviceName} {curProfile && `(aktif: ${curProfile.name})`}</span>
                      <form action={assignVideoDeviceAction}>
                        <input type="hidden" name="profileId" value={profile.id} />
                        <input type="hidden" name="deviceId" value={device.deviceId} />
                        <input type="hidden" name="action" value={isAssigned ? 'remove' : 'assign'} />
                        <button type="submit" className={`btn btn-xs ${isAssigned ? 'btn-danger' : 'btn-primary'}`}>
                          {isAssigned ? 'Remove' : 'Assign'}
                        </button>
                      </form>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )
    }

    // Default: Video Profile List
    return (
      <div className="space-y-6">
        <TabsNavigation activeTab={activeTab} />

        {hasNotif && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold animate-fade-in">
            {sp.created && 'Video Broadcast Profile baru berhasil dibuat.'}
            {sp.deleted && 'Profile berhasil dihapus.'}
            {sp.globalSet && 'Global Video profile berhasil diperbarui.'}
            {sp.notice === 'broadcast-live' && 'Perintah live trigger berhasil dikirim.'}
          </div>
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
                return (
                  <ProfileCardItem
                    key={p.id}
                    profile={p}
                    isGlobal={isGlobal}
                    editHref={`/dashboard/broadcast?tab=video&editVideoProfile=${p.id}`}
                    assignHref={`/dashboard/broadcast?tab=video&assignVideoProfile=${p.id}`}
                    deleteAction={deleteVideoProfileAction}
                    setGlobalAction={setVideoGlobalAction}
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

      return (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center gap-3">
            <a
              href="/dashboard/broadcast?tab=ticker"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Kembali ke Daftar Profile Running Text
            </a>
            <span className="text-border">/</span>
            <span className="text-xs text-foreground font-semibold">Edit Config: {profile.name}</span>
          </div>

          {(sp.saved || sp.pushed) && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold animate-fade-in">
              {sp.saved && 'Konfigurasi Running Text berhasil disimpan ke profile.'}
              {sp.pushed && 'Konfigurasi Running Text berhasil dikirim live ke device.'}
            </div>
          )}

          <RunningTextPanelClient
            profileId={profile.id}
            profileName={profile.name}
            runningText={rawConfig}
            groups={groups}
            devices={deviceOptions}
            saveAction={saveRunningProfileConfigAction}
            pushLiveAction={pushRunningTextLiveAction}
          />
        </div>
      )
    }

    // Mode: Assign Profile
    if (sp.assignRunningProfile) {
      const profile = runningProfiles.find((p) => p.id === sp.assignRunningProfile)
      if (!profile) redirect('/dashboard/broadcast?tab=ticker')

      const assignedGroupIds = new Set(Object.entries(groupRunningProfileMap).filter(([, pid]) => pid === profile.id).map(([gid]) => gid))
      const assignedDeviceIds = new Set(Object.entries(deviceRunningProfileMap).filter(([, pid]) => pid === profile.id).map(([did]) => did))

      return (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center gap-3">
            <a
              href="/dashboard/broadcast?tab=ticker"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Kembali ke Daftar Profile Running Text
            </a>
            <span className="text-border">/</span>
            <span className="text-xs text-foreground font-semibold">Assign Profile Running Text: {profile.name}</span>
          </div>

          {sp.ok && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              Assignment berhasil diperbarui.
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="card rounded-2xl overflow-hidden border border-border bg-card">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">Group Level (Ticker)</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Device dalam grup terhubung akan mendapatkan running text profile ini.</p>
              </div>
              <div className="divide-y divide-border/50">
                {groups.length === 0 ? (
                  <div className="px-5 py-6 text-center text-xs text-muted-foreground">Belum ada grup.</div>
                ) : (
                  groups.map((group) => {
                    const isAssigned = assignedGroupIds.has(group.id)
                    const curPid = groupRunningProfileMap[group.id]
                    const curProfile = curPid && curPid !== profile.id ? runningProfiles.find((p) => p.id === curPid) : null
                    return (
                      <div key={group.id} className="flex items-center justify-between gap-3 px-5 py-3 text-xs">
                        <span className="font-semibold text-foreground">{group.name} {curProfile && `(aktif: ${curProfile.name})`}</span>
                        <form action={assignRunningGroupAction}>
                          <input type="hidden" name="profileId" value={profile.id} />
                          <input type="hidden" name="groupId" value={group.id} />
                          <input type="hidden" name="action" value={isAssigned ? 'remove' : 'assign'} />
                          <button type="submit" className={`btn btn-xs ${isAssigned ? 'btn-danger' : 'btn-primary'}`}>
                            {isAssigned ? 'Remove' : 'Assign'}
                          </button>
                        </form>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            <div className="card rounded-2xl overflow-hidden border border-border bg-card">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">Device Level Override (Ticker)</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Override khusus per device, melompati aturan grup.</p>
              </div>
              <div className="divide-y divide-border/50 max-h-96 overflow-y-auto">
                {devices.map((device) => {
                  const isAssigned = assignedDeviceIds.has(device.deviceId)
                  const curPid = deviceRunningProfileMap[device.deviceId]
                  const curProfile = curPid && curPid !== profile.id ? runningProfiles.find((p) => p.id === curPid) : null
                  return (
                    <div key={device.deviceId} className="flex items-center justify-between gap-3 px-5 py-3 text-xs">
                      <span className="font-semibold text-foreground">{device.deviceName} {curProfile && `(aktif: ${curProfile.name})`}</span>
                      <form action={assignRunningDeviceAction}>
                        <input type="hidden" name="profileId" value={profile.id} />
                        <input type="hidden" name="deviceId" value={device.deviceId} />
                        <input type="hidden" name="action" value={isAssigned ? 'remove' : 'assign'} />
                        <button type="submit" className={`btn btn-xs ${isAssigned ? 'btn-danger' : 'btn-primary'}`}>
                          {isAssigned ? 'Remove' : 'Assign'}
                        </button>
                      </form>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )
    }

    // Default: Running Profile List
    return (
      <div className="space-y-6">
        <TabsNavigation activeTab={activeTab} />

        {hasNotif && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold animate-fade-in">
            {sp.created && 'Running Text Profile baru berhasil dibuat.'}
            {sp.deleted && 'Profile berhasil dihapus.'}
            {sp.globalSet && 'Global Running Text profile berhasil diperbarui.'}
          </div>
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
                return (
                  <ProfileCardItem
                    key={p.id}
                    profile={p}
                    isGlobal={isGlobal}
                    editHref={`/dashboard/broadcast?tab=ticker&editRunningProfile=${p.id}`}
                    assignHref={`/dashboard/broadcast?tab=ticker&assignRunningProfile=${p.id}`}
                    deleteAction={deleteRunningProfileAction}
                    setGlobalAction={setRunningGlobalAction}
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

// ── Shared Subcomponents ──────────────────────────────────────────────────────

function TabsNavigation({ activeTab }: { activeTab: string }) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Broadcast"
        description="Buat profile siaran Video Broadcast dan Running Text Ticker secara mandiri, lalu tautkan ke masing-masing group atau device."
        badge="DSA & GPMC Mode"
      />
      <div className="flex items-center gap-1 p-1 rounded-xl bg-accent/30 border border-border w-fit">
        <a
          href="/dashboard/broadcast?tab=video"
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'video'
              ? 'bg-primary/15 text-primary border border-primary/20'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          📹 Video Broadcast Profiles
        </a>
        <a
          href="/dashboard/broadcast?tab=ticker"
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'ticker'
              ? 'bg-primary/15 text-primary border border-primary/20'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          📢 Running Text Profiles
        </a>
      </div>
    </div>
  )
}

function ProfileCardItem({
  profile,
  isGlobal,
  editHref,
  assignHref,
  deleteAction,
  setGlobalAction,
}: {
  profile: { id: string; name: string; description?: string }
  isGlobal: boolean
  editHref: string
  assignHref: string
  deleteAction: (fd: FormData) => Promise<void>
  setGlobalAction: (fd: FormData) => Promise<void>
}) {
  return (
    <div className={`card rounded-2xl overflow-hidden border border-border bg-card p-4 flex items-center justify-between gap-3 transition-all ${
      isGlobal ? 'ring-2 ring-primary/30' : ''
    }`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm ${
          isGlobal ? 'bg-primary/15 border border-primary/20 text-primary' : 'bg-accent/30 border border-border text-muted-foreground'
        }`}>
          {isGlobal ? '🌐' : '📋'}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground truncate">{profile.name}</span>
            {isGlobal && <span className="badge badge-primary text-[9px]">Global Base</span>}
          </div>
          {profile.description && (
            <p className="text-[10px] text-muted-foreground truncate mt-0.5">{profile.description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <a href={assignHref} className="btn btn-xs border border-border text-muted-foreground hover:text-foreground hover:bg-accent/50">
          Assign
        </a>
        <a href={editHref} className="btn btn-xs border border-primary/20 text-primary hover:bg-primary/10">
          Edit Config
        </a>
        <ConfirmForm action={deleteAction} message={`Hapus profile "${profile.name}"? Semua mapping yang menggunakan profile ini akan dibersihkan.`}>
          <input type="hidden" name="profileId" value={profile.id} />
          <button type="submit" className="p-1.5 text-rose-450 hover:text-rose-350 border border-rose-500/10 hover:bg-rose-500/10 rounded-lg transition-all">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
        </ConfirmForm>

        {!isGlobal && (
          <form action={setGlobalAction}>
            <input type="hidden" name="profileId" value={profile.id} />
            <button type="submit" className="btn btn-xs border border-border text-muted-foreground hover:text-foreground">
              Set Global
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

function parseRunningTextItems(formData: FormData): HomeExperienceRunningTextItem[] {
  const raw = formData.get('rtItemsJson')
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    } catch { /* ignore */ }
  }
  return []
}
