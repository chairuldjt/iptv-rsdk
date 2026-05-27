import prisma from '@/lib/db'
import { getDeviceGroupForDevice } from '@/lib/deviceGroups'
import { resolveEffectiveRunningText } from '@/lib/runningText'

const GLOBAL_HOME_EXPERIENCE_KEY = 'homeExperience.global'

export type HomeExperienceScope = 'global' | 'group' | 'device' | 'profile'

export type HomeExperienceMenuType =
  | 'tv'
  | 'education'
  | 'entertainment'
  | 'settings'
  | 'info_dialog'
  | 'static_page'

export type HomeExperienceMenuItem = {
  id: string
  enabled: boolean
  type: HomeExperienceMenuType
  title: string
  subtitle: string
  icon: string
  textColor: string
  borderColor: string
  accentColor: string
  backgroundUrl: string
  staticPageId: string
  sortOrder: number
}

export type HomeExperienceStaticPage = {
  id: string
  title: string
  content: string
}

export type HomeExperienceRunningTextItem = {
  id: string
  enabled: boolean
  text: string
}

export type HomeExperienceConfig = {
  revision: number
  logoUrl: string
  homeBackgroundUrl: string
  menus: HomeExperienceMenuItem[]
  staticPages: HomeExperienceStaticPage[]
  runningText: {
    enabled: boolean
    visibleCount: number
    rotationSeconds: number
    displaySeconds: number
    items: HomeExperienceRunningTextItem[]
  }
  splash: {
    enabled: boolean
    backgroundUrl: string
    logoUrl: string
    soundUrl: string
    title: string
    subtitle: string
    footerText: string
    loadingText: string
    showSound: boolean
  }
  sounds: {
    enableSelectionSound: boolean
    enableSplashSound: boolean
    selectionSoundUrl: string
  }
  videoBroadcast?: {
    enabled: boolean
    videoId: number | null
    repeatCount: number
  }
}

export const FALLBACK_HOME_EXPERIENCE_CONFIG: HomeExperienceConfig = {
  revision: 1,
  logoUrl: '',
  homeBackgroundUrl: '',
  menus: [
    {
      id: 'education',
      enabled: true,
      type: 'education',
      title: 'EDUKASI',
      subtitle: 'Video RS',
      icon: 'menu_book',
      textColor: '#FFFFFF',
      borderColor: '#86EFAC',
      accentColor: '#86EFAC',
      backgroundUrl: '',
      staticPageId: '',
      sortOrder: 10,
    },
    {
      id: 'tv',
      enabled: true,
      type: 'tv',
      title: 'TV CHANNEL',
      subtitle: 'Live TV',
      icon: 'live_tv',
      textColor: '#FFFFFF',
      borderColor: '#FFE9A6',
      accentColor: '#FFE9A6',
      backgroundUrl: '',
      staticPageId: '',
      sortOrder: 20,
    },
    {
      id: 'entertainment',
      enabled: true,
      type: 'entertainment',
      title: 'HIBURAN',
      subtitle: 'Konten & Musik',
      icon: 'movie',
      textColor: '#FFFFFF',
      borderColor: '#FF9A76',
      accentColor: '#FF9A76',
      backgroundUrl: '',
      staticPageId: '',
      sortOrder: 30,
    },
    {
      id: 'info',
      enabled: true,
      type: 'info_dialog',
      title: 'INFO APLIKASI',
      subtitle: 'Cek Pembaruan',
      icon: 'info',
      textColor: '#FFFFFF',
      borderColor: '#C084FC',
      accentColor: '#C084FC',
      backgroundUrl: '',
      staticPageId: '',
      sortOrder: 40,
    },
    {
      id: 'settings',
      enabled: true,
      type: 'settings',
      title: 'SETTING',
      subtitle: 'Sistem',
      icon: 'settings',
      textColor: '#FFFFFF',
      borderColor: '#7DD3FC',
      accentColor: '#7DD3FC',
      backgroundUrl: '',
      staticPageId: '',
      sortOrder: 50,
    },
  ],
  staticPages: [
    {
      id: 'welcome',
      title: 'Informasi',
      content: 'Selamat datang di IPTV RSDK. Halaman ini dapat diatur dari Web Admin.',
    },
  ],
  runningText: {
    enabled: false,
    visibleCount: 1,
    rotationSeconds: 10,
    displaySeconds: 10,
    items: [
      {
        id: 'ticker_welcome',
        enabled: true,
        text: 'Selamat datang. Running text ini dapat diubah dari Web Admin.',
      },
    ],
  },
  splash: {
    enabled: true,
    backgroundUrl: '',
    logoUrl: '',
    soundUrl: '',
    title: 'Hospitality IPTV',
    subtitle: 'Live TV • Guest Services • Education',
    footerText: 'PREMIUM IPTV PLATFORM',
    loadingText: 'Preparing your experience...',
    showSound: true,
  },
  sounds: {
    enableSelectionSound: true,
    enableSplashSound: true,
    selectionSoundUrl: '',
  },
  videoBroadcast: {
    enabled: false,
    videoId: null,
    repeatCount: 1,
  },
}

export async function getGlobalHomeExperience(): Promise<HomeExperienceConfig> {
  return getStoredHomeExperience(GLOBAL_HOME_EXPERIENCE_KEY)
}

export async function setGlobalHomeExperience(config: HomeExperienceConfig): Promise<void> {
  await saveStoredHomeExperience(GLOBAL_HOME_EXPERIENCE_KEY, config)
}

export async function getGroupHomeExperience(groupId: string): Promise<HomeExperienceConfig | null> {
  return getStoredHomeExperienceOptional(groupKey(groupId))
}

export async function setGroupHomeExperience(groupId: string, config: HomeExperienceConfig): Promise<void> {
  await saveStoredHomeExperience(groupKey(groupId), config)
}

export async function getDeviceHomeExperience(deviceId: string): Promise<HomeExperienceConfig | null> {
  return getStoredHomeExperienceOptional(deviceKey(deviceId))
}

export async function setDeviceHomeExperience(deviceId: string, config: HomeExperienceConfig): Promise<void> {
  await saveStoredHomeExperience(deviceKey(deviceId), config)
}

export async function getDeviceIdsWithOverride(): Promise<string[]> {
  const settings = await prisma.appSetting.findMany({
    where: { key: { startsWith: 'homeExperience.device.' } },
    select: { key: true },
  })
  return settings.map((s) => s.key.replace('homeExperience.device.', ''))
}

export async function clearScopedHomeExperience(scope: HomeExperienceScope, id?: string): Promise<void> {
  const key = resolveScopeKey(scope, id)
  await prisma.appSetting.deleteMany({
    where: { key },
  })
}

export async function resolveEffectiveHomeExperience(deviceId: string): Promise<HomeExperienceConfig> {
  // 1. Global: prefer profile-based global, fallback to legacy
  const globalProfileId = await getGlobalProfileId()
  const globalConfig = globalProfileId
    ? ((await getHomeExperienceProfileConfig(globalProfileId)) ?? await getGlobalHomeExperience())
    : await getGlobalHomeExperience()

  // 2. Group: prefer profile-based group config, fallback to legacy per-group config
  const groupId = await getDeviceGroupForDevice(deviceId)
  let groupConfig: HomeExperienceConfig | null = null
  if (groupId) {
    const groupProfileMap = await getGroupProfileMap()
    const groupProfileId = groupProfileMap[groupId]
    groupConfig = groupProfileId
      ? await getHomeExperienceProfileConfig(groupProfileId)
      : await getGroupHomeExperience(groupId)
  }

  // 3. Device: prefer profile-based device config, fallback to legacy per-device override
  const deviceProfileMap = await getDeviceProfileMap()
  const deviceProfileId = deviceProfileMap[deviceId]
  const deviceConfig = deviceProfileId
    ? await getHomeExperienceProfileConfig(deviceProfileId)
    : await getDeviceHomeExperience(deviceId)

  const merged = deepMergeHomeExperience(
    deepMergeHomeExperience(globalConfig, groupConfig),
    deviceConfig
  )

  // Override runningText with the resolved Running Text profile settings
  const effectiveRunningText = await resolveEffectiveRunningText(deviceId)
  merged.runningText = {
    enabled: false,
    visibleCount: effectiveRunningText.visibleCount,
    rotationSeconds: effectiveRunningText.rotationSeconds,
    displaySeconds: effectiveRunningText.displaySeconds,
    items: effectiveRunningText.items,
  }

  return merged
}

export function homeExperienceFromFormData(formData: FormData): HomeExperienceConfig {
  return normalizeHomeExperienceConfig({
    revision: Number.parseInt(String(formData.get('revision') || FALLBACK_HOME_EXPERIENCE_CONFIG.revision), 10),
    logoUrl: formData.get('logoUrl'),
    homeBackgroundUrl: formData.get('homeBackgroundUrl'),
    menus: parseJsonArray(formData.get('menusJson'), FALLBACK_HOME_EXPERIENCE_CONFIG.menus),
    staticPages: parseJsonArray(formData.get('staticPagesJson'), FALLBACK_HOME_EXPERIENCE_CONFIG.staticPages),
    runningText: {
      enabled: formData.get('runningTextEnabled') === 'on',
      visibleCount: Number.parseInt(String(formData.get('runningTextVisibleCount') || 1), 10),
      rotationSeconds: Number.parseInt(String(formData.get('runningTextRotationSeconds') || 10), 10),
      displaySeconds: Number.parseInt(String(formData.get('runningTextDisplaySeconds') || 10), 10),
      items: parseJsonArray(formData.get('runningTextItemsJson'), FALLBACK_HOME_EXPERIENCE_CONFIG.runningText.items),
    },
    splash: {
      enabled: formData.get('splashEnabled') === 'on',
      backgroundUrl: formData.get('splashBackgroundUrl'),
      logoUrl: formData.get('splashLogoUrl'),
      soundUrl: formData.get('splashSoundUrl'),
      title: formData.get('splashTitle'),
      subtitle: formData.get('splashSubtitle'),
      footerText: formData.get('splashFooterText'),
      loadingText: formData.get('splashLoadingText'),
      showSound: formData.get('splashShowSound') === 'on',
    },
    sounds: {
      enableSelectionSound: formData.get('enableSelectionSound') === 'on',
      enableSplashSound: formData.get('enableSplashSound') === 'on',
      selectionSoundUrl: formData.get('selectionSoundUrl'),
    },
    videoBroadcast: {
      enabled: formData.get('videoBroadcastEnabled') === 'on',
      videoId: formData.get('videoBroadcastVideoId') ? Number.parseInt(String(formData.get('videoBroadcastVideoId')), 10) : null,
      repeatCount: Number.parseInt(String(formData.get('videoBroadcastRepeatCount') || 1), 10),
    },
  })
}

export function normalizeHomeExperienceConfig(value: unknown): HomeExperienceConfig {
  const source = isRecord(value) ? value : {}

  return {
    revision: clampInt(source.revision, 1, 100_000, FALLBACK_HOME_EXPERIENCE_CONFIG.revision),
    logoUrl: safeString(source.logoUrl, ''),
    homeBackgroundUrl: safeString(source.homeBackgroundUrl, ''),
    menus: normalizeMenus(source.menus),
    staticPages: normalizeStaticPages(source.staticPages),
    runningText: normalizeRunningText(source.runningText),
    splash: normalizeSplash(source.splash),
    sounds: normalizeSounds(source.sounds),
    videoBroadcast: normalizeVideoBroadcast(source.videoBroadcast),
  }
}

export function deepMergeHomeExperience(
  base: HomeExperienceConfig,
  overrideConfig: HomeExperienceConfig | null
): HomeExperienceConfig {
  if (!overrideConfig) return base

  return normalizeHomeExperienceConfig({
    ...base,
    ...overrideConfig,
    runningText: {
      ...base.runningText,
      ...overrideConfig.runningText,
      items: overrideConfig.runningText.items,
    },
    splash: {
      ...base.splash,
      ...overrideConfig.splash,
    },
    sounds: {
      ...base.sounds,
      ...overrideConfig.sounds,
    },
    videoBroadcast: {
      ...base.videoBroadcast,
      ...overrideConfig.videoBroadcast,
    },
    menus: overrideConfig.menus,
    staticPages: overrideConfig.staticPages,
  })
}

// ===== Profile System =====
// Profiles are named, reusable config objects (like GPOs in GPMC).
// One profile can be assigned to multiple groups and/or multiple devices.

export type HomeExperienceProfile = {
  id: string
  name: string
  description: string
  createdAt: string
}

const PROFILES_META_KEY = 'homeExperience.profiles'
const GLOBAL_PROFILE_ID_KEY = 'homeExperience.globalProfileId'
const GROUP_PROFILE_MAP_KEY = 'homeExperience.groupProfileMap'
const DEVICE_PROFILE_MAP_KEY = 'homeExperience.deviceProfileMap'

function profileDataKey(profileId: string): string {
  return `homeExperience.profile.${profileId}`
}

export async function getHomeExperienceProfiles(): Promise<HomeExperienceProfile[]> {
  const setting = await prisma.appSetting.findUnique({ where: { key: PROFILES_META_KEY } })
  if (!setting?.value) return []
  try {
    const arr = JSON.parse(setting.value)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

async function saveHomeExperienceProfiles(profiles: HomeExperienceProfile[]): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key: PROFILES_META_KEY },
    update: { value: JSON.stringify(profiles) },
    create: { key: PROFILES_META_KEY, value: JSON.stringify(profiles) },
  })
}

export async function getHomeExperienceProfileConfig(profileId: string): Promise<HomeExperienceConfig | null> {
  return getStoredHomeExperienceOptional(profileDataKey(profileId))
}

export async function createHomeExperienceProfile(input: {
  name: string
  description?: string
}): Promise<HomeExperienceProfile> {
  const profiles = await getHomeExperienceProfiles()
  const profile: HomeExperienceProfile = {
    id: `hep_${Date.now()}`,
    name: input.name.trim() || 'Untitled Profile',
    description: (input.description || '').trim(),
    createdAt: new Date().toISOString(),
  }
  profiles.push(profile)
  await saveHomeExperienceProfiles(profiles)
  await saveStoredHomeExperience(profileDataKey(profile.id), FALLBACK_HOME_EXPERIENCE_CONFIG)
  return profile
}

export async function updateHomeExperienceProfileMeta(
  profileId: string,
  input: { name: string; description: string }
): Promise<void> {
  const profiles = await getHomeExperienceProfiles()
  await saveHomeExperienceProfiles(
    profiles.map((p) =>
      p.id === profileId
        ? { ...p, name: input.name.trim() || p.name, description: input.description.trim() }
        : p
    )
  )
}

export async function saveHomeExperienceProfileConfig(
  profileId: string,
  config: HomeExperienceConfig
): Promise<void> {
  await saveStoredHomeExperience(profileDataKey(profileId), config)
}

export async function deleteHomeExperienceProfile(profileId: string): Promise<void> {
  // Remove from metadata list
  const profiles = await getHomeExperienceProfiles()
  await saveHomeExperienceProfiles(profiles.filter((p) => p.id !== profileId))

  // Remove config data
  await prisma.appSetting.deleteMany({ where: { key: profileDataKey(profileId) } })

  // Clear global if it was this profile
  const globalId = await getGlobalProfileId()
  if (globalId === profileId) await setGlobalProfileId(null)

  // Clear group assignments pointing to this profile
  const groupMap = await getGroupProfileMap()
  await saveProfileMap(
    GROUP_PROFILE_MAP_KEY,
    Object.fromEntries(Object.entries(groupMap).filter(([, pid]) => pid !== profileId))
  )

  // Clear device assignments pointing to this profile
  const deviceMap = await getDeviceProfileMap()
  await saveProfileMap(
    DEVICE_PROFILE_MAP_KEY,
    Object.fromEntries(Object.entries(deviceMap).filter(([, pid]) => pid !== profileId))
  )
}

export async function getGlobalProfileId(): Promise<string | null> {
  const setting = await prisma.appSetting.findUnique({ where: { key: GLOBAL_PROFILE_ID_KEY } })
  return setting?.value?.trim() || null
}

export async function setGlobalProfileId(profileId: string | null): Promise<void> {
  if (!profileId) {
    await prisma.appSetting.deleteMany({ where: { key: GLOBAL_PROFILE_ID_KEY } })
    return
  }
  await prisma.appSetting.upsert({
    where: { key: GLOBAL_PROFILE_ID_KEY },
    update: { value: profileId },
    create: { key: GLOBAL_PROFILE_ID_KEY, value: profileId },
  })
}

export async function getGroupProfileMap(): Promise<Record<string, string>> {
  return loadProfileMap(GROUP_PROFILE_MAP_KEY)
}

export async function getDeviceProfileMap(): Promise<Record<string, string>> {
  return loadProfileMap(DEVICE_PROFILE_MAP_KEY)
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

export async function assignProfileToGroup(groupId: string, profileId: string | null): Promise<void> {
  const map = await getGroupProfileMap()
  if (!profileId) {
    delete map[groupId]
  } else {
    map[groupId] = profileId
  }
  await saveProfileMap(GROUP_PROFILE_MAP_KEY, map)
}

export async function assignProfileToDevice(deviceId: string, profileId: string | null): Promise<void> {
  const map = await getDeviceProfileMap()
  if (!profileId) {
    delete map[deviceId]
  } else {
    map[deviceId] = profileId
  }
  await saveProfileMap(DEVICE_PROFILE_MAP_KEY, map)
}

// ===== END Profile System =====

async function getStoredHomeExperience(key: string): Promise<HomeExperienceConfig> {
  const config = await getStoredHomeExperienceOptional(key)
  return config ?? FALLBACK_HOME_EXPERIENCE_CONFIG
}

async function getStoredHomeExperienceOptional(key: string): Promise<HomeExperienceConfig | null> {

  const setting = await prisma.appSetting.findUnique({
    where: { key },
  })

  if (!setting?.value) return null

  try {
    return normalizeHomeExperienceConfig(JSON.parse(setting.value))
  } catch {
    return null
  }
}

async function saveStoredHomeExperience(key: string, config: HomeExperienceConfig): Promise<void> {
  const safeConfig = normalizeHomeExperienceConfig(config)

  await prisma.appSetting.upsert({
    where: { key },
    update: { value: JSON.stringify(safeConfig) },
    create: {
      key,
      value: JSON.stringify(safeConfig),
    },
  })
}

function resolveScopeKey(scope: HomeExperienceScope, id?: string): string {
  if (scope === 'global') return GLOBAL_HOME_EXPERIENCE_KEY
  if (scope === 'group') return groupKey(id || '')
  return deviceKey(id || '')
}

function groupKey(groupId: string): string {
  return `homeExperience.group.${groupId}`
}

function deviceKey(deviceId: string): string {
  return `homeExperience.device.${deviceId}`
}

function normalizeMenus(value: unknown): HomeExperienceMenuItem[] {
  const source = Array.isArray(value) ? value : FALLBACK_HOME_EXPERIENCE_CONFIG.menus

  return source
    .filter((entry): entry is Record<string, unknown> => isRecord(entry))
    .map((entry, index) => ({
      id: safeString(entry.id, `menu_${index}`),
      enabled: safeBoolean(entry.enabled, true),
      type: oneOf(entry.type, ['tv', 'education', 'entertainment', 'settings', 'info_dialog', 'static_page'], 'info_dialog'),
      title: safeString(entry.title, `MENU ${index + 1}`),
      subtitle: safeString(entry.subtitle, ''),
      icon: safeString(entry.icon, 'info'),
      textColor: normalizeHexColor(entry.textColor, '#FFFFFF'),
      borderColor: normalizeHexColor(entry.borderColor, '#FFFFFF'),
      accentColor: normalizeHexColor(entry.accentColor, '#FFFFFF'),
      backgroundUrl: safeString(entry.backgroundUrl, ''),
      staticPageId: safeString(entry.staticPageId, ''),
      sortOrder: clampInt(entry.sortOrder, 0, 9999, index * 10),
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

function normalizeStaticPages(value: unknown): HomeExperienceStaticPage[] {
  const source = Array.isArray(value) ? value : FALLBACK_HOME_EXPERIENCE_CONFIG.staticPages

  return source
    .filter((entry): entry is Record<string, unknown> => isRecord(entry))
    .map((entry, index) => ({
      id: safeString(entry.id, `page_${index}`),
      title: safeString(entry.title, `Halaman ${index + 1}`),
      content: safeString(entry.content, ''),
    }))
}

function normalizeRunningText(value: unknown): HomeExperienceConfig['runningText'] {
  const source = isRecord(value) ? value : {}
  const itemsSource = Array.isArray(source.items)
    ? source.items
    : FALLBACK_HOME_EXPERIENCE_CONFIG.runningText.items

  return {
    enabled: safeBoolean(source.enabled, FALLBACK_HOME_EXPERIENCE_CONFIG.runningText.enabled),
    visibleCount: clampInt(source.visibleCount, 1, 10, FALLBACK_HOME_EXPERIENCE_CONFIG.runningText.visibleCount),
    rotationSeconds: clampInt(source.rotationSeconds, 1, 600, FALLBACK_HOME_EXPERIENCE_CONFIG.runningText.rotationSeconds),
    displaySeconds: clampInt(source.displaySeconds, 0, 600, FALLBACK_HOME_EXPERIENCE_CONFIG.runningText.displaySeconds),
    items: itemsSource
      .filter((entry): entry is Record<string, unknown> => isRecord(entry))
      .map((entry, index) => ({
        id: safeString(entry.id, `ticker_${index}`),
        enabled: safeBoolean(entry.enabled, true),
        text: safeString(entry.text, ''),
      }))
      .filter((entry) => entry.text.length > 0),
  }
}

function normalizeSplash(value: unknown): HomeExperienceConfig['splash'] {
  const source = isRecord(value) ? value : {}
  return {
    enabled: safeBoolean(source.enabled, FALLBACK_HOME_EXPERIENCE_CONFIG.splash.enabled),
    backgroundUrl: safeString(source.backgroundUrl, ''),
    logoUrl: safeString(source.logoUrl, ''),
    soundUrl: safeString(source.soundUrl, ''),
    title: safeString(source.title, FALLBACK_HOME_EXPERIENCE_CONFIG.splash.title),
    subtitle: safeString(source.subtitle, FALLBACK_HOME_EXPERIENCE_CONFIG.splash.subtitle),
    footerText: safeString(source.footerText, FALLBACK_HOME_EXPERIENCE_CONFIG.splash.footerText),
    loadingText: safeString(source.loadingText, FALLBACK_HOME_EXPERIENCE_CONFIG.splash.loadingText),
    showSound: safeBoolean(source.showSound, FALLBACK_HOME_EXPERIENCE_CONFIG.splash.showSound),
  }
}

function normalizeSounds(value: unknown): HomeExperienceConfig['sounds'] {
  const source = isRecord(value) ? value : {}
  return {
    enableSelectionSound: safeBoolean(source.enableSelectionSound, FALLBACK_HOME_EXPERIENCE_CONFIG.sounds.enableSelectionSound),
    enableSplashSound: safeBoolean(source.enableSplashSound, FALLBACK_HOME_EXPERIENCE_CONFIG.sounds.enableSplashSound),
    selectionSoundUrl: safeString(source.selectionSoundUrl, ''),
  }
}

function normalizeVideoBroadcast(value: unknown): HomeExperienceConfig['videoBroadcast'] {
  const source = isRecord(value) ? value : {}
  const fallback = FALLBACK_HOME_EXPERIENCE_CONFIG.videoBroadcast || { enabled: false, videoId: null, repeatCount: 1 }
  return {
    enabled: safeBoolean(source.enabled, fallback.enabled),
    videoId: nullableNumber(source.videoId),
    repeatCount: clampInt(source.repeatCount, 1, 100, fallback.repeatCount),
  }
}

function nullableNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.floor(value)
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function parseJsonArray<T>(value: FormDataEntryValue | null, fallback: T[]): T[] {
  if (typeof value !== 'string' || !value.trim()) return fallback
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? (parsed as T[]) : fallback
  } catch {
    return fallback
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function safeString(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback
  return value.trim()
}

function safeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function normalizeHexColor(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed.toUpperCase() : fallback
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(min, Math.min(max, Math.floor(parsed)))
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && allowed.includes(value as T) ? (value as T) : fallback
}
