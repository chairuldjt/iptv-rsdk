import prisma from '@/lib/db'
import { getDeviceGroupForDevice } from '@/lib/deviceGroups'

const GLOBAL_HOME_EXPERIENCE_KEY = 'homeExperience.global'
const HOME_EXPERIENCE_MENU_TYPES = ['tv', 'education', 'entertainment', 'settings', 'info_dialog', 'konten', 'recommendations', 'favorites', 'search', 'app_drawer', 'launch_app'] as const

export type HomeExperienceScope = 'global' | 'group' | 'device' | 'profile'

export type HomeExperienceMenuType =
  | 'tv'
  | 'education'
  | 'entertainment'
  | 'settings'
  | 'info_dialog'
  | 'konten'
  | 'recommendations'
  | 'favorites'
  | 'search'
  | 'app_drawer'
  | 'launch_app'

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
  cardBackgroundColor: string
  backgroundUrl: string
  entertainmentItemId: number
  targetPackage?: string
  useAppIcon?: boolean
  sortOrder: number
  isPinned?: boolean
  disableGradient?: boolean
  tvClickBehavior?: 'channel_list' | 'last_played' | 'by_number' | 'most_played'
  tvClickChannelNumber?: number
  badge?: {
    text: string
    color: string
    position: 'top-right' | 'top-left' | 'bottom-right'
  }
}

export type HomeExperienceRunningTextItem = {
  id: string
  enabled: boolean
  text: string
}

export type StartScreenValue = 'live_tv' | 'category_list' | 'home_screen' | 'entertainment' | 'education'

export const START_SCREEN_VALUES: readonly StartScreenValue[] = ['live_tv', 'category_list', 'home_screen', 'entertainment', 'education']

// ── Overlay types ─────────────────────────────────────────────────────────────

export type HomeOverlayPosition =
  | 'top-left' | 'top-center' | 'top-right'
  | 'middle-left' | 'middle-center' | 'middle-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right'

export type HomeOverlayType = 'text' | 'logo' | 'app_logo' | 'clock' | 'date' | 'weather' | 'device_name' | 'channel_count'

export type HomeOverlayItem = {
  id: string
  enabled: boolean
  type: HomeOverlayType
  position: HomeOverlayPosition
  // text overlay
  text?: string
  // logo overlay
  imageUrl?: string
  imageWidth?: number   // dp
  imageHeight?: number  // dp
  // shared style
  textColor?: string
  textSize?: number     // sp
  fontWeight?: 'normal' | 'bold' | 'extrabold'
  backgroundColor?: string  // hex with alpha e.g. #80000000
  paddingH?: number     // dp
  paddingV?: number     // dp
  cornerRadius?: number // dp
  offsetX?: number      // dp, fine-tune from anchor
  offsetY?: number      // dp
  sortOrder: number
}

export const HOME_OVERLAY_TYPES: readonly HomeOverlayType[] = [
  'text', 'logo', 'app_logo', 'clock', 'date', 'weather', 'device_name', 'channel_count',
]

export const HOME_OVERLAY_POSITIONS: readonly HomeOverlayPosition[] = [
  'top-left', 'top-center', 'top-right',
  'middle-left', 'middle-center', 'middle-right',
  'bottom-left', 'bottom-center', 'bottom-right',
]

export type CarouselConfig = {
  // Card shape & size
  cardCornerRadius: number       // dp
  activeCardScale: number        // e.g. 1.22
  inactiveCardScale: number      // e.g. 0.90
  cardSpacing: number            // dp between cards

  // Non-selected global overrides
  showInactiveBorder: boolean
  inactiveBorderColor: string    // #AARRGGBB
  inactiveBorderWidth: number    // dp
  showInactiveGlow: boolean

  // Label box (TV CHANNEL / Live TV)
  showLabelBox: boolean
  labelBoxBgColor: string        // #AARRGGBB
  labelBoxCornerRadius: number   // dp
  labelTitleColor: string        // #AARRGGBB
  labelSubtitleColor: string     // #AARRGGBB
  labelTitleSize: number         // sp
  labelSubtitleSize: number      // sp

  // Navigation arrows
  showArrows: boolean
  arrowColor: string             // #AARRGGBB
  arrowBgColor: string           // #AARRGGBB

  // Dot indicator
  showDots: boolean
  dotActiveColor: string         // #AARRGGBB
  dotInactiveColor: string       // #AARRGGBB

  // Hint text
  showHintText: boolean
  
  disableInactiveGradient: boolean
}

export type ChannelBrowserConfig = {
  // Grid
  gridColumns: number // 0 = auto
  cardAspectRatio: number // e.g. 0.85
  cardPadding: number // dp
  // Logo
  logoSize: number // dp
  logoCornerRadius: number // dp
  // Colors — hex string e.g. "#RRGGBB" or "#AARRGGBB"
  cardBgColor: string
  cardBgFocusedColor: string
  cardBgCurrentColor: string
  borderColor: string
  borderFocusedColor: string
  channelNameColor: string
  channelNumberColor: string
  categoryBadgeColor: string
  categoryBadgeTextColor: string
  accentColor: string
  // Sizes
  channelNameSize: number // sp
  categoryBadgeSize: number // sp
  // Toggles
  showCategoryBadge: boolean
  showChannelNumber: boolean
  showNowPlayingBadge: boolean
}

export type HomeExperienceResolvedConfig = {
  revision: number
  logoUrl: string
  homeBackgroundUrl: string
  startScreen: StartScreenValue
  startScreenContentId: number | null
  menus: HomeExperienceMenuItem[]
  overlays: HomeOverlayItem[]
  menuHintText: string
  channelBrowser: ChannelBrowserConfig
  carousel: CarouselConfig
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
  displayScale: {
    smallScreenWidthDp: number
    smallScreenHeightDp: number
    ultraCompactWidthDp: number
    ultraCompactHeightDp: number
    forceDisplayMode: 'auto' | 'normal' | 'small' | 'ultra_compact'
    uiScaleMultiplier: number
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
  cardBackgroundColor?: string
  backgroundUrl?: string
  entertainmentItemId?: number
  targetPackage?: string
  useAppIcon?: boolean
  sortOrder?: number
  isPinned?: boolean
  disableGradient?: boolean
  tvClickBehavior?: 'channel_list' | 'last_played' | 'by_number' | 'most_played'
  tvClickChannelNumber?: number
  badge?: {
    text: string
    color: string
    position: 'top-right' | 'top-left' | 'bottom-right'
  }
}

export type HomeExperiencePatch = {
  revision?: number
  logoUrl?: string
  homeBackgroundUrl?: string
  startScreen?: StartScreenValue
  startScreenContentId?: number | null
  menus?: HomeExperienceMenuPatch[]
  overlays?: HomeOverlayItem[]
  menuHintText?: string
  channelBrowser?: Partial<ChannelBrowserConfig>
  carousel?: Partial<CarouselConfig>
  splash?: Partial<HomeExperienceResolvedConfig['splash']>
  sounds?: Partial<HomeExperienceResolvedConfig['sounds']>
  displayScale?: Partial<HomeExperienceResolvedConfig['displayScale']>
}

export type HomeExperienceConfig = HomeExperienceResolvedConfig

export const FALLBACK_HOME_EXPERIENCE_CONFIG: HomeExperienceResolvedConfig = {
  revision: 1,
  logoUrl: '',
  homeBackgroundUrl: '',
  startScreen: 'home_screen',
  startScreenContentId: null,
  menuHintText: 'Gunakan kiri/kanan remote untuk memutar menu, OK untuk memilih, tahan OK 3 detik untuk ubah nama STB',
  channelBrowser: {
    gridColumns: 0,
    cardAspectRatio: 0.85,
    cardPadding: 6,
    logoSize: 88,
    logoCornerRadius: 14,
    cardBgColor: '#2E18000000',
    cardBgFocusedColor: '#29FFE9A6',
    cardBgCurrentColor: '#247DD3FC',
    borderColor: '#29FFFFFF',
    borderFocusedColor: '#FFFFFFFF',
    channelNameColor: '#FFFFFFFF',
    channelNumberColor: '#FFFFE9A6',
    categoryBadgeColor: '#1CFFE9A6',
    categoryBadgeTextColor: '#FFFFE9A6',
    accentColor: '#FFFFE9A6',
    channelNameSize: 15,
    categoryBadgeSize: 9,
    showCategoryBadge: true,
    showChannelNumber: true,
    showNowPlayingBadge: true,
  },
  carousel: {
    cardCornerRadius: 24,
    activeCardScale: 1.22,
    inactiveCardScale: 0.90,
    cardSpacing: 18,
    showInactiveBorder: true,
    inactiveBorderColor: '#73FFFFFF',
    inactiveBorderWidth: 2,
    showInactiveGlow: true,
    showLabelBox: true,
    labelBoxBgColor: '#6B000000',
    labelBoxCornerRadius: 14,
    labelTitleColor: '#FFFFFFFF',
    labelSubtitleColor: '#D6FFFFFF',
    labelTitleSize: 17,
    labelSubtitleSize: 10,
    showArrows: true,
    arrowColor: '#FFFFFFFF',
    arrowBgColor: '#57000000',
    showDots: true,
    dotActiveColor: '#FFFFE9A6',
    dotInactiveColor: '#47FFFFFF',
    showHintText: true,
    disableInactiveGradient: false,
  },
  overlays: [
    // ── Kiri atas — mirrors HospitalityHeader left column ─────────────────────
    // verticalArrangement = spacedBy(4.dp), fontSize normal=17/12/10sp
    {
      id: 'overlay_welcome',
      enabled: true,
      type: 'text',
      position: 'top-left',
      text: 'Selamat Datang',
      imageUrl: '',
      imageWidth: 120,
      imageHeight: 60,
      textColor: '#FFFFFF',
      textSize: 17,
      fontWeight: 'bold',
      backgroundColor: '',
      paddingH: 0,
      paddingV: 0,
      cornerRadius: 0,
      offsetX: 0,
      offsetY: 0,
      sortOrder: 10,
    },
    {
      id: 'overlay_tagline',
      enabled: true,
      type: 'text',
      position: 'top-left',
      text: 'Premium IPTV Hospitality',
      imageUrl: '',
      imageWidth: 120,
      imageHeight: 60,
      textColor: '#E7D8A0',
      textSize: 12,
      fontWeight: 'normal',
      backgroundColor: '',
      paddingH: 0,
      paddingV: 0,
      cornerRadius: 0,
      offsetX: 0,
      offsetY: 25,
      sortOrder: 20,
    },
    {
      id: 'overlay_device_name',
      enabled: true,
      type: 'device_name',
      position: 'top-left',
      text: '',
      imageUrl: '',
      imageWidth: 120,
      imageHeight: 60,
      textColor: '#E0E0E0',
      textSize: 10,
      fontWeight: 'bold',
      backgroundColor: '',
      paddingH: 0,
      paddingV: 0,
      cornerRadius: 0,
      offsetX: 0,
      offsetY: 43,
      sortOrder: 30,
    },
    // ── Tengah atas — mirrors HospitalityHeader center column ─────────────────
    // logo 72dp + spacer 8dp = 80dp, title 22sp ~27dp, spacer implicit ~4dp
    {
      id: 'overlay_app_logo',
      enabled: true,
      type: 'app_logo',
      position: 'top-center',
      text: '',
      imageUrl: '',
      imageWidth: 72,
      imageHeight: 72,
      textColor: '#FFFFFF',
      textSize: 14,
      fontWeight: 'normal',
      backgroundColor: '',
      paddingH: 0,
      paddingV: 0,
      cornerRadius: 16,
      offsetX: 0,
      offsetY: 0,
      sortOrder: 35,
    },
    {
      id: 'overlay_app_title',
      enabled: true,
      type: 'text',
      position: 'top-center',
      text: 'Hospitality IPTV',
      imageUrl: '',
      imageWidth: 120,
      imageHeight: 60,
      textColor: '#FFE9A6',
      textSize: 22,
      fontWeight: 'extrabold',
      backgroundColor: '',
      paddingH: 0,
      paddingV: 0,
      cornerRadius: 0,
      offsetX: 0,
      offsetY: 80,
      sortOrder: 40,
    },
    {
      id: 'overlay_app_subtitle',
      enabled: true,
      type: 'text',
      position: 'top-center',
      text: 'Live TV \u2022 Education \u2022 Guest Services',
      imageUrl: '',
      imageWidth: 120,
      imageHeight: 60,
      textColor: '#E0E0E0',
      textSize: 11,
      fontWeight: 'normal',
      backgroundColor: '',
      paddingH: 0,
      paddingV: 0,
      cornerRadius: 0,
      offsetX: 0,
      offsetY: 107,
      sortOrder: 50,
    },
    // ── Kanan atas — mirrors HospitalityHeader right column ───────────────────
    // clock 30sp ~36dp, date 11sp ~14dp gap 4dp, weather 10sp gap 4dp
    {
      id: 'overlay_clock',
      enabled: true,
      type: 'clock',
      position: 'top-right',
      text: '',
      imageUrl: '',
      imageWidth: 120,
      imageHeight: 60,
      textColor: '#FFFFFF',
      textSize: 30,
      fontWeight: 'extrabold',
      backgroundColor: '',
      paddingH: 0,
      paddingV: 0,
      cornerRadius: 0,
      offsetX: 0,
      offsetY: 0,
      sortOrder: 60,
    },
    {
      id: 'overlay_date',
      enabled: true,
      type: 'date',
      position: 'top-right',
      text: '',
      imageUrl: '',
      imageWidth: 120,
      imageHeight: 60,
      textColor: '#D1D5DB',
      textSize: 11,
      fontWeight: 'normal',
      backgroundColor: '',
      paddingH: 0,
      paddingV: 0,
      cornerRadius: 0,
      offsetX: 0,
      offsetY: 38,
      sortOrder: 70,
    },
    {
      id: 'overlay_weather',
      enabled: true,
      type: 'weather',
      position: 'top-right',
      text: '',
      imageUrl: '',
      imageWidth: 120,
      imageHeight: 60,
      textColor: '#FFE9A6',
      textSize: 10,
      fontWeight: 'bold',
      backgroundColor: '',
      paddingH: 0,
      paddingV: 0,
      cornerRadius: 0,
      offsetX: 0,
      offsetY: 56,
      sortOrder: 80,
    },
  ],
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
      cardBackgroundColor: '',
      backgroundUrl: '',
      entertainmentItemId: 0,
      sortOrder: 10,
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
      cardBackgroundColor: '',
      backgroundUrl: '',
      entertainmentItemId: 0,
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
      cardBackgroundColor: '',
      backgroundUrl: '',
      entertainmentItemId: 0,
      sortOrder: 40,
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
      cardBackgroundColor: '',
      backgroundUrl: '',
      entertainmentItemId: 0,
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
      cardBackgroundColor: '',
      backgroundUrl: '',
      entertainmentItemId: 0,
      sortOrder: 60,
    },
    {
      id: 'app_drawer',
      enabled: true,
      type: 'app_drawer',
      title: 'SEMUA APLIKASI',
      subtitle: 'App Drawer',
      icon: 'apps',
      textColor: '#FFFFFF',
      borderColor: '#FCA5A5',
      accentColor: '#FCA5A5',
      cardBackgroundColor: '',
      backgroundUrl: '',
      entertainmentItemId: 0,
      sortOrder: 70,
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
  displayScale: {
    smallScreenWidthDp: 760,
    smallScreenHeightDp: 500,
    ultraCompactWidthDp: 600,
    ultraCompactHeightDp: 400,
    forceDisplayMode: 'auto',
    uiScaleMultiplier: 1.0,
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
  let globalPatch: HomeExperiencePatch | null
  if (globalProfileId && await isHomeExperienceProfileEnabled(globalProfileId)) {
    // A global profile is explicitly assigned. Use only its patch — if the
    // profile record is missing or empty, fall through to the default build
    // instead of silently picking up the raw `homeExperience.global` patch.
    globalPatch = await getHomeExperienceProfilePatch(globalProfileId)
  } else {
    globalPatch = await getGlobalHomeExperiencePatch()
  }
  if (isHomeExperiencePatchEmpty(globalPatch)) globalPatch = null

  const groupId = await getDeviceGroupForDevice(deviceId)
  let groupPatch: HomeExperiencePatch | null = null
  if (groupId) {
    const groupProfileMap = await getGroupProfileMap()
    const groupProfileId = groupProfileMap[groupId]
    if (groupProfileId && await isHomeExperienceProfileEnabled(groupProfileId)) {
      groupPatch = await getHomeExperienceProfilePatch(groupProfileId)
    } else {
      groupPatch = await getGroupHomeExperiencePatch(groupId)
    }
    if (isHomeExperiencePatchEmpty(groupPatch)) groupPatch = null
  }

  const deviceProfileMap = await getDeviceProfileMap()
  const deviceProfileId = deviceProfileMap[deviceId]
  let devicePatch: HomeExperiencePatch | null = null
  if (deviceProfileId && await isHomeExperienceProfileEnabled(deviceProfileId)) {
    devicePatch = await getHomeExperienceProfilePatch(deviceProfileId)
  } else {
    devicePatch = await getDeviceHomeExperiencePatch(deviceId)
  }
  if (isHomeExperiencePatchEmpty(devicePatch)) devicePatch = null

  const merged = applyHomeExperiencePatch(
    applyHomeExperiencePatch(
      applyHomeExperiencePatch(FALLBACK_HOME_EXPERIENCE_CONFIG, globalPatch),
      groupPatch
    ),
    devicePatch
  )

  // Final safety net: if every patch in the chain resolves to a home with no
  // visible content (e.g. all menus disabled), serve the pristine default build
  // so the device is never stranded with a blank UI.
  if (isHomeExperienceConfigEmpty(merged)) {
    return FALLBACK_HOME_EXPERIENCE_CONFIG
  }

  return merged
}

/**
 * A patch is considered empty when there is nothing meaningful to merge on top
 * of the fallback. Patches stored in AppSetting are already compacted on read
 * (see `compactHomeExperiencePatch`), so a key-less object means the profile
 * matches the default build exactly.
 */
export function isHomeExperiencePatchEmpty(patch: HomeExperiencePatch | null | undefined): boolean {
  if (!patch) return true
  return Object.keys(patch).length === 0
}

/**
 * A resolved config is "empty" when no menu would render — typically because
 * an admin disabled every menu in a profile. In that case we treat the profile
 * as inactive and the device should fall back to the default build.
 */
export function isHomeExperienceConfigEmpty(config: HomeExperienceResolvedConfig): boolean {
  return !config.menus.some((menu) => menu.enabled)
}

export function homeExperienceFromFormData(formData: FormData): HomeExperienceResolvedConfig {
  return normalizeHomeExperienceConfig({
    revision: Number.parseInt(String(formData.get('revision') || FALLBACK_HOME_EXPERIENCE_CONFIG.revision), 10),
    logoUrl: formData.get('logoUrl'),
    homeBackgroundUrl: formData.get('homeBackgroundUrl'),
    startScreen: formData.get('startScreen'),
    startScreenContentId: (() => {
      const v = formData.get('startScreenContentId')
      if (!v || v === '') return null
      const n = Number.parseInt(String(v), 10)
      return Number.isFinite(n) && n > 0 ? n : null
    })(),
    menus: parseJsonArray(formData.get('menusJson'), FALLBACK_HOME_EXPERIENCE_CONFIG.menus),
    overlays: parseJsonArray(formData.get('overlaysJson'), FALLBACK_HOME_EXPERIENCE_CONFIG.overlays),
    menuHintText: formData.get('menuHintText'),
    channelBrowser: (() => {
      const v = formData.get('channelBrowserJson')
      if (!v) return FALLBACK_HOME_EXPERIENCE_CONFIG.channelBrowser
      try { return JSON.parse(String(v)) } catch { return FALLBACK_HOME_EXPERIENCE_CONFIG.channelBrowser }
    })(),
    carousel: (() => {
      const v = formData.get('carouselJson')
      if (!v) return FALLBACK_HOME_EXPERIENCE_CONFIG.carousel
      try { return JSON.parse(String(v)) } catch { return FALLBACK_HOME_EXPERIENCE_CONFIG.carousel }
    })(),
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
    displayScale: {
      smallScreenWidthDp: formData.get('displayScale.smallScreenWidthDp'),
      smallScreenHeightDp: formData.get('displayScale.smallScreenHeightDp'),
      ultraCompactWidthDp: formData.get('displayScale.ultraCompactWidthDp'),
      ultraCompactHeightDp: formData.get('displayScale.ultraCompactHeightDp'),
      forceDisplayMode: formData.get('displayScale.forceDisplayMode'),
      uiScaleMultiplier: formData.get('displayScale.uiScaleMultiplier'),
    },
  })
}

export function normalizeHomeExperienceConfig(value: unknown): HomeExperienceResolvedConfig {
  const source = isRecord(value) ? value : {}

  return {
    revision: clampInt(source.revision, 1, 100_000, FALLBACK_HOME_EXPERIENCE_CONFIG.revision),
    logoUrl: safeString(source.logoUrl, ''),
    homeBackgroundUrl: safeString(source.homeBackgroundUrl, ''),
    startScreen: oneOf(source.startScreen, START_SCREEN_VALUES, FALLBACK_HOME_EXPERIENCE_CONFIG.startScreen),
    startScreenContentId: safeNullableInt(source.startScreenContentId),
    menus: normalizeMenus(source.menus),
    overlays: normalizeOverlays(source.overlays),
    menuHintText: safeString(source.menuHintText, FALLBACK_HOME_EXPERIENCE_CONFIG.menuHintText),
    channelBrowser: normalizeChannelBrowser(source.channelBrowser),
    carousel: normalizeCarousel(source.carousel),
    splash: normalizeSplash(source.splash),
    sounds: normalizeSounds(source.sounds),
    displayScale: normalizeDisplayScale(source.displayScale),
  }
}

export function normalizeHomeExperiencePatch(value: unknown): HomeExperiencePatch {
  const source = isRecord(value) ? value : {}
  const patch: HomeExperiencePatch = {}

  if (hasOwn(source, 'revision')) patch.revision = clampInt(source.revision, 1, 100_000, FALLBACK_HOME_EXPERIENCE_CONFIG.revision)
  if (hasOwn(source, 'logoUrl')) patch.logoUrl = safeString(source.logoUrl, '')
  if (hasOwn(source, 'homeBackgroundUrl')) patch.homeBackgroundUrl = safeString(source.homeBackgroundUrl, '')
  if (hasOwn(source, 'startScreen')) patch.startScreen = oneOf(source.startScreen, START_SCREEN_VALUES, FALLBACK_HOME_EXPERIENCE_CONFIG.startScreen)
  if (hasOwn(source, 'startScreenContentId')) patch.startScreenContentId = safeNullableInt(source.startScreenContentId)
  if (hasOwn(source, 'menus')) patch.menus = normalizeMenuPatches(source.menus)
  if (hasOwn(source, 'overlays')) patch.overlays = normalizeOverlays(source.overlays)
  if (hasOwn(source, 'menuHintText')) patch.menuHintText = safeString(source.menuHintText, FALLBACK_HOME_EXPERIENCE_CONFIG.menuHintText)
  if (hasOwn(source, 'splash')) patch.splash = normalizeSplashPatch(source.splash)
  if (hasOwn(source, 'sounds')) patch.sounds = normalizeSoundsPatch(source.sounds)
  if (hasOwn(source, 'displayScale')) patch.displayScale = normalizeDisplayScalePatch(source.displayScale)
  if (hasOwn(source, 'channelBrowser')) patch.channelBrowser = normalizeChannelBrowserPatch(source.channelBrowser)
  if (hasOwn(source, 'carousel')) patch.carousel = normalizeCarouselPatch(source.carousel)

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
    startScreen: patch.startScreen ?? base.startScreen,
    startScreenContentId: hasOwn(patch as Record<string, unknown>, 'startScreenContentId') ? patch.startScreenContentId : base.startScreenContentId,
    overlays: patch.overlays ?? base.overlays,
    menuHintText: patch.menuHintText ?? base.menuHintText,
    splash: {
      ...base.splash,
      ...(patch.splash ?? {}),
    },
    sounds: {
      ...base.sounds,
      ...(patch.sounds ?? {}),
    },
    displayScale: {
      ...base.displayScale,
      ...(patch.displayScale ?? {}),
    },
    channelBrowser: {
      ...base.channelBrowser,
      ...(patch.channelBrowser ?? {}),
    },
    carousel: {
      ...base.carousel,
      ...(patch.carousel ?? {}),
    },
    menus: mergeMenuPatches(base.menus, patch.menus),
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
  locked?: boolean
  enabled?: boolean
}

export type HomeExperienceProfileExport = {
  version: 1
  type: 'homeExperience'
  profile: HomeExperienceProfile
  config: HomeExperiencePatch
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

export async function cloneHomeExperienceProfile(profileId: string): Promise<HomeExperienceProfile | null> {
  const profiles = await getHomeExperienceProfiles()
  const source = profiles.find((p) => p.id === profileId)
  if (!source) return null

  const cloned: HomeExperienceProfile = {
    id: `hep_${Date.now()}`,
    name: `${source.name} (Copy)`,
    description: source.description,
    createdAt: new Date().toISOString(),
    locked: false,
  }

  profiles.push(cloned)
  await saveHomeExperienceProfiles(profiles)

  const sourceConfig = await getHomeExperienceProfileConfig(profileId)
  if (sourceConfig) {
    await saveStoredHomeExperience(profileDataKey(cloned.id), sourceConfig)
  }

  return cloned
}

export async function renameHomeExperienceProfile(
  profileId: string,
  newName: string
): Promise<void> {
  const profiles = await getHomeExperienceProfiles()
  await saveHomeExperienceProfiles(
    profiles.map((p) =>
      p.id === profileId ? { ...p, name: newName.trim() || p.name } : p
    )
  )
}

export async function exportHomeExperienceProfile(
  profileId: string
): Promise<HomeExperienceProfileExport | null> {
  const profiles = await getHomeExperienceProfiles()
  const profile = profiles.find((p) => p.id === profileId)
  if (!profile) return null

  const config = await getHomeExperienceProfilePatch(profileId)
  return {
    version: 1,
    type: 'homeExperience',
    profile,
    config: config ?? {},
  }
}

export async function importHomeExperienceProfile(
  data: HomeExperienceProfileExport
): Promise<HomeExperienceProfile | null> {
  if (data.version !== 1 || data.type !== 'homeExperience') return null

  const profiles = await getHomeExperienceProfiles()
  const newProfile: HomeExperienceProfile = {
    id: `hep_${Date.now()}`,
    name: data.profile.name || 'Imported Profile',
    description: data.profile.description || '',
    createdAt: new Date().toISOString(),
    locked: false,
  }

  profiles.push(newProfile)
  await saveHomeExperienceProfiles(profiles)

  if (data.config && Object.keys(data.config).length > 0) {
    const resolved = applyHomeExperiencePatch(FALLBACK_HOME_EXPERIENCE_CONFIG, data.config)
    await saveStoredHomeExperience(profileDataKey(newProfile.id), resolved)
  } else {
    await saveStoredHomeExperience(profileDataKey(newProfile.id), FALLBACK_HOME_EXPERIENCE_CONFIG)
  }

  return newProfile
}

export async function toggleHomeExperienceProfileLock(profileId: string): Promise<boolean> {
  const profiles = await getHomeExperienceProfiles()
  let newLocked = false
  await saveHomeExperienceProfiles(
    profiles.map((p) => {
      if (p.id === profileId) {
        newLocked = !p.locked
        return { ...p, locked: newLocked }
      }
      return p
    })
  )
  return newLocked
}

export async function unsetHomeExperienceGlobalProfile(): Promise<void> {
  await setGlobalProfileId(null)
}

export async function toggleHomeExperienceProfileEnabled(profileId: string): Promise<boolean> {
  const profiles = await getHomeExperienceProfiles()
  let newEnabled = false
  await saveHomeExperienceProfiles(
    profiles.map((p) => {
      if (p.id === profileId) {
        newEnabled = p.enabled === false ? true : false
        return { ...p, enabled: newEnabled }
      }
      return p
    })
  )
  return newEnabled
}

async function isHomeExperienceProfileEnabled(profileId: string): Promise<boolean> {
  const profiles = await getHomeExperienceProfiles()
  const profile = profiles.find((p) => p.id === profileId)
  return profile?.enabled !== false
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
      cardBackgroundColor: normalizeHexColor(entry.cardBackgroundColor, ''),
      backgroundUrl: safeString(entry.backgroundUrl, ''),
      entertainmentItemId: clampInt(entry.entertainmentItemId, 0, 1_000_000, 0),
      targetPackage: safeString(entry.targetPackage, ''),
      useAppIcon: safeBoolean(entry.useAppIcon, false),
      disableGradient: safeBoolean(entry.disableGradient, false),
      tvClickBehavior: oneOf(entry.tvClickBehavior, ['channel_list', 'last_played', 'by_number', 'most_played'] as const, 'channel_list'),
      tvClickChannelNumber: clampInt(entry.tvClickChannelNumber, 1, 9999, 1),
      sortOrder: clampInt(entry.sortOrder, 0, 9999, index * 10),
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder)
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

function normalizeDisplayScale(value: unknown): HomeExperienceResolvedConfig['displayScale'] {
  const source = isRecord(value) ? value : {}
  const d = FALLBACK_HOME_EXPERIENCE_CONFIG.displayScale
  return {
    smallScreenWidthDp: clampInt(source.smallScreenWidthDp, 400, 2000, d.smallScreenWidthDp),
    smallScreenHeightDp: clampInt(source.smallScreenHeightDp, 300, 2000, d.smallScreenHeightDp),
    ultraCompactWidthDp: clampInt(source.ultraCompactWidthDp, 300, 2000, d.ultraCompactWidthDp),
    ultraCompactHeightDp: clampInt(source.ultraCompactHeightDp, 200, 2000, d.ultraCompactHeightDp),
    forceDisplayMode: oneOf(source.forceDisplayMode, ['auto', 'normal', 'small', 'ultra_compact'] as const, d.forceDisplayMode),
    uiScaleMultiplier: clampFloat(source.uiScaleMultiplier, 0.5, 2.0, d.uiScaleMultiplier),
  }
}

function normalizeDisplayScalePatch(value: unknown): Partial<HomeExperienceResolvedConfig['displayScale']> {
  const source = isRecord(value) ? value : {}
  const patch: Partial<HomeExperienceResolvedConfig['displayScale']> = {}
  const d = FALLBACK_HOME_EXPERIENCE_CONFIG.displayScale
  if (hasOwn(source, 'smallScreenWidthDp')) patch.smallScreenWidthDp = clampInt(source.smallScreenWidthDp, 400, 2000, d.smallScreenWidthDp)
  if (hasOwn(source, 'smallScreenHeightDp')) patch.smallScreenHeightDp = clampInt(source.smallScreenHeightDp, 300, 2000, d.smallScreenHeightDp)
  if (hasOwn(source, 'ultraCompactWidthDp')) patch.ultraCompactWidthDp = clampInt(source.ultraCompactWidthDp, 300, 2000, d.ultraCompactWidthDp)
  if (hasOwn(source, 'ultraCompactHeightDp')) patch.ultraCompactHeightDp = clampInt(source.ultraCompactHeightDp, 200, 2000, d.ultraCompactHeightDp)
  if (hasOwn(source, 'forceDisplayMode')) patch.forceDisplayMode = oneOf(source.forceDisplayMode, ['auto', 'normal', 'small', 'ultra_compact'] as const, d.forceDisplayMode)
  if (hasOwn(source, 'uiScaleMultiplier')) patch.uiScaleMultiplier = clampFloat(source.uiScaleMultiplier, 0.5, 2.0, d.uiScaleMultiplier)
  return patch
}

function normalizeChannelBrowser(value: unknown): ChannelBrowserConfig {
  const source = isRecord(value) ? value : {}
  const d = FALLBACK_HOME_EXPERIENCE_CONFIG.channelBrowser
  return {
    gridColumns: clampInt(source.gridColumns, 0, 10, d.gridColumns),
    cardAspectRatio: clampFloat(source.cardAspectRatio, 0.5, 2.0, d.cardAspectRatio),
    cardPadding: clampInt(source.cardPadding, 0, 32, d.cardPadding),
    logoSize: clampInt(source.logoSize, 32, 200, d.logoSize),
    logoCornerRadius: clampInt(source.logoCornerRadius, 0, 50, d.logoCornerRadius),
    cardBgColor: normalizeHexColor(source.cardBgColor, d.cardBgColor),
    cardBgFocusedColor: normalizeHexColor(source.cardBgFocusedColor, d.cardBgFocusedColor),
    cardBgCurrentColor: normalizeHexColor(source.cardBgCurrentColor, d.cardBgCurrentColor),
    borderColor: normalizeHexColor(source.borderColor, d.borderColor),
    borderFocusedColor: normalizeHexColor(source.borderFocusedColor, d.borderFocusedColor),
    channelNameColor: normalizeHexColor(source.channelNameColor, d.channelNameColor),
    channelNumberColor: normalizeHexColor(source.channelNumberColor, d.channelNumberColor),
    categoryBadgeColor: normalizeHexColor(source.categoryBadgeColor, d.categoryBadgeColor),
    categoryBadgeTextColor: normalizeHexColor(source.categoryBadgeTextColor, d.categoryBadgeTextColor),
    accentColor: normalizeHexColor(source.accentColor, d.accentColor),
    channelNameSize: clampInt(source.channelNameSize, 8, 32, d.channelNameSize),
    categoryBadgeSize: clampInt(source.categoryBadgeSize, 6, 20, d.categoryBadgeSize),
    showCategoryBadge: safeBoolean(source.showCategoryBadge, d.showCategoryBadge),
    showChannelNumber: safeBoolean(source.showChannelNumber, d.showChannelNumber),
    showNowPlayingBadge: safeBoolean(source.showNowPlayingBadge, d.showNowPlayingBadge),
  }
}

function normalizeChannelBrowserPatch(value: unknown): Partial<ChannelBrowserConfig> {
  const source = isRecord(value) ? value : {}
  const patch: Partial<ChannelBrowserConfig> = {}
  const d = FALLBACK_HOME_EXPERIENCE_CONFIG.channelBrowser
  if (hasOwn(source, 'gridColumns')) patch.gridColumns = clampInt(source.gridColumns, 0, 10, d.gridColumns)
  if (hasOwn(source, 'cardAspectRatio')) patch.cardAspectRatio = clampFloat(source.cardAspectRatio, 0.5, 2.0, d.cardAspectRatio)
  if (hasOwn(source, 'cardPadding')) patch.cardPadding = clampInt(source.cardPadding, 0, 32, d.cardPadding)
  if (hasOwn(source, 'logoSize')) patch.logoSize = clampInt(source.logoSize, 32, 200, d.logoSize)
  if (hasOwn(source, 'logoCornerRadius')) patch.logoCornerRadius = clampInt(source.logoCornerRadius, 0, 50, d.logoCornerRadius)
  if (hasOwn(source, 'cardBgColor')) patch.cardBgColor = normalizeHexColor(source.cardBgColor, d.cardBgColor)
  if (hasOwn(source, 'cardBgFocusedColor')) patch.cardBgFocusedColor = normalizeHexColor(source.cardBgFocusedColor, d.cardBgFocusedColor)
  if (hasOwn(source, 'cardBgCurrentColor')) patch.cardBgCurrentColor = normalizeHexColor(source.cardBgCurrentColor, d.cardBgCurrentColor)
  if (hasOwn(source, 'borderColor')) patch.borderColor = normalizeHexColor(source.borderColor, d.borderColor)
  if (hasOwn(source, 'borderFocusedColor')) patch.borderFocusedColor = normalizeHexColor(source.borderFocusedColor, d.borderFocusedColor)
  if (hasOwn(source, 'channelNameColor')) patch.channelNameColor = normalizeHexColor(source.channelNameColor, d.channelNameColor)
  if (hasOwn(source, 'channelNumberColor')) patch.channelNumberColor = normalizeHexColor(source.channelNumberColor, d.channelNumberColor)
  if (hasOwn(source, 'categoryBadgeColor')) patch.categoryBadgeColor = normalizeHexColor(source.categoryBadgeColor, d.categoryBadgeColor)
  if (hasOwn(source, 'categoryBadgeTextColor')) patch.categoryBadgeTextColor = normalizeHexColor(source.categoryBadgeTextColor, d.categoryBadgeTextColor)
  if (hasOwn(source, 'accentColor')) patch.accentColor = normalizeHexColor(source.accentColor, d.accentColor)
  if (hasOwn(source, 'channelNameSize')) patch.channelNameSize = clampInt(source.channelNameSize, 8, 32, d.channelNameSize)
  if (hasOwn(source, 'categoryBadgeSize')) patch.categoryBadgeSize = clampInt(source.categoryBadgeSize, 6, 20, d.categoryBadgeSize)
  if (hasOwn(source, 'showCategoryBadge')) patch.showCategoryBadge = safeBoolean(source.showCategoryBadge, d.showCategoryBadge)
  if (hasOwn(source, 'showChannelNumber')) patch.showChannelNumber = safeBoolean(source.showChannelNumber, d.showChannelNumber)
  if (hasOwn(source, 'showNowPlayingBadge')) patch.showNowPlayingBadge = safeBoolean(source.showNowPlayingBadge, d.showNowPlayingBadge)
  return patch
}

function normalizeCarousel(value: unknown): CarouselConfig {
  const source = isRecord(value) ? value : {}
  const d = FALLBACK_HOME_EXPERIENCE_CONFIG.carousel
  return {
    cardCornerRadius: clampInt(source.cardCornerRadius, 0, 64, d.cardCornerRadius),
    activeCardScale: clampFloat(source.activeCardScale, 0.5, 2.0, d.activeCardScale),
    inactiveCardScale: clampFloat(source.inactiveCardScale, 0.3, 1.5, d.inactiveCardScale),
    cardSpacing: clampInt(source.cardSpacing, 0, 64, d.cardSpacing),
    showInactiveBorder: safeBoolean(source.showInactiveBorder, d.showInactiveBorder),
    inactiveBorderColor: normalizeHexColor(source.inactiveBorderColor, d.inactiveBorderColor),
    inactiveBorderWidth: clampInt(source.inactiveBorderWidth, 0, 8, d.inactiveBorderWidth),
    showInactiveGlow: safeBoolean(source.showInactiveGlow, d.showInactiveGlow),
    showLabelBox: safeBoolean(source.showLabelBox, d.showLabelBox),
    labelBoxBgColor: normalizeHexColor(source.labelBoxBgColor, d.labelBoxBgColor),
    labelBoxCornerRadius: clampInt(source.labelBoxCornerRadius, 0, 64, d.labelBoxCornerRadius),
    labelTitleColor: normalizeHexColor(source.labelTitleColor, d.labelTitleColor),
    labelSubtitleColor: normalizeHexColor(source.labelSubtitleColor, d.labelSubtitleColor),
    labelTitleSize: clampInt(source.labelTitleSize, 8, 40, d.labelTitleSize),
    labelSubtitleSize: clampInt(source.labelSubtitleSize, 6, 32, d.labelSubtitleSize),
    showArrows: safeBoolean(source.showArrows, d.showArrows),
    arrowColor: normalizeHexColor(source.arrowColor, d.arrowColor),
    arrowBgColor: normalizeHexColor(source.arrowBgColor, d.arrowBgColor),
    showDots: safeBoolean(source.showDots, d.showDots),
    dotActiveColor: normalizeHexColor(source.dotActiveColor, d.dotActiveColor),
    dotInactiveColor: normalizeHexColor(source.dotInactiveColor, d.dotInactiveColor),
    showHintText: safeBoolean(source.showHintText, d.showHintText),
    disableInactiveGradient: safeBoolean(source.disableInactiveGradient, d.disableInactiveGradient),
  }
}

function normalizeCarouselPatch(value: unknown): Partial<CarouselConfig> {
  const source = isRecord(value) ? value : {}
  const patch: Partial<CarouselConfig> = {}
  const d = FALLBACK_HOME_EXPERIENCE_CONFIG.carousel
  if (hasOwn(source, 'cardCornerRadius')) patch.cardCornerRadius = clampInt(source.cardCornerRadius, 0, 64, d.cardCornerRadius)
  if (hasOwn(source, 'activeCardScale')) patch.activeCardScale = clampFloat(source.activeCardScale, 0.5, 2.0, d.activeCardScale)
  if (hasOwn(source, 'inactiveCardScale')) patch.inactiveCardScale = clampFloat(source.inactiveCardScale, 0.3, 1.5, d.inactiveCardScale)
  if (hasOwn(source, 'cardSpacing')) patch.cardSpacing = clampInt(source.cardSpacing, 0, 64, d.cardSpacing)
  if (hasOwn(source, 'showInactiveBorder')) patch.showInactiveBorder = safeBoolean(source.showInactiveBorder, d.showInactiveBorder)
  if (hasOwn(source, 'inactiveBorderColor')) patch.inactiveBorderColor = normalizeHexColor(source.inactiveBorderColor, d.inactiveBorderColor)
  if (hasOwn(source, 'inactiveBorderWidth')) patch.inactiveBorderWidth = clampInt(source.inactiveBorderWidth, 0, 8, d.inactiveBorderWidth)
  if (hasOwn(source, 'showInactiveGlow')) patch.showInactiveGlow = safeBoolean(source.showInactiveGlow, d.showInactiveGlow)
  if (hasOwn(source, 'showLabelBox')) patch.showLabelBox = safeBoolean(source.showLabelBox, d.showLabelBox)
  if (hasOwn(source, 'labelBoxBgColor')) patch.labelBoxBgColor = normalizeHexColor(source.labelBoxBgColor, d.labelBoxBgColor)
  if (hasOwn(source, 'labelBoxCornerRadius')) patch.labelBoxCornerRadius = clampInt(source.labelBoxCornerRadius, 0, 64, d.labelBoxCornerRadius)
  if (hasOwn(source, 'labelTitleColor')) patch.labelTitleColor = normalizeHexColor(source.labelTitleColor, d.labelTitleColor)
  if (hasOwn(source, 'labelSubtitleColor')) patch.labelSubtitleColor = normalizeHexColor(source.labelSubtitleColor, d.labelSubtitleColor)
  if (hasOwn(source, 'labelTitleSize')) patch.labelTitleSize = clampInt(source.labelTitleSize, 8, 40, d.labelTitleSize)
  if (hasOwn(source, 'labelSubtitleSize')) patch.labelSubtitleSize = clampInt(source.labelSubtitleSize, 6, 32, d.labelSubtitleSize)
  if (hasOwn(source, 'showArrows')) patch.showArrows = safeBoolean(source.showArrows, d.showArrows)
  if (hasOwn(source, 'arrowColor')) patch.arrowColor = normalizeHexColor(source.arrowColor, d.arrowColor)
  if (hasOwn(source, 'arrowBgColor')) patch.arrowBgColor = normalizeHexColor(source.arrowBgColor, d.arrowBgColor)
  if (hasOwn(source, 'showDots')) patch.showDots = safeBoolean(source.showDots, d.showDots)
  if (hasOwn(source, 'dotActiveColor')) patch.dotActiveColor = normalizeHexColor(source.dotActiveColor, d.dotActiveColor)
  if (hasOwn(source, 'dotInactiveColor')) patch.dotInactiveColor = normalizeHexColor(source.dotInactiveColor, d.dotInactiveColor)
  if (hasOwn(source, 'showHintText')) patch.showHintText = safeBoolean(source.showHintText, d.showHintText)
  if (hasOwn(source, 'disableInactiveGradient')) patch.disableInactiveGradient = safeBoolean(source.disableInactiveGradient, d.disableInactiveGradient)
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
      if (hasOwn(entry, 'cardBackgroundColor')) patch.cardBackgroundColor = normalizeHexColor(entry.cardBackgroundColor, '')
      if (hasOwn(entry, 'backgroundUrl')) patch.backgroundUrl = safeString(entry.backgroundUrl, '')
      if (hasOwn(entry, 'entertainmentItemId')) patch.entertainmentItemId = clampInt(entry.entertainmentItemId, 0, 1_000_000, 0)
      if (hasOwn(entry, 'targetPackage')) patch.targetPackage = safeString(entry.targetPackage, '')
      if (hasOwn(entry, 'useAppIcon')) patch.useAppIcon = safeBoolean(entry.useAppIcon, false)
      if (hasOwn(entry, 'disableGradient')) patch.disableGradient = safeBoolean(entry.disableGradient, false)
      if (hasOwn(entry, 'tvClickBehavior')) patch.tvClickBehavior = oneOf(entry.tvClickBehavior, ['channel_list', 'last_played', 'by_number', 'most_played'] as const, 'channel_list')
      if (hasOwn(entry, 'tvClickChannelNumber')) patch.tvClickChannelNumber = clampInt(entry.tvClickChannelNumber, 1, 9999, 1)
      if (hasOwn(entry, 'sortOrder')) patch.sortOrder = clampInt(entry.sortOrder, 0, 9999, index * 10)
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

function compactHomeExperiencePatch(patch: HomeExperiencePatch): HomeExperiencePatch {
  const compacted: HomeExperiencePatch = {}

  if (patch.revision !== undefined && patch.revision !== FALLBACK_HOME_EXPERIENCE_CONFIG.revision) compacted.revision = patch.revision
  if (patch.logoUrl !== undefined && patch.logoUrl !== FALLBACK_HOME_EXPERIENCE_CONFIG.logoUrl) compacted.logoUrl = patch.logoUrl
  if (patch.homeBackgroundUrl !== undefined && patch.homeBackgroundUrl !== FALLBACK_HOME_EXPERIENCE_CONFIG.homeBackgroundUrl) {
    compacted.homeBackgroundUrl = patch.homeBackgroundUrl
  }
  if (patch.startScreen !== undefined && patch.startScreen !== FALLBACK_HOME_EXPERIENCE_CONFIG.startScreen) compacted.startScreen = patch.startScreen
  if (patch.startScreenContentId !== undefined && patch.startScreenContentId !== FALLBACK_HOME_EXPERIENCE_CONFIG.startScreenContentId) compacted.startScreenContentId = patch.startScreenContentId

  const compactMenus = compactMenuPatches(patch.menus)
  if (compactMenus.length > 0) compacted.menus = compactMenus

  // Overlays: store as-is when non-empty (they are always fully replaced, not merged)
  if (patch.overlays !== undefined && patch.overlays.length > 0) compacted.overlays = patch.overlays

  if (patch.menuHintText !== undefined && patch.menuHintText !== FALLBACK_HOME_EXPERIENCE_CONFIG.menuHintText) {
    compacted.menuHintText = patch.menuHintText
  }

  const compactSplash = compactObjectPatch(patch.splash, FALLBACK_HOME_EXPERIENCE_CONFIG.splash)
  if (Object.keys(compactSplash).length > 0) compacted.splash = compactSplash

  const compactSounds = compactObjectPatch(patch.sounds, FALLBACK_HOME_EXPERIENCE_CONFIG.sounds)
  if (Object.keys(compactSounds).length > 0) compacted.sounds = compactSounds

  const compactDisplayScale = compactObjectPatch(patch.displayScale, FALLBACK_HOME_EXPERIENCE_CONFIG.displayScale)
  if (Object.keys(compactDisplayScale).length > 0) compacted.displayScale = compactDisplayScale

  const compactChannelBrowser = compactObjectPatch(patch.channelBrowser, FALLBACK_HOME_EXPERIENCE_CONFIG.channelBrowser)
  if (Object.keys(compactChannelBrowser).length > 0) compacted.channelBrowser = compactChannelBrowser

  const compactCarousel = compactObjectPatch(patch.carousel, FALLBACK_HOME_EXPERIENCE_CONFIG.carousel)
  if (Object.keys(compactCarousel).length > 0) compacted.carousel = compactCarousel

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
      if (patch.cardBackgroundColor !== undefined && patch.cardBackgroundColor !== fallback.cardBackgroundColor) compact.cardBackgroundColor = patch.cardBackgroundColor
      if (patch.backgroundUrl !== undefined && patch.backgroundUrl !== fallback.backgroundUrl) compact.backgroundUrl = patch.backgroundUrl
      if (patch.entertainmentItemId !== undefined && patch.entertainmentItemId !== fallback.entertainmentItemId) compact.entertainmentItemId = patch.entertainmentItemId
      if (patch.targetPackage !== undefined && patch.targetPackage !== (fallback.targetPackage ?? '')) compact.targetPackage = patch.targetPackage
      if (patch.useAppIcon !== undefined && patch.useAppIcon !== (fallback.useAppIcon ?? false)) compact.useAppIcon = patch.useAppIcon
      if (patch.disableGradient !== undefined && patch.disableGradient !== (fallback.disableGradient ?? false)) compact.disableGradient = patch.disableGradient
      if (patch.tvClickBehavior !== undefined && patch.tvClickBehavior !== 'channel_list') compact.tvClickBehavior = patch.tvClickBehavior
      if (patch.tvClickChannelNumber !== undefined && patch.tvClickChannelNumber !== 1) compact.tvClickChannelNumber = patch.tvClickChannelNumber
      if (patch.sortOrder !== undefined && patch.sortOrder !== fallback.sortOrder) compact.sortOrder = patch.sortOrder
      return compact
    })
    .filter((patch) => Object.keys(patch).length > 1)
}

function normalizeOverlays(value: unknown): HomeOverlayItem[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((entry): entry is Record<string, unknown> => isRecord(entry))
    .map((entry, index) => ({
      id: safeString(entry.id, `overlay_${index}`),
      enabled: safeBoolean(entry.enabled, true),
      type: oneOf(entry.type, HOME_OVERLAY_TYPES, 'text'),
      position: oneOf(entry.position, HOME_OVERLAY_POSITIONS, 'top-left'),
      text: safeString(entry.text, ''),
      imageUrl: safeString(entry.imageUrl, ''),
      imageWidth: clampInt(entry.imageWidth, 16, 800, 120),
      imageHeight: clampInt(entry.imageHeight, 16, 600, 60),
      textColor: normalizeHexColor(entry.textColor, '#FFFFFF'),
      textSize: clampInt(entry.textSize, 8, 72, 14),
      fontWeight: oneOf(entry.fontWeight, ['normal', 'bold', 'extrabold'] as const, 'normal'),
      backgroundColor: safeString(entry.backgroundColor, ''),
      paddingH: clampInt(entry.paddingH, 0, 120, 8),
      paddingV: clampInt(entry.paddingV, 0, 120, 4),
      cornerRadius: clampInt(entry.cornerRadius, 0, 64, 6),
      offsetX: typeof entry.offsetX === 'number' ? Math.max(-500, Math.min(500, Math.floor(entry.offsetX))) : 0,
      offsetY: typeof entry.offsetY === 'number' ? Math.max(-500, Math.min(500, Math.floor(entry.offsetY))) : 0,
      sortOrder: clampInt(entry.sortOrder, 0, 9999, index * 10),
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder)
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
    cardBackgroundColor: '',
    backgroundUrl: '',
    entertainmentItemId: 0,
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

function safeNullableInt(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
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
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) || /^#[0-9a-fA-F]{8}$/.test(trimmed) ? trimmed.toUpperCase() : fallback
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(min, Math.min(max, Math.floor(parsed)))
}

function clampFloat(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''))
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(min, Math.min(max, parsed))
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && allowed.includes(value as T) ? (value as T) : fallback
}

/**
 * Rewrite every relative `/uploads/...` URL inside a resolved home experience
 * config to an absolute URL using the supplied public origin. The Android STB
 * client passes the URL straight to Coil's `AsyncImage`, which silently fails
 * on path-only inputs and leaves the surface blank — see the bug report where
 * a uploaded TV menu background rendered as a white screen on the device.
 *
 * Server-side absolutisation also covers splash background, splash logo,
 * splash sound, home background, and the selection sound URL with no extra
 * client work.
 */
export function absolutizeHomeExperienceUrls(
  config: HomeExperienceResolvedConfig,
  origin: string
): HomeExperienceResolvedConfig {
  const trimmedOrigin = (origin || '').replace(/\/$/, '')
  if (!trimmedOrigin) return config

  const rewrite = (value: string): string => {
    if (!value) return value
    return value.startsWith('/') ? `${trimmedOrigin}${value}` : value
  }

  return {
    ...config,
    logoUrl: rewrite(config.logoUrl),
    homeBackgroundUrl: rewrite(config.homeBackgroundUrl),
    menus: config.menus.map((menu) => ({
      ...menu,
      backgroundUrl: rewrite(menu.backgroundUrl),
    })),
    overlays: config.overlays.map((overlay) => ({
      ...overlay,
      imageUrl: rewrite(overlay.imageUrl ?? ''),
    })),
    splash: {
      ...config.splash,
      backgroundUrl: rewrite(config.splash.backgroundUrl),
      logoUrl: rewrite(config.splash.logoUrl),
      soundUrl: rewrite(config.splash.soundUrl),
    },
    sounds: {
      ...config.sounds,
      selectionSoundUrl: rewrite(config.sounds.selectionSoundUrl),
    },
  }
}
