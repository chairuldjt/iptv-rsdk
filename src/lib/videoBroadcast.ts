import prisma from '@/lib/db'
import { getDeviceGroupForDevice } from '@/lib/deviceGroups'

export type VideoBroadcastProfile = {
  id: string
  name: string
  description: string
  createdAt: string
}

export type VideoBroadcastScope = 'global' | 'group' | 'device'

export type VideoBroadcastItem = {
  videoId: number
  repeatCount: number
}

export type VideoBroadcastConfig = {
  revision: number
  enabled: boolean
  videoId: number | null
  repeatCount: number
  items: VideoBroadcastItem[]
}

export type ResolvedVideoBroadcastItem = {
  title: string
  url: string
  thumbnailUrl: string
  repeatCount: number
}

export type ResolvedVideoBroadcastConfig = VideoBroadcastConfig & {
  videoTitle: string
  videoUrl: string
  thumbnailUrl: string
  scopeApplied: 'global' | 'group' | 'device' | 'fallback'
  videos: ResolvedVideoBroadcastItem[]
}

export const FALLBACK_VIDEO_BROADCAST_CONFIG: VideoBroadcastConfig = {
  revision: 1,
  enabled: false,
  videoId: null,
  repeatCount: 1,
  items: [],
}

const VIDEO_PROFILES_META_KEY = 'videoBroadcast.profiles'
const VIDEO_GLOBAL_PROFILE_ID_KEY = 'videoBroadcast.globalProfileId'
const VIDEO_GROUP_PROFILE_MAP_KEY = 'videoBroadcast.groupProfileMap'
const VIDEO_DEVICE_PROFILE_MAP_KEY = 'videoBroadcast.deviceProfileMap'

function videoProfileDataKey(profileId: string): string {
  return `videoBroadcast.profile.${profileId}`
}

export async function getVideoBroadcastProfiles(): Promise<VideoBroadcastProfile[]> {
  const setting = await prisma.appSetting.findUnique({ where: { key: VIDEO_PROFILES_META_KEY } })
  if (!setting?.value) return []
  try {
    const arr = JSON.parse(setting.value)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

async function saveVideoBroadcastProfiles(profiles: VideoBroadcastProfile[]): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key: VIDEO_PROFILES_META_KEY },
    update: { value: JSON.stringify(profiles) },
    create: { key: VIDEO_PROFILES_META_KEY, value: JSON.stringify(profiles) },
  })
}

export async function getVideoBroadcastProfileConfig(profileId: string): Promise<VideoBroadcastConfig | null> {
  const setting = await prisma.appSetting.findUnique({ where: { key: videoProfileDataKey(profileId) } })
  if (!setting?.value) return null
  try {
    return normalizeVideoBroadcastConfig(JSON.parse(setting.value))
  } catch {
    return null
  }
}

export async function createVideoBroadcastProfile(input: {
  name: string
  description?: string
}): Promise<VideoBroadcastProfile> {
  const profiles = await getVideoBroadcastProfiles()
  const profile: VideoBroadcastProfile = {
    id: `vbp_${Date.now()}`,
    name: input.name.trim() || 'Untitled Video Broadcast Profile',
    description: (input.description || '').trim(),
    createdAt: new Date().toISOString(),
  }
  profiles.push(profile)
  await saveVideoBroadcastProfiles(profiles)
  await saveVideoBroadcastProfileConfig(profile.id, FALLBACK_VIDEO_BROADCAST_CONFIG)
  return profile
}

export async function updateVideoBroadcastProfileMeta(
  profileId: string,
  input: { name: string; description: string }
): Promise<void> {
  const profiles = await getVideoBroadcastProfiles()
  await saveVideoBroadcastProfiles(
    profiles.map((p) =>
      p.id === profileId
        ? { ...p, name: input.name.trim() || p.name, description: input.description.trim() }
        : p
    )
  )
}

export async function saveVideoBroadcastProfileConfig(
  profileId: string,
  config: VideoBroadcastConfig
): Promise<void> {
  const safeConfig = normalizeVideoBroadcastConfig(config)
  await prisma.appSetting.upsert({
    where: { key: videoProfileDataKey(profileId) },
    update: { value: JSON.stringify(safeConfig) },
    create: { key: videoProfileDataKey(profileId), value: JSON.stringify(safeConfig) },
  })
}

export async function deleteVideoBroadcastProfile(profileId: string): Promise<void> {
  const profiles = await getVideoBroadcastProfiles()
  await saveVideoBroadcastProfiles(profiles.filter((p) => p.id !== profileId))

  await prisma.appSetting.deleteMany({ where: { key: videoProfileDataKey(profileId) } })

  const globalId = await getVideoGlobalProfileId()
  if (globalId === profileId) await setVideoGlobalProfileId(null)

  const groupMap = await getVideoBroadcastGroupProfileMap()
  await saveProfileMap(
    VIDEO_GROUP_PROFILE_MAP_KEY,
    Object.fromEntries(Object.entries(groupMap).filter(([, pid]) => pid !== profileId))
  )

  const deviceMap = await getVideoBroadcastDeviceProfileMap()
  await saveProfileMap(
    VIDEO_DEVICE_PROFILE_MAP_KEY,
    Object.fromEntries(Object.entries(deviceMap).filter(([, pid]) => pid !== profileId))
  )
}

export async function getVideoGlobalProfileId(): Promise<string | null> {
  const setting = await prisma.appSetting.findUnique({ where: { key: VIDEO_GLOBAL_PROFILE_ID_KEY } })
  return setting?.value?.trim() || null
}

export async function setVideoGlobalProfileId(profileId: string | null): Promise<void> {
  if (!profileId) {
    await prisma.appSetting.deleteMany({ where: { key: VIDEO_GLOBAL_PROFILE_ID_KEY } })
    return
  }
  await prisma.appSetting.upsert({
    where: { key: VIDEO_GLOBAL_PROFILE_ID_KEY },
    update: { value: profileId },
    create: { key: VIDEO_GLOBAL_PROFILE_ID_KEY, value: profileId },
  })
}

export async function getVideoBroadcastGroupProfileMap(): Promise<Record<string, string>> {
  return loadProfileMap(VIDEO_GROUP_PROFILE_MAP_KEY)
}

export async function getVideoBroadcastDeviceProfileMap(): Promise<Record<string, string>> {
  return loadProfileMap(VIDEO_DEVICE_PROFILE_MAP_KEY)
}

async function loadProfileMap(key: string): Promise<Record<string, string>> {
  const setting = await prisma.appSetting.findUnique({ where: { key } })
  if (!setting?.value) return {}
  try {
    const obj = JSON.parse(setting.value)
    return typeof obj === 'object' && obj !== null && !Array.isArray(obj) ? obj : {}
  } catch {
    return {}
  }
}

async function saveProfileMap(key: string, map: Record<string, string>): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key },
    update: { value: JSON.stringify(map) },
    create: { key, value: JSON.stringify(map) },
  })
}

export async function assignVideoBroadcastProfileToGroup(groupId: string, profileId: string | null): Promise<void> {
  const map = await getVideoBroadcastGroupProfileMap()
  if (!profileId) {
    delete map[groupId]
  } else {
    map[groupId] = profileId
  }
  await saveProfileMap(VIDEO_GROUP_PROFILE_MAP_KEY, map)
}

export async function assignVideoBroadcastProfileToDevice(deviceId: string, profileId: string | null): Promise<void> {
  const map = await getVideoBroadcastDeviceProfileMap()
  if (!profileId) {
    delete map[deviceId]
  } else {
    map[deviceId] = profileId
  }
  await saveProfileMap(VIDEO_DEVICE_PROFILE_MAP_KEY, map)
}

export function videoBroadcastFromFormData(formData: FormData): VideoBroadcastConfig {
  return normalizeVideoBroadcastConfig({
    revision: Number.parseInt(String(formData.get('revision') || FALLBACK_VIDEO_BROADCAST_CONFIG.revision), 10),
    enabled: formData.get('enabled') === 'on',
    videoId: nullableInt(formData.get('videoId')),
    repeatCount: Number.parseInt(String(formData.get('repeatCount') || 1), 10),
  })
}

export function normalizeVideoBroadcastConfig(value: unknown): VideoBroadcastConfig {
  const source = isRecord(value) ? value : {}

  const rawItems = Array.isArray(source.items) ? source.items : []
  let items: VideoBroadcastItem[] = rawItems
    .map((item) => {
      if (isRecord(item)) {
        const videoId = nullableNumber(item.videoId)
        const repeatCount = clampInt(item.repeatCount, 1, 100, 1)
        if (videoId !== null) {
          return { videoId, repeatCount }
        }
      }
      return null
    })
    .filter((item): item is VideoBroadcastItem => item !== null)

  const legacyVideoId = nullableNumber(source.videoId)
  if (items.length === 0 && legacyVideoId !== null) {
    items = [{
      videoId: legacyVideoId,
      repeatCount: clampInt(source.repeatCount, 1, 100, FALLBACK_VIDEO_BROADCAST_CONFIG.repeatCount)
    }]
  }

  const firstItem = items[0] || null

  return {
    revision: clampInt(source.revision, 1, 100_000, FALLBACK_VIDEO_BROADCAST_CONFIG.revision),
    enabled: safeBoolean(source.enabled, FALLBACK_VIDEO_BROADCAST_CONFIG.enabled),
    videoId: firstItem ? firstItem.videoId : null,
    repeatCount: firstItem ? firstItem.repeatCount : FALLBACK_VIDEO_BROADCAST_CONFIG.repeatCount,
    items,
  }
}

export async function resolveEffectiveVideoBroadcast(deviceId: string): Promise<ResolvedVideoBroadcastConfig> {
  // 1. Global Profile
  const globalProfileId = await getVideoGlobalProfileId()
  const globalConfig = globalProfileId
    ? (await getVideoBroadcastProfileConfig(globalProfileId))
    : null

  // 2. Group Profile
  const groupId = await getDeviceGroupForDevice(deviceId)
  let groupConfig: VideoBroadcastConfig | null = null
  if (groupId) {
    const groupProfileMap = await getVideoBroadcastGroupProfileMap()
    const groupProfileId = groupProfileMap[groupId]
    if (groupProfileId) groupConfig = await getVideoBroadcastProfileConfig(groupProfileId)
  }

  // 3. Device Profile Override
  const deviceProfileMap = await getVideoBroadcastDeviceProfileMap()
  const deviceProfileId = deviceProfileMap[deviceId]
  const deviceConfig = deviceProfileId
    ? await getVideoBroadcastProfileConfig(deviceProfileId)
    : null

  const base = globalConfig || FALLBACK_VIDEO_BROADCAST_CONFIG
  const group = groupConfig || null
  const device = deviceConfig || null

  const merged = normalizeVideoBroadcastConfig({
    ...base,
    ...group,
    ...device,
  })

  const scopeApplied = deviceConfig ? 'device' : groupConfig ? 'group' : globalProfileId ? 'global' : 'fallback'

  if (!merged.enabled || merged.items.length === 0) {
    return {
      ...merged,
      enabled: false,
      videoTitle: '',
      videoUrl: '',
      thumbnailUrl: '',
      scopeApplied,
      videos: [],
    }
  }

  const videoIds = merged.items.map((item) => item.videoId)
  const videos = await prisma.educationVideo.findMany({
    where: { id: { in: videoIds } },
    include: { folder: true },
  })

  const videoMap = new Map(videos.map((v) => [v.id, v]))

  const resolvedVideos: ResolvedVideoBroadcastItem[] = []
  for (const item of merged.items) {
    const video = videoMap.get(item.videoId)
    const isPlayable = Boolean(
      video &&
        video.isPublished &&
        (!video.folder || video.folder.isPublished)
    )
    if (isPlayable && video) {
      resolvedVideos.push({
        title: video.title,
        url: video.videoUrl,
        thumbnailUrl: video.thumbnailUrl || '',
        repeatCount: item.repeatCount,
      })
    }
  }

  if (resolvedVideos.length === 0) {
    return {
      ...merged,
      enabled: false,
      videoTitle: '',
      videoUrl: '',
      thumbnailUrl: '',
      scopeApplied,
      videos: [],
    }
  }

  const firstVideo = resolvedVideos[0]

  return {
    ...merged,
    enabled: true,
    videoTitle: firstVideo.title,
    videoUrl: firstVideo.url,
    thumbnailUrl: firstVideo.thumbnailUrl,
    scopeApplied,
    videos: resolvedVideos,
  }
}

// Stored helpers (kept for backward compatibility)
export async function getGlobalVideoBroadcast(): Promise<VideoBroadcastConfig> {
  const globalProfileId = await getVideoGlobalProfileId()
  return (globalProfileId ? await getVideoBroadcastProfileConfig(globalProfileId) : null) ?? FALLBACK_VIDEO_BROADCAST_CONFIG
}

export async function setGlobalVideoBroadcast(config: VideoBroadcastConfig): Promise<void> {
  const globalProfileId = await getVideoGlobalProfileId()
  if (globalProfileId) {
    await saveVideoBroadcastProfileConfig(globalProfileId, config)
  }
}

export async function getGroupVideoBroadcast(groupId: string): Promise<VideoBroadcastConfig | null> {
  const groupProfileMap = await getVideoBroadcastGroupProfileMap()
  const profileId = groupProfileMap[groupId]
  return profileId ? await getVideoBroadcastProfileConfig(profileId) : null
}

export async function setGroupVideoBroadcast(groupId: string, config: VideoBroadcastConfig): Promise<void> {
  const groupProfileMap = await getVideoBroadcastGroupProfileMap()
  const profileId = groupProfileMap[groupId]
  if (profileId) {
    await saveVideoBroadcastProfileConfig(profileId, config)
  }
}

export async function getDeviceVideoBroadcast(deviceId: string): Promise<VideoBroadcastConfig | null> {
  const deviceProfileMap = await getVideoBroadcastDeviceProfileMap()
  const profileId = deviceProfileMap[deviceId]
  return profileId ? await getVideoBroadcastProfileConfig(profileId) : null
}

export async function setDeviceVideoBroadcast(deviceId: string, config: VideoBroadcastConfig): Promise<void> {
  const deviceProfileMap = await getVideoBroadcastDeviceProfileMap()
  const profileId = deviceProfileMap[deviceId]
  if (profileId) {
    await saveVideoBroadcastProfileConfig(profileId, config)
  }
}

export async function clearScopedVideoBroadcast(scope: 'global' | 'group' | 'device', id?: string): Promise<void> {
  if (scope === 'group' && id) {
    await assignVideoBroadcastProfileToGroup(id, null)
  } else if (scope === 'device' && id) {
    await assignVideoBroadcastProfileToDevice(id, null)
  } else if (scope === 'global') {
    await setVideoGlobalProfileId(null)
  }
}

// Basic internal helpers
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function safeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(min, Math.min(max, Math.floor(parsed)))
}

function nullableNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.floor(value)
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function nullableInt(value: FormDataEntryValue | null): number | null {
  if (typeof value !== 'string') return null
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}
