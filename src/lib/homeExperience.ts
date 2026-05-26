import prisma from '@/lib/db'
import { getDeviceGroupForDevice } from '@/lib/deviceGroups'

const GLOBAL_HOME_EXPERIENCE_KEY = 'homeExperience.global'

export type HomeExperienceScope = 'global' | 'group' | 'device'

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
  forceVideo: {
    enabled: boolean
    videoUrl: string
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
  forceVideo: {
    enabled: false,
    videoUrl: '',
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

export async function clearScopedHomeExperience(scope: HomeExperienceScope, id?: string): Promise<void> {
  const key = resolveScopeKey(scope, id)
  await prisma.appSetting.deleteMany({
    where: { key },
  })
}

export async function resolveEffectiveHomeExperience(deviceId: string): Promise<HomeExperienceConfig> {
  const globalConfig = await getGlobalHomeExperience()
  const groupId = await getDeviceGroupForDevice(deviceId)
  const groupConfig = groupId ? await getGroupHomeExperience(groupId) : null
  const deviceConfig = await getDeviceHomeExperience(deviceId)

  return deepMergeHomeExperience(
    deepMergeHomeExperience(globalConfig, groupConfig),
    deviceConfig
  )
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
    forceVideo: {
      enabled: formData.get('forceVideoEnabled') === 'on',
      videoUrl: formData.get('forceVideoUrl'),
      repeatCount: Number.parseInt(String(formData.get('forceVideoRepeatCount') || 1), 10),
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
    forceVideo: normalizeForceVideo(source.forceVideo),
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
    forceVideo: {
      ...base.forceVideo,
      ...overrideConfig.forceVideo,
    },
    menus: overrideConfig.menus,
    staticPages: overrideConfig.staticPages,
  })
}

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
    displaySeconds: clampInt(source.displaySeconds, 1, 600, FALLBACK_HOME_EXPERIENCE_CONFIG.runningText.displaySeconds),
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

function normalizeForceVideo(value: unknown): HomeExperienceConfig['forceVideo'] {
  const source = isRecord(value) ? value : {}
  return {
    enabled: safeBoolean(source.enabled, false),
    videoUrl: safeString(source.videoUrl, ''),
    repeatCount: clampInt(source.repeatCount, 1, 100, 1),
  }
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
