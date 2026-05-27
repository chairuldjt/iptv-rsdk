import prisma from '@/lib/db'
import { getDeviceGroupForDevice } from '@/lib/deviceGroups'

const GLOBAL_HOME_EXPERIENCE_KEY = 'homeExperience.global'
const HOME_EXPERIENCE_MENU_TYPES = ['tv', 'education', 'entertainment', 'settings', 'info_dialog', 'static_page', 'recommendations', 'favorites', 'search'] as const

export type HomeExperienceScope = 'global' | 'group' | 'device' | 'profile'

export type HomeExperienceMenuType =
  | 'tv'
  | 'education'
  | 'entertainment'
  | 'settings'
  | 'info_dialog'
  | 'static_page'
  | 'recommendations'
  | 'favorites'
  | 'search'

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
  isPinned?: boolean
  badge?: {
    text: string
    color: string
    position: 'top-right' | 'top-left' | 'bottom-right'
  }
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

export type HomeExperienceResolvedConfig = {
  revision: number
  logoUrl: string
  homeBackgroundUrl: string
  menus: HomeExperienceMenuItem[]
  staticPages: HomeExperienceStaticPage[]
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
}

export type HomeExperienceMenuPatch = {
  id: string
  enabled?: boolean
  type?: HomeExperienceMenuType
  title?: string
  subtitle?: string
  icon?: string
  textColor?: string
  borderColor?: string
  accentColor?: string
  backgroundUrl?: string
  staticPageId?: string
  sortOrder?: number
  isPinned?: boolean
  badge?: {
    text: string
    color: string
    position: 'top-right' | 'top-left' | 'bottom-right'
  }
}

export type HomeExperienceStaticPagePatch = {
  id: string
  title?: string
  content?: string
}

export type HomeExperiencePatch = {
  revision?: number
  logoUrl?: string
  homeBackgroundUrl?: string
  menus?: HomeExperienceMenuPatch[]
  staticPages?: HomeExperienceStaticPagePatch[]
  splash?: Partial<HomeExperienceResolvedConfig['splash']>
  sounds?: Partial<HomeExperienceResolvedConfig['sounds']>
}

export type HomeExperienceConfig = HomeExperienceResolvedConfig

export const FALLBACK_HOME_EXPERIENCE_CONFIG: HomeExperienceResolvedConfig = {
  revision: 1,
  logoUrl: '',
  homeBackgroundUrl: '',
  menus: [
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
      sortOrder: 10,
    },
    {
      id: 'recommendations',
      enabled: true,
      type: 'recommendations',
      title: 'REKOMENDASI',
      subtitle: 'Konten Pilihan',
      icon: 'star',
      textColor: '#FFFFFF',
      borderColor: '#FFD700',
      accentColor: '#FFD700',
      backgroundUrl: '',
      staticPageId: '',
      sortOrder: 15,
    },
    {
      id: 'favorites',
      enabled: true,
      type: 'favorites',
      title: 'FAVORIT',
      subtitle: 'Konten Tersimpan',
      icon: 'bookmark',
      textColor: '#FFFFFF',
      borderColor: '#EF4444',
      accentColor: '#EF4444',
      backgroundUrl: '',
      staticPageId: '',
      sortOrder: 20,
    },
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
      sortOrder: 30,
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
      sortOrder: 40,
    },
    {
      id: 'search',
      enabled: true,
      type: 'search',
      title: 'PENCARIAN',
      subtitle: 'Cari Konten',
      icon: 'search',
      textColor: '#FFFFFF',
      borderColor: '#3B82F6',
      accentColor: '#3B82F6',
      backgroundUrl: '',
      staticPageId: '',
      sortOrder: 45,
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
      sortOrder: 50,
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
      sortOrder: 60,
    },
  ],
  staticPages: [
    {
      id: 'welcome',
      title: 'Informasi',
      content: 'Selamat datang di IPTV RSDK. Halaman ini dapat diatur dari Web Admin.',
    },
  ],
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
}

export async function getGlobalHomeExperience(): Promise<HomeExperienceResolvedConfig> {
  return getStoredHomeExperience(GLOBAL_HOME_EXPERIENCE_KEY)
}

export async function setGlobalHomeExperience(config: HomeExperienceResolvedConfig): Promise<void> {
  await saveStoredHomeExperience(GLOBAL_HOME_EXPERIENCE_KEY, config)
}

export async function getGroupHomeExperience(groupId: string): Promise<HomeExperienceResolvedConfig | null> {
  return getStoredHomeExperienceOptional(groupKey(groupId))
}

export async function setGroupHomeExperience(groupId: string, config: HomeExperienceResolvedConfig): Promise<void> {
  await saveStoredHomeExperience(groupKey(groupId), config)
}

export async function getDeviceHomeExperience(deviceId: string): Promise<HomeExperienceResolvedConfig | null> {
  return getStoredHomeExperienceOptional(deviceKey(deviceId))
}

export async function setDeviceHomeExperience(deviceId: string, config: HomeExperienceResolvedConfig): Promise<void> {
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

export async function resolveEffectiveHomeExperience(deviceId: string): Promise<HomeExperienceResolvedConfig> {
  const globalProfileId = await getGlobalProfileId()
  const globalPatch = globalProfileId
    ? ((await getHomeExperienceProfilePatch(globalProfileId)) ?? await getGlobalHomeExperiencePatch())
    : await getGlobalHomeExperiencePatch()

  const groupId = await getDeviceGroupForDevice(deviceId)
  let groupPatch: HomeExperiencePatch | null = null
  if (groupId) {
    const groupProfileMap = await getGroupProfileMap()
    const groupProfileId = groupProfileMap[groupId]
    groupPatch = groupProfileId
      ? await getHomeExperienceProfilePatch(groupProfileId)
      : await getGroupHomeExperiencePatch(groupId)
  }

  const deviceProfileMap = await getDeviceProfileMap()
  const deviceProfileId = deviceProfileMap[deviceId]
  const devicePatch = deviceProfileId
    ? await getHomeExperienceProfilePatch(deviceProfileId)
    : await getDeviceHomeExperiencePatch(deviceId)

  return applyHomeExperiencePatch(
    applyHomeExperiencePatch(
      applyHomeExperiencePatch(FALLBACK_HOME_EXPERIENCE_CONFIG, globalPatch),
      groupPatch
    ),
    devicePatch
  )
}

export function homeExperienceFromFormData(formData: FormData): HomeExperienceResolvedConfig {
  return normalizeHomeExperienceConfig({
    revision: Number.parseInt(String(formData.get('revision') || FALLBACK_HOME_EXPERIENCE_CONFIG.revision), 10),
    logoUrl: formData.get('logoUrl'),
    homeBackgroundUrl: formData.get('homeBackgroundUrl'),
    menus: parseJsonArray(formData.get('menusJson'), FALLBACK_HOME_EXPERIENCE_CONFIG.menus),
    staticPages: parseJsonArray(formData.get('staticPagesJson'), FALLBACK_HOME_EXPERIENCE_CONFIG.staticPages),
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
  })
}

export function normalizeHomeExperienceConfig(value: unknown): HomeExperienceResolvedConfig {
  const source = isRecord(value) ? value : {}

  return {
    revision: clampInt(source.revision, 1, 100_000, FALLBACK_HOME_EXPERIENCE_CONFIG.revision),
    logoUrl: safeString(source.logoUrl, ''),
    homeBackgroundUrl: safeString(source.homeBackgroundUrl, ''),
    menus: normalizeMenus(source.menus),
    staticPages: normalizeStaticPages(source.staticPages),
    splash: normalizeSplash(source.splash),
    sounds: normalizeSounds(source.sounds),
  }
}

export function normalizeHomeExperiencePatch(value: unknown): HomeExperiencePatch {
  const source = isRecord(value) ? value : {}
  const patch: HomeExperiencePatch = {}

  if (hasOwn(source, 'revision')) patch.revision = clampInt(source.revision, 1, 100_000, FALLBACK_HOME_EXPERIENCE_CONFIG.revision)
  if (hasOwn(source, 'logoUrl')) patch.logoUrl = safeString(source.logoUrl, '')
  if (hasOwn(source, 'homeBackgroundUrl')) patch.homeBackgroundUrl = safeString(source.homeBackgroundUrl, '')
  if (hasOwn(source, 'menus')) patch.menus = normalizeMenuPatches(source.menus)
  if (hasOwn(source, 'staticPages')) patch.staticPages = normalizeStaticPagePatches(source.staticPages)
  if (hasOwn(source, 'splash')) patch.splash = normalizeSplashPatch(source.splash)
  if (hasOwn(source, 'sounds')) patch.sounds = normalizeSoundsPatch(source.sounds)

  return patch
}

export function applyHomeExperiencePatch(
  base: HomeExperienceResolvedConfig,
  patch: HomeExperiencePatch | null
): HomeExperienceResolvedConfig {
  if (!patch) return base

  return normalizeHomeExperienceConfig({
    ...base,
    revision: patch.revision ?? base.revision,
    logoUrl: patch.logoUrl ?? base.logoUrl,
    homeBackgroundUrl: patch.homeBackgroundUrl ?? base.homeBackgroundUrl,
    splash: {
      ...base.splash,
      ...(patch.splash ?? {}),
    },
    sounds: {
      ...base.sounds,
      ...(patch.sounds ?? {}),
    },
    menus: mergeMenuPatches(base.menus, patch.menus),
    staticPages: mergeStaticPagePatches(base.staticPages, patch.staticPages),
  })
}

export function deepMergeHomeExperience(
  base: HomeExperienceResolvedConfig,
  overrideConfig: HomeExperiencePatch | null
): HomeExperienceResolvedConfig {
  return applyHomeExperiencePatch(base, overrideConfig)
}

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

export async function getHomeExperienceProfileConfig(profileId: string): Promise<HomeExperienceResolvedConfig | null> {
  return getStoredHomeExperienceOptional(profileDataKey(profileId))
}

export async function getHomeExperienceProfilePatch(profileId: string): Promise<HomeExperiencePatch | null> {
  return getStoredHomeExperiencePatchOptional(profileDataKey(profileId))
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
  config: HomeExperienceResolvedConfig
): Promise<void> {
  await saveStoredHomeExperience(profileDataKey(profileId), config)
}

export async function deleteHomeExperienceProfile(profileId: string): Promise<void> {
  const profiles = await getHomeExperienceProfiles()
  await saveHomeExperienceProfiles(profiles.filter((p) => p.id !== profileId))

  await prisma.appSetting.deleteMany({ where: { key: profileDataKey(profileId) } })

  const globalId = await getGlobalProfileId()
  if (globalId === profileId) await setGlobalProfileId(null)

  const groupMap = await getGroupProfileMap()
  await saveProfileMap(
    GROUP_PROFILE_MAP_KEY,
    Object.fromEntries(Object.entries(groupMap).filter(([, pid]) => pid !== profileId))
  )

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

async function getStoredHomeExperience(key: string): Promise<HomeExperienceResolvedConfig> {
  const config = await getStoredHomeExperienceOptional(key)
  return config ?? FALLBACK_HOME_EXPERIENCE_CONFIG
}

async function getStoredHomeExperienceOptional(key: string): Promise<HomeExperienceResolvedConfig | null> {
  const patch = await getStoredHomeExperiencePatchOptional(key)
  return patch ? applyHomeExperiencePatch(FALLBACK_HOME_EXPERIENCE_CONFIG, patch) : null
}

async function getStoredHomeExperiencePatchOptional(key: string): Promise<HomeExperiencePatch | null> {
  const setting = await prisma.appSetting.findUnique({
    where: { key },
  })

  if (!setting?.value) return null

  try {
    return compactHomeExperiencePatch(normalizeHomeExperiencePatch(JSON.parse(setting.value)))
  } catch {
    return null
  }
}

async function getGlobalHomeExperiencePatch(): Promise<HomeExperiencePatch | null> {
  return getStoredHomeExperiencePatchOptional(GLOBAL_HOME_EXPERIENCE_KEY)
}

async function getGroupHomeExperiencePatch(groupId: string): Promise<HomeExperiencePatch | null> {
  return getStoredHomeExperiencePatchOptional(groupKey(groupId))
}

async function getDeviceHomeExperiencePatch(deviceId: string): Promise<HomeExperiencePatch | null> {
  return getStoredHomeExperiencePatchOptional(deviceKey(deviceId))
}

async function saveStoredHomeExperience(key: string, config: HomeExperienceResolvedConfig): Promise<void> {
  const safePatch = compactHomeExperiencePatch(normalizeHomeExperiencePatch(config))

  await prisma.appSetting.upsert({
    where: { key },
    update: { value: JSON.stringify(safePatch) },
    create: {
      key,
      value: JSON.stringify(safePatch),
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
      type: oneOf(entry.type, HOME_EXPERIENCE_MENU_TYPES, 'info_dialog'),
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

function normalizeSplash(value: unknown): HomeExperienceResolvedConfig['splash'] {
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

function normalizeSounds(value: unknown): HomeExperienceResolvedConfig['sounds'] {
  const source = isRecord(value) ? value : {}
  return {
    enableSelectionSound: safeBoolean(source.enableSelectionSound, FALLBACK_HOME_EXPERIENCE_CONFIG.sounds.enableSelectionSound),
    enableSplashSound: safeBoolean(source.enableSplashSound, FALLBACK_HOME_EXPERIENCE_CONFIG.sounds.enableSplashSound),
    selectionSoundUrl: safeString(source.selectionSoundUrl, ''),
  }
}

function normalizeSplashPatch(value: unknown): Partial<HomeExperienceResolvedConfig['splash']> {
  const source = isRecord(value) ? value : {}
  const patch: Partial<HomeExperienceResolvedConfig['splash']> = {}
  if (hasOwn(source, 'enabled')) patch.enabled = safeBoolean(source.enabled, FALLBACK_HOME_EXPERIENCE_CONFIG.splash.enabled)
  if (hasOwn(source, 'backgroundUrl')) patch.backgroundUrl = safeString(source.backgroundUrl, '')
  if (hasOwn(source, 'logoUrl')) patch.logoUrl = safeString(source.logoUrl, '')
  if (hasOwn(source, 'soundUrl')) patch.soundUrl = safeString(source.soundUrl, '')
  if (hasOwn(source, 'title')) patch.title = safeString(source.title, FALLBACK_HOME_EXPERIENCE_CONFIG.splash.title)
  if (hasOwn(source, 'subtitle')) patch.subtitle = safeString(source.subtitle, FALLBACK_HOME_EXPERIENCE_CONFIG.splash.subtitle)
  if (hasOwn(source, 'footerText')) patch.footerText = safeString(source.footerText, FALLBACK_HOME_EXPERIENCE_CONFIG.splash.footerText)
  if (hasOwn(source, 'loadingText')) patch.loadingText = safeString(source.loadingText, FALLBACK_HOME_EXPERIENCE_CONFIG.splash.loadingText)
  if (hasOwn(source, 'showSound')) patch.showSound = safeBoolean(source.showSound, FALLBACK_HOME_EXPERIENCE_CONFIG.splash.showSound)
  return patch
}

function normalizeSoundsPatch(value: unknown): Partial<HomeExperienceResolvedConfig['sounds']> {
  const source = isRecord(value) ? value : {}
  const patch: Partial<HomeExperienceResolvedConfig['sounds']> = {}
  if (hasOwn(source, 'enableSelectionSound')) patch.enableSelectionSound = safeBoolean(source.enableSelectionSound, FALLBACK_HOME_EXPERIENCE_CONFIG.sounds.enableSelectionSound)
  if (hasOwn(source, 'enableSplashSound')) patch.enableSplashSound = safeBoolean(source.enableSplashSound, FALLBACK_HOME_EXPERIENCE_CONFIG.sounds.enableSplashSound)
  if (hasOwn(source, 'selectionSoundUrl')) patch.selectionSoundUrl = safeString(source.selectionSoundUrl, '')
  return patch
}

function normalizeMenuPatches(value: unknown): HomeExperienceMenuPatch[] {
  const source = Array.isArray(value) ? value : []
  return source
    .filter((entry): entry is Record<string, unknown> => isRecord(entry))
    .map((entry, index) => {
      const patch: HomeExperienceMenuPatch = {
        id: safeString(entry.id, `menu_${index}`),
      }
      if (hasOwn(entry, 'enabled')) patch.enabled = safeBoolean(entry.enabled, true)
      if (hasOwn(entry, 'type')) patch.type = oneOf(entry.type, HOME_EXPERIENCE_MENU_TYPES, 'info_dialog')
      if (hasOwn(entry, 'title')) patch.title = safeString(entry.title, `MENU ${index + 1}`)
      if (hasOwn(entry, 'subtitle')) patch.subtitle = safeString(entry.subtitle, '')
      if (hasOwn(entry, 'icon')) patch.icon = safeString(entry.icon, 'info')
      if (hasOwn(entry, 'textColor')) patch.textColor = normalizeHexColor(entry.textColor, '#FFFFFF')
      if (hasOwn(entry, 'borderColor')) patch.borderColor = normalizeHexColor(entry.borderColor, '#FFFFFF')
      if (hasOwn(entry, 'accentColor')) patch.accentColor = normalizeHexColor(entry.accentColor, '#FFFFFF')
      if (hasOwn(entry, 'backgroundUrl')) patch.backgroundUrl = safeString(entry.backgroundUrl, '')
      if (hasOwn(entry, 'staticPageId')) patch.staticPageId = safeString(entry.staticPageId, '')
      if (hasOwn(entry, 'sortOrder')) patch.sortOrder = clampInt(entry.sortOrder, 0, 9999, index * 10)
      return patch
    })
}

function normalizeStaticPagePatches(value: unknown): HomeExperienceStaticPagePatch[] {
  const source = Array.isArray(value) ? value : []
  return source
    .filter((entry): entry is Record<string, unknown> => isRecord(entry))
    .map((entry, index) => {
      const patch: HomeExperienceStaticPagePatch = {
        id: safeString(entry.id, `page_${index}`),
      }
      if (hasOwn(entry, 'title')) patch.title = safeString(entry.title, `Halaman ${index + 1}`)
      if (hasOwn(entry, 'content')) patch.content = safeString(entry.content, '')
      return patch
    })
}

function mergeMenuPatches(baseMenus: HomeExperienceMenuItem[], patches?: HomeExperienceMenuPatch[]): HomeExperienceMenuItem[] {
  if (!patches || patches.length === 0) return baseMenus

  const baseMap = new Map(baseMenus.map((menu) => [menu.id, menu]))
  for (const patch of patches) {
    const existing = baseMap.get(patch.id)
    const fallback = FALLBACK_HOME_EXPERIENCE_CONFIG.menus.find((menu) => menu.id === patch.id)
    const seed = existing ?? fallback ?? createDefaultMenu(patch.id, baseMap.size)
    const merged = normalizeMenus([{ ...seed, ...patch }])[0]
    if (merged) baseMap.set(patch.id, merged)
  }
  return Array.from(baseMap.values()).sort((a, b) => a.sortOrder - b.sortOrder)
}

function mergeStaticPagePatches(basePages: HomeExperienceStaticPage[], patches?: HomeExperienceStaticPagePatch[]): HomeExperienceStaticPage[] {
  if (!patches || patches.length === 0) return basePages

  const baseMap = new Map(basePages.map((page) => [page.id, page]))
  for (const patch of patches) {
    const existing = baseMap.get(patch.id)
    const fallback = FALLBACK_HOME_EXPERIENCE_CONFIG.staticPages.find((page) => page.id === patch.id)
    const seed = existing ?? fallback ?? { id: patch.id, title: patch.id, content: '' }
    const merged = normalizeStaticPages([{ ...seed, ...patch }])[0]
    if (merged) baseMap.set(patch.id, merged)
  }
  return Array.from(baseMap.values())
}

function compactHomeExperiencePatch(patch: HomeExperiencePatch): HomeExperiencePatch {
  const compacted: HomeExperiencePatch = {}

  if (patch.revision !== undefined && patch.revision !== FALLBACK_HOME_EXPERIENCE_CONFIG.revision) compacted.revision = patch.revision
  if (patch.logoUrl !== undefined && patch.logoUrl !== FALLBACK_HOME_EXPERIENCE_CONFIG.logoUrl) compacted.logoUrl = patch.logoUrl
  if (patch.homeBackgroundUrl !== undefined && patch.homeBackgroundUrl !== FALLBACK_HOME_EXPERIENCE_CONFIG.homeBackgroundUrl) {
    compacted.homeBackgroundUrl = patch.homeBackgroundUrl
  }

  const compactMenus = compactMenuPatches(patch.menus)
  if (compactMenus.length > 0) compacted.menus = compactMenus

  const compactPages = compactStaticPagePatches(patch.staticPages)
  if (compactPages.length > 0) compacted.staticPages = compactPages

  const compactSplash = compactObjectPatch(patch.splash, FALLBACK_HOME_EXPERIENCE_CONFIG.splash)
  if (Object.keys(compactSplash).length > 0) compacted.splash = compactSplash

  const compactSounds = compactObjectPatch(patch.sounds, FALLBACK_HOME_EXPERIENCE_CONFIG.sounds)
  if (Object.keys(compactSounds).length > 0) compacted.sounds = compactSounds

  return compacted
}

function compactMenuPatches(patches?: HomeExperienceMenuPatch[]): HomeExperienceMenuPatch[] {
  if (!patches) return []

  return patches
    .map((patch, index) => {
      const fallback = FALLBACK_HOME_EXPERIENCE_CONFIG.menus.find((menu) => menu.id === patch.id) ?? createDefaultMenu(patch.id, index)
      const compact: HomeExperienceMenuPatch = { id: patch.id }
      if (patch.enabled !== undefined && patch.enabled !== fallback.enabled) compact.enabled = patch.enabled
      if (patch.type !== undefined && patch.type !== fallback.type) compact.type = patch.type
      if (patch.title !== undefined && patch.title !== fallback.title) compact.title = patch.title
      if (patch.subtitle !== undefined && patch.subtitle !== fallback.subtitle) compact.subtitle = patch.subtitle
      if (patch.icon !== undefined && patch.icon !== fallback.icon) compact.icon = patch.icon
      if (patch.textColor !== undefined && patch.textColor !== fallback.textColor) compact.textColor = patch.textColor
      if (patch.borderColor !== undefined && patch.borderColor !== fallback.borderColor) compact.borderColor = patch.borderColor
      if (patch.accentColor !== undefined && patch.accentColor !== fallback.accentColor) compact.accentColor = patch.accentColor
      if (patch.backgroundUrl !== undefined && patch.backgroundUrl !== fallback.backgroundUrl) compact.backgroundUrl = patch.backgroundUrl
      if (patch.staticPageId !== undefined && patch.staticPageId !== fallback.staticPageId) compact.staticPageId = patch.staticPageId
      if (patch.sortOrder !== undefined && patch.sortOrder !== fallback.sortOrder) compact.sortOrder = patch.sortOrder
      return compact
    })
    .filter((patch) => Object.keys(patch).length > 1)
}

function compactStaticPagePatches(patches?: HomeExperienceStaticPagePatch[]): HomeExperienceStaticPagePatch[] {
  if (!patches) return []

  return patches
    .map((patch, index) => {
      const fallback = FALLBACK_HOME_EXPERIENCE_CONFIG.staticPages.find((page) => page.id === patch.id)
        ?? { id: patch.id, title: `Halaman ${index + 1}`, content: '' }
      const compact: HomeExperienceStaticPagePatch = { id: patch.id }
      if (patch.title !== undefined && patch.title !== fallback.title) compact.title = patch.title
      if (patch.content !== undefined && patch.content !== fallback.content) compact.content = patch.content
      return compact
    })
    .filter((patch) => Object.keys(patch).length > 1)
}

function compactObjectPatch<T extends Record<string, unknown>>(patch: Partial<T> | undefined, fallback: T): Partial<T> {
  if (!patch) return {}
  const compact: Partial<T> = {}
  for (const key of Object.keys(patch) as Array<keyof T>) {
    if (patch[key] !== fallback[key]) compact[key] = patch[key]
  }
  return compact
}

function createDefaultMenu(id: string, index: number): HomeExperienceMenuItem {
  return {
    id,
    enabled: true,
    type: 'info_dialog',
    title: `MENU ${index + 1}`,
    subtitle: '',
    icon: 'info',
    textColor: '#FFFFFF',
    borderColor: '#FFFFFF',
    accentColor: '#FFFFFF',
    backgroundUrl: '',
    staticPageId: '',
    sortOrder: index * 10,
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

function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key)
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
