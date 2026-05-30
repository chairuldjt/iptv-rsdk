'use server'

import { redirect, RedirectType } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import prisma from '@/lib/db'
import {
  FALLBACK_VIDEO_BROADCAST_CONFIG,
  createVideoBroadcastProfile,
  updateVideoBroadcastProfileMeta,
  saveVideoBroadcastProfileConfig,
  deleteVideoBroadcastProfile,
  setVideoGlobalProfileId,
  assignVideoBroadcastProfileToGroup,
  assignVideoBroadcastProfileToDevice,
  cloneVideoBroadcastProfile,
  exportVideoBroadcastProfile,
  importVideoBroadcastProfile,
  toggleVideoBroadcastProfileLock,
  toggleVideoBroadcastProfileEnabled,
  renameVideoBroadcastProfile,
  unsetVideoGlobalProfile,
  type VideoBroadcastProfileExport,
} from '@/lib/videoBroadcast'
import { pushCommand } from '@/lib/remoteQueue'
import { resolveProfileRecipientDevices } from '../_lib/resolveRecipients'

type ParsedVideoItem = {
  videoId: number
  repeatCount: number
}

type OverlayTextItem = {
  id: string
  text: string
  enabled: boolean
}

function parseVideoItems(formData: FormData): ParsedVideoItem[] {
  const itemsJson = (formData.get('videoItemsJson') as string) || '[]'
  let items: ParsedVideoItem[] = []
  try {
    const parsed = JSON.parse(itemsJson)
    items = Array.isArray(parsed) ? parsed : []
  } catch {
    items = []
  }

  if (items.length > 0) {
    return items
      .map((item) => ({
        videoId: Number.parseInt(String(item?.videoId ?? ''), 10),
        repeatCount: Math.max(1, Math.min(100, Number.parseInt(String(item?.repeatCount ?? '1'), 10) || 1)),
      }))
      .filter((item) => Number.isFinite(item.videoId) && item.videoId > 0)
  }

  const videoId = formData.get('videoId') ? parseInt(formData.get('videoId') as string, 10) : null
  const repeatCount = parseInt((formData.get('repeatCount') as string) || '1', 10)
  if (videoId) {
    return [{ videoId, repeatCount: Math.max(1, Math.min(100, repeatCount)) }]
  }

  return []
}

function parseOverlayItems(formData: FormData): { enabled: boolean; items: OverlayTextItem[]; speed: number } {
  const overlayEnabled = (formData.get('overlayEnabled') as string) === 'on'
  const speed = Math.max(1, Math.min(600, parseInt((formData.get('overlaySpeed') as string) || '20', 10)))
  const raw = formData.get('overlayItemsJson')
  let items: OverlayTextItem[] = []
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) items = parsed
    } catch { /* ignore */ }
  }
  return { enabled: overlayEnabled, items, speed }
}

function redirectToVideoProfile(profileId: string, params: Record<string, string | number | null | undefined>) {
  const searchParams = new URLSearchParams({ tab: 'video' })
  if (profileId) {
    searchParams.set('editVideoProfile', profileId)
  }

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      searchParams.set(key, String(value))
    }
  }

  redirect(`/dashboard/broadcast?${searchParams.toString()}`, RedirectType.replace)
}

// ── Profile CRUD ──────────────────────────────────────────────────────────────

export async function createVideoProfileAction(formData: FormData) {
  const name = (formData.get('profileName') as string) || ''
  const description = (formData.get('profileDescription') as string) || ''
  const profile = await createVideoBroadcastProfile({ name, description })
  revalidatePath('/dashboard/broadcast')
  redirect(`/dashboard/broadcast?tab=video&editVideoProfile=${encodeURIComponent(profile.id)}&created=1`)
}

export async function updateVideoProfileMetaAction(formData: FormData) {
  const profileId = (formData.get('profileId') as string) || ''
  const name = (formData.get('profileName') as string) || ''
  const description = (formData.get('profileDescription') as string) || ''
  if (profileId) await updateVideoBroadcastProfileMeta(profileId, { name, description })
  revalidatePath('/dashboard/broadcast')
  redirect(`/dashboard/broadcast?tab=video&updated=1`)
}

export async function saveVideoProfileConfigAction(formData: FormData) {
  const profileId = (formData.get('profileId') as string) || ''
  if (!profileId) return

  const items = parseVideoItems(formData)
  const overlay = parseOverlayItems(formData)

  const firstItem = items[0] || null

  await saveVideoBroadcastProfileConfig(profileId, {
    revision: 1,
    enabled: items.length > 0,
    videoId: firstItem ? firstItem.videoId : null,
    repeatCount: firstItem ? firstItem.repeatCount : 1,
    items,
    runningText: {
      enabled: overlay.enabled,
      items: overlay.items,
      speed: overlay.speed,
    },
  })

  revalidatePath('/dashboard/broadcast')
  redirect(`/dashboard/broadcast?tab=video&editVideoProfile=${encodeURIComponent(profileId)}&saved=1`, RedirectType.replace)
}


export async function resetVideoProfileConfigAction(formData: FormData) {
  const profileId = (formData.get('profileId') as string) || ''
  if (!profileId) return
  await saveVideoBroadcastProfileConfig(profileId, FALLBACK_VIDEO_BROADCAST_CONFIG)
  revalidatePath('/dashboard/broadcast')
  redirect(`/dashboard/broadcast?tab=video&editVideoProfile=${encodeURIComponent(profileId)}&reset=1`, RedirectType.replace)
}

export async function deleteVideoProfileAction(formData: FormData) {
  const profileId = (formData.get('profileId') as string) || ''
  if (profileId) await deleteVideoBroadcastProfile(profileId)
  revalidatePath('/dashboard/broadcast')
  redirect('/dashboard/broadcast?tab=video&deleted=1')
}

export async function cloneVideoProfileAction(formData: FormData) {
  'use server'
  const profileId = (formData.get('profileId') as string) || ''
  if (!profileId) return
  const cloned = await cloneVideoBroadcastProfile(profileId)
  if (cloned) {
    revalidatePath('/dashboard/broadcast')
    redirect(`/dashboard/broadcast?tab=video&cloned=1`)
  }
}

export async function renameVideoProfileAction(formData: FormData) {
  'use server'
  const profileId = (formData.get('profileId') as string) || ''
  const newName = (formData.get('profileName') as string) || ''
  if (profileId && newName) {
    await renameVideoBroadcastProfile(profileId, newName)
  }
  revalidatePath('/dashboard/broadcast')
  redirect(`/dashboard/broadcast?tab=video&updated=1`)
}

export async function exportVideoProfileAction(formData: FormData) {
  'use server'
  const profileId = (formData.get('profileId') as string) || ''
  if (!profileId) return

  const exportData = await exportVideoBroadcastProfile(profileId)
  if (!exportData) return

  const json = JSON.stringify(exportData, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  redirect(url)
}

export async function importVideoProfileAction(formData: FormData) {
  'use server'
  const jsonData = (formData.get('importData') as string) || ''
  if (!jsonData) {
    redirect('/dashboard/broadcast?tab=video&importError=No+data+provided')
    return
  }

  try {
    const data = JSON.parse(jsonData) as VideoBroadcastProfileExport
    const imported = await importVideoBroadcastProfile(data)
    if (imported) {
      revalidatePath('/dashboard/broadcast')
      redirect(`/dashboard/broadcast?tab=video&imported=1`)
    } else {
      redirect('/dashboard/broadcast?tab=video&importError=Invalid+profile+data')
    }
  } catch {
    redirect('/dashboard/broadcast?tab=video&importError=Invalid+JSON+format')
  }
}

export async function toggleVideoLockAction(formData: FormData) {
  'use server'
  const profileId = (formData.get('profileId') as string) || ''
  if (profileId) await toggleVideoBroadcastProfileLock(profileId)
  revalidatePath('/dashboard/broadcast')
  redirect('/dashboard/broadcast?tab=video&locked=1')
}

export async function toggleVideoEnabledAction(formData: FormData) {
  'use server'
  const profileId = (formData.get('profileId') as string) || ''
  if (profileId) await toggleVideoBroadcastProfileEnabled(profileId)
  revalidatePath('/dashboard/broadcast')
  redirect('/dashboard/broadcast?tab=video&enabledToggled=1')
}

// ── Global & Assignment ───────────────────────────────────────────────────────

export async function setVideoGlobalAction(formData: FormData) {
  const profileId = (formData.get('profileId') as string) || ''
  if (profileId) await setVideoGlobalProfileId(profileId)
  revalidatePath('/dashboard/broadcast')
  redirect('/dashboard/broadcast?tab=video&globalSet=1')
}

export async function unsetVideoGlobalAction() {
  'use server'
  await unsetVideoGlobalProfile()
  revalidatePath('/dashboard/broadcast')
  redirect('/dashboard/broadcast?tab=video&globalUnset=1')
}

export async function assignVideoGroupAction(formData: FormData) {
  const profileId = (formData.get('profileId') as string) || ''
  const groupId = (formData.get('groupId') as string) || ''
  const action = (formData.get('action') as string) || 'assign'
  if (profileId && groupId) {
    await assignVideoBroadcastProfileToGroup(groupId, action === 'assign' ? profileId : null)
  }
  revalidatePath('/dashboard/broadcast')
  redirect(`/dashboard/broadcast?tab=video&assignVideoProfile=${encodeURIComponent(profileId)}&ok=1`)
}

export async function assignVideoDeviceAction(formData: FormData) {
  const profileId = (formData.get('profileId') as string) || ''
  const deviceId = (formData.get('deviceId') as string) || ''
  const action = (formData.get('action') as string) || 'assign'
  if (profileId && deviceId) {
    await assignVideoBroadcastProfileToDevice(deviceId, action === 'assign' ? profileId : null)
  }
  revalidatePath('/dashboard/broadcast')
  redirect(`/dashboard/broadcast?tab=video&assignVideoProfile=${encodeURIComponent(profileId)}&ok=1`)
}

// ── Modal-compatible Assignment (no redirect) ────────────────────────────────

export async function assignVideoGroupModalAction(profileId: string, groupId: string, assign: boolean): Promise<{ success: boolean }> {
  'use server'
  try {
    await assignVideoBroadcastProfileToGroup(groupId, assign ? profileId : null)
    revalidatePath('/dashboard/broadcast')
    return { success: true }
  } catch {
    return { success: false }
  }
}

export async function assignVideoDeviceModalAction(profileId: string, deviceId: string, assign: boolean): Promise<{ success: boolean }> {
  'use server'
  try {
    await assignVideoBroadcastProfileToDevice(deviceId, assign ? profileId : null)
    revalidatePath('/dashboard/broadcast')
    return { success: true }
  } catch {
    return { success: false }
  }
}

// ── Live Execution ────────────────────────────────────────────────────────────

export async function playVideoBroadcastNowAction(formData: FormData) {
  const profileId = (formData.get('profileId') as string) || ''
  const items = parseVideoItems(formData)
  const overlay = parseOverlayItems(formData)

  if (items.length === 0) {
    redirectToVideoProfile(profileId, {
      error: 'Playlist video masih kosong. Tambahkan minimal satu video sebelum broadcast live.',
    })
  }

  const videoIds = items.map((item) => item.videoId)
  const videos = await prisma.educationVideo.findMany({
    where: { id: { in: videoIds } },
    include: { folder: true },
  })
  const videoMap = new Map(videos.map((v) => [v.id, v]))

  const resolvedVideos = items
    .map((item) => {
      const v = videoMap.get(item.videoId)
      const isPlayable = Boolean(v && v.isPublished && (!v.folder || v.folder.isPublished))
      if (isPlayable && v) {
        return {
          title: v.title,
          url: v.videoUrl,
          thumbnailUrl: v.thumbnailUrl || '',
          repeatCount: item.repeatCount,
        }
      }
      return null
    })
    .filter((v): v is { title: string; url: string; thumbnailUrl: string; repeatCount: number } => v !== null)

  if (resolvedVideos.length === 0) {
    redirectToVideoProfile(profileId, {
      error: 'Tidak ada video playable. Pastikan video dan foldernya masih dipublish.',
    })
  }

  const firstVideo = resolvedVideos[0]

  // Build active overlay text items
  const activeOverlayItems = overlay.enabled
    ? overlay.items.filter((i) => i.enabled && i.text.trim().length > 0)
    : []

  const payload = {
    enabled: true,
    videoTitle: firstVideo.title,
    videoUrl: firstVideo.url,
    thumbnailUrl: firstVideo.thumbnailUrl,
    repeatCount: firstVideo.repeatCount,
    videos: resolvedVideos,
    runningText: overlay.enabled && activeOverlayItems.length > 0
      ? {
          enabled: true,
          items: activeOverlayItems,
          speed: overlay.speed,
        }
      : { enabled: false, items: [], speed: 20 },
  }

  const recipients = await resolveProfileRecipientDevices(profileId, 'video')
  if (recipients.length === 0) {
    redirectToVideoProfile(profileId, {
      error: 'Tidak ada device aktif yang menjadi target profile ini.',
    })
  }

  for (const deviceId of recipients) {
    pushCommand(deviceId, 'PLAY_VIDEO_BROADCAST', JSON.stringify(payload))
  }

  revalidatePath('/dashboard/broadcast')
  redirectToVideoProfile(profileId, {
    notice: 'broadcast-live-played',
    count: recipients.length,
    skipped: items.length - resolvedVideos.length,
  })
}

export async function stopVideoBroadcastNowAction(formData: FormData) {
  const profileId = (formData.get('profileId') as string) || ''

  const recipients = await resolveProfileRecipientDevices(profileId, 'video')
  if (recipients.length === 0) {
    redirectToVideoProfile(profileId, {
      error: 'Tidak ada device aktif yang bisa dikirimi perintah stop.',
    })
  }

  for (const deviceId of recipients) {
    pushCommand(deviceId, 'STOP_VIDEO_BROADCAST')
    // Also clear any running text overlay that was sent alongside the broadcast
    pushCommand(deviceId, 'UPDATE_RUNNING_TEXT', JSON.stringify({
      enabled: false,
      items: [],
      visibleCount: 1,
      rotationSeconds: 10,
      displaySeconds: 0,
    }))
  }

  revalidatePath('/dashboard/broadcast')
  redirectToVideoProfile(profileId, {
    notice: 'broadcast-live-stopped',
    count: recipients.length,
  })
}
