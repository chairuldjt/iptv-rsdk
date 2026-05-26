import prisma from '@/lib/db'
import { getDeviceGroupForDevice } from '@/lib/deviceGroups'

const GLOBAL_VIDEO_BROADCAST_KEY = 'videoBroadcast.global'

export type VideoBroadcastScope = 'global' | 'group' | 'device'

export type VideoBroadcastConfig = {
  revision: number
  enabled: boolean
  videoId: number | null
  repeatCount: number
}

export type ResolvedVideoBroadcastConfig = VideoBroadcastConfig & {
  videoTitle: string
  videoUrl: string
  thumbnailUrl: string
  scopeApplied: VideoBroadcastScope | 'fallback'
}

export const FALLBACK_VIDEO_BROADCAST_CONFIG: VideoBroadcastConfig = {
  revision: 1,
  enabled: false,
  videoId: null,
  repeatCount: 1,
}

export async function getGlobalVideoBroadcast(): Promise<VideoBroadcastConfig> {
  return getStoredVideoBroadcast(GLOBAL_VIDEO_BROADCAST_KEY)
}

export async function setGlobalVideoBroadcast(config: VideoBroadcastConfig): Promise<void> {
  await saveStoredVideoBroadcast(GLOBAL_VIDEO_BROADCAST_KEY, config)
}

export async function getGroupVideoBroadcast(groupId: string): Promise<VideoBroadcastConfig | null> {
  return getStoredVideoBroadcastOptional(groupKey(groupId))
}

export async function setGroupVideoBroadcast(groupId: string, config: VideoBroadcastConfig): Promise<void> {
  await saveStoredVideoBroadcast(groupKey(groupId), config)
}

export async function getDeviceVideoBroadcast(deviceId: string): Promise<VideoBroadcastConfig | null> {
  return getStoredVideoBroadcastOptional(deviceKey(deviceId))
}

export async function setDeviceVideoBroadcast(deviceId: string, config: VideoBroadcastConfig): Promise<void> {
  await saveStoredVideoBroadcast(deviceKey(deviceId), config)
}

export async function clearScopedVideoBroadcast(scope: VideoBroadcastScope, id?: string): Promise<void> {
  const key = resolveScopeKey(scope, id)
  await prisma.appSetting.deleteMany({
    where: { key },
  })
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

  return {
    revision: clampInt(source.revision, 1, 100_000, FALLBACK_VIDEO_BROADCAST_CONFIG.revision),
    enabled: safeBoolean(source.enabled, FALLBACK_VIDEO_BROADCAST_CONFIG.enabled),
    videoId: nullableNumber(source.videoId),
    repeatCount: clampInt(source.repeatCount, 1, 100, FALLBACK_VIDEO_BROADCAST_CONFIG.repeatCount),
  }
}

export async function resolveEffectiveVideoBroadcast(deviceId: string): Promise<ResolvedVideoBroadcastConfig> {
  const globalConfig = await getGlobalVideoBroadcast()
  const groupId = await getDeviceGroupForDevice(deviceId)
  const groupConfig = groupId ? await getGroupVideoBroadcast(groupId) : null
  const deviceConfig = await getDeviceVideoBroadcast(deviceId)

  let effective = globalConfig
  let scopeApplied: ResolvedVideoBroadcastConfig['scopeApplied'] = 'global'

  if (groupConfig) {
    effective = groupConfig
    scopeApplied = 'group'
  }

  if (deviceConfig) {
    effective = deviceConfig
    scopeApplied = 'device'
  }

  const safeConfig = normalizeVideoBroadcastConfig(effective)
  if (!safeConfig.enabled || !safeConfig.videoId) {
    return {
      ...safeConfig,
      enabled: false,
      videoTitle: '',
      videoUrl: '',
      thumbnailUrl: '',
      scopeApplied: safeConfig === FALLBACK_VIDEO_BROADCAST_CONFIG ? 'fallback' : scopeApplied,
    }
  }

  const video = await prisma.educationVideo.findUnique({
    where: { id: safeConfig.videoId },
    include: { folder: true },
  })

  const isPlayable = Boolean(
    video &&
      video.isPublished &&
      (!video.folder || video.folder.isPublished)
  )

  if (!isPlayable || !video) {
    return {
      ...safeConfig,
      enabled: false,
      videoTitle: '',
      videoUrl: '',
      thumbnailUrl: '',
      scopeApplied,
    }
  }

  return {
    ...safeConfig,
    enabled: true,
    videoTitle: video.title,
    videoUrl: video.videoUrl,
    thumbnailUrl: video.thumbnailUrl || '',
    scopeApplied,
  }
}

async function getStoredVideoBroadcast(key: string): Promise<VideoBroadcastConfig> {
  const config = await getStoredVideoBroadcastOptional(key)
  return config ?? FALLBACK_VIDEO_BROADCAST_CONFIG
}

async function getStoredVideoBroadcastOptional(key: string): Promise<VideoBroadcastConfig | null> {
  const setting = await prisma.appSetting.findUnique({
    where: { key },
  })

  if (!setting?.value) return null

  try {
    return normalizeVideoBroadcastConfig(JSON.parse(setting.value))
  } catch {
    return null
  }
}

async function saveStoredVideoBroadcast(key: string, config: VideoBroadcastConfig): Promise<void> {
  const safeConfig = normalizeVideoBroadcastConfig(config)

  await prisma.appSetting.upsert({
    where: { key },
    update: { value: JSON.stringify(safeConfig) },
    create: {
      key,
      value: JSON.stringify(safeConfig),
    },
  })
}

function resolveScopeKey(scope: VideoBroadcastScope, id?: string): string {
  if (scope === 'global') return GLOBAL_VIDEO_BROADCAST_KEY
  if (scope === 'group') return groupKey(id || '')
  return deviceKey(id || '')
}

function groupKey(groupId: string): string {
  return `videoBroadcast.group.${groupId}`
}

function deviceKey(deviceId: string): string {
  return `videoBroadcast.device.${deviceId}`
}

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
