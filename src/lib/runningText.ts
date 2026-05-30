import prisma from '@/lib/db'
import { getDeviceGroupForDevice } from '@/lib/deviceGroups'
import type { HomeExperienceRunningTextItem } from '@/lib/homeExperience'

export type RunningTextProfile = {
  id: string
  name: string
  description: string
  createdAt: string
  locked?: boolean
  enabled?: boolean
}

export type RunningTextProfileExport = {
  version: 1
  type: 'runningText'
  profile: RunningTextProfile
  config: RunningTextConfig
}

export type RunningTextStyle = {
  fontFamily: string
  fontSize: number          // px (10–120)
  fontWeight: 'normal' | 'bold' | 'bolder' | 'lighter'
  fontStyle: 'normal' | 'italic'
  textColor: string         // hex color
  bgColor: string           // hex color
  bgOpacity: number         // 0–100 (%)
  position: 'bottom' | 'top'
  direction: 'left' | 'right'
  paddingY: number          // px (0–60)
  separator: string         // character(s) between messages
  textShadow: boolean
  textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize'
}

export const FALLBACK_RUNNING_TEXT_STYLE: RunningTextStyle = {
  fontFamily: 'sans-serif',
  fontSize: 24,
  fontWeight: 'normal',
  fontStyle: 'normal',
  textColor: '#FFF3C7',
  bgColor: '#121A24',
  bgOpacity: 88,
  position: 'bottom',
  direction: 'left',
  paddingY: 8,
  separator: '   |   ',
  textShadow: false,
  textTransform: 'none',
}

export type RunningTextConfig = {
  enabled: boolean
  visibleCount: number
  rotationSeconds: number
  displaySeconds: number
  items: HomeExperienceRunningTextItem[]
  style: RunningTextStyle
}

export const FALLBACK_RUNNING_TEXT_CONFIG: RunningTextConfig = {
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
  style: FALLBACK_RUNNING_TEXT_STYLE,
}

const RUNNING_PROFILES_META_KEY = 'runningText.profiles'
const RUNNING_GLOBAL_PROFILE_ID_KEY = 'runningText.globalProfileId'
const RUNNING_GROUP_PROFILE_MAP_KEY = 'runningText.groupProfileMap'
const RUNNING_DEVICE_PROFILE_MAP_KEY = 'runningText.deviceProfileMap'

function runningProfileDataKey(profileId: string): string {
  return `runningText.profile.${profileId}`
}

export async function getRunningTextProfiles(): Promise<RunningTextProfile[]> {
  const setting = await prisma.appSetting.findUnique({ where: { key: RUNNING_PROFILES_META_KEY } })
  if (!setting?.value) return []
  try {
    const arr = JSON.parse(setting.value)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

async function saveRunningTextProfiles(profiles: RunningTextProfile[]): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key: RUNNING_PROFILES_META_KEY },
    update: { value: JSON.stringify(profiles) },
    create: { key: RUNNING_PROFILES_META_KEY, value: JSON.stringify(profiles) },
  })
}

export async function getRunningTextProfileConfig(profileId: string): Promise<RunningTextConfig | null> {
  const setting = await prisma.appSetting.findUnique({ where: { key: runningProfileDataKey(profileId) } })
  if (!setting?.value) return null
  try {
    return normalizeRunningTextConfig(JSON.parse(setting.value))
  } catch {
    return null
  }
}

export async function createRunningTextProfile(input: {
  name: string
  description?: string
}): Promise<RunningTextProfile> {
  const profiles = await getRunningTextProfiles()
  const profile: RunningTextProfile = {
    id: `rtp_${Date.now()}`,
    name: input.name.trim() || 'Untitled Running Text Profile',
    description: (input.description || '').trim(),
    createdAt: new Date().toISOString(),
  }
  profiles.push(profile)
  await saveRunningTextProfiles(profiles)
  await saveRunningTextProfileConfig(profile.id, FALLBACK_RUNNING_TEXT_CONFIG)
  return profile
}

export async function updateRunningTextProfileMeta(
  profileId: string,
  input: { name: string; description: string }
): Promise<void> {
  const profiles = await getRunningTextProfiles()
  await saveRunningTextProfiles(
    profiles.map((p) =>
      p.id === profileId
        ? { ...p, name: input.name.trim() || p.name, description: input.description.trim() }
        : p
    )
  )
}

export async function saveRunningTextProfileConfig(
  profileId: string,
  config: RunningTextConfig
): Promise<void> {
  const safeConfig = normalizeRunningTextConfig(config)
  await prisma.appSetting.upsert({
    where: { key: runningProfileDataKey(profileId) },
    update: { value: JSON.stringify(safeConfig) },
    create: { key: runningProfileDataKey(profileId), value: JSON.stringify(safeConfig) },
  })
}

export async function deleteRunningTextProfile(profileId: string): Promise<void> {
  const profiles = await getRunningTextProfiles()
  await saveRunningTextProfiles(profiles.filter((p) => p.id !== profileId))

  await prisma.appSetting.deleteMany({ where: { key: runningProfileDataKey(profileId) } })

  const globalId = await getRunningGlobalProfileId()
  if (globalId === profileId) await setRunningGlobalProfileId(null)

  const groupMap = await getRunningTextGroupProfileMap()
  await saveProfileMap(
    RUNNING_GROUP_PROFILE_MAP_KEY,
    Object.fromEntries(Object.entries(groupMap).filter(([, pid]) => pid !== profileId))
  )

  const deviceMap = await getRunningTextDeviceProfileMap()
  await saveProfileMap(
    RUNNING_DEVICE_PROFILE_MAP_KEY,
    Object.fromEntries(Object.entries(deviceMap).filter(([, pid]) => pid !== profileId))
  )
}

export async function getRunningGlobalProfileId(): Promise<string | null> {
  const setting = await prisma.appSetting.findUnique({ where: { key: RUNNING_GLOBAL_PROFILE_ID_KEY } })
  return setting?.value?.trim() || null
}

export async function setRunningGlobalProfileId(profileId: string | null): Promise<void> {
  if (!profileId) {
    await prisma.appSetting.deleteMany({ where: { key: RUNNING_GLOBAL_PROFILE_ID_KEY } })
    return
  }
  await prisma.appSetting.upsert({
    where: { key: RUNNING_GLOBAL_PROFILE_ID_KEY },
    update: { value: profileId },
    create: { key: RUNNING_GLOBAL_PROFILE_ID_KEY, value: profileId },
  })
}

export async function getRunningTextGroupProfileMap(): Promise<Record<string, string>> {
  return loadProfileMap(RUNNING_GROUP_PROFILE_MAP_KEY)
}

export async function getRunningTextDeviceProfileMap(): Promise<Record<string, string>> {
  return loadProfileMap(RUNNING_DEVICE_PROFILE_MAP_KEY)
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

export async function assignRunningTextProfileToGroup(groupId: string, profileId: string | null): Promise<void> {
  const map = await getRunningTextGroupProfileMap()
  if (!profileId) {
    delete map[groupId]
  } else {
    map[groupId] = profileId
  }
  await saveProfileMap(RUNNING_GROUP_PROFILE_MAP_KEY, map)
}

export async function assignRunningTextProfileToDevice(deviceId: string, profileId: string | null): Promise<void> {
  const map = await getRunningTextDeviceProfileMap()
  if (!profileId) {
    delete map[deviceId]
  } else {
    map[deviceId] = profileId
  }
  await saveProfileMap(RUNNING_DEVICE_PROFILE_MAP_KEY, map)
}

export async function cloneRunningTextProfile(profileId: string): Promise<RunningTextProfile | null> {
  const profiles = await getRunningTextProfiles()
  const source = profiles.find((p) => p.id === profileId)
  if (!source) return null

  const cloned: RunningTextProfile = {
    id: `rtp_${Date.now()}`,
    name: `${source.name} (Copy)`,
    description: source.description,
    createdAt: new Date().toISOString(),
    locked: false,
  }

  profiles.push(cloned)
  await saveRunningTextProfiles(profiles)

  const sourceConfig = await getRunningTextProfileConfig(profileId)
  if (sourceConfig) {
    await saveRunningTextProfileConfig(cloned.id, sourceConfig)
  }

  return cloned
}

export async function renameRunningTextProfile(
  profileId: string,
  newName: string
): Promise<void> {
  const profiles = await getRunningTextProfiles()
  await saveRunningTextProfiles(
    profiles.map((p) =>
      p.id === profileId ? { ...p, name: newName.trim() || p.name } : p
    )
  )
}

export async function exportRunningTextProfile(
  profileId: string
): Promise<RunningTextProfileExport | null> {
  const profiles = await getRunningTextProfiles()
  const profile = profiles.find((p) => p.id === profileId)
  if (!profile) return null

  const config = await getRunningTextProfileConfig(profileId)
  return {
    version: 1,
    type: 'runningText',
    profile,
    config: config ?? FALLBACK_RUNNING_TEXT_CONFIG,
  }
}

export async function importRunningTextProfile(
  data: RunningTextProfileExport
): Promise<RunningTextProfile | null> {
  if (data.version !== 1 || data.type !== 'runningText') return null

  const profiles = await getRunningTextProfiles()
  const newProfile: RunningTextProfile = {
    id: `rtp_${Date.now()}`,
    name: data.profile.name || 'Imported Profile',
    description: data.profile.description || '',
    createdAt: new Date().toISOString(),
    locked: false,
  }

  profiles.push(newProfile)
  await saveRunningTextProfiles(profiles)

  const safeConfig = normalizeRunningTextConfig(data.config ?? FALLBACK_RUNNING_TEXT_CONFIG)
  await saveRunningTextProfileConfig(newProfile.id, safeConfig)

  return newProfile
}

export async function toggleRunningTextProfileLock(profileId: string): Promise<boolean> {
  const profiles = await getRunningTextProfiles()
  let newLocked = false
  await saveRunningTextProfiles(
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

export async function unsetRunningGlobalProfile(): Promise<void> {
  await setRunningGlobalProfileId(null)
}

export async function toggleRunningTextProfileEnabled(profileId: string): Promise<boolean> {
  const profiles = await getRunningTextProfiles()
  let newEnabled = false
  await saveRunningTextProfiles(
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

async function isRunningProfileEnabled(profileId: string): Promise<boolean> {
  const profiles = await getRunningTextProfiles()
  const profile = profiles.find((p) => p.id === profileId)
  return profile?.enabled !== false
}

export async function resolveEffectiveRunningText(deviceId: string): Promise<RunningTextConfig> {
  // 1. Global Profile
  const globalProfileId = await getRunningGlobalProfileId()
  const globalConfig = globalProfileId && await isRunningProfileEnabled(globalProfileId)
    ? (await getRunningTextProfileConfig(globalProfileId))
    : null

  // 2. Group Profile
  const groupId = await getDeviceGroupForDevice(deviceId)
  let groupConfig: RunningTextConfig | null = null
  if (groupId) {
    const groupProfileMap = await getRunningTextGroupProfileMap()
    const groupProfileId = groupProfileMap[groupId]
    if (groupProfileId && await isRunningProfileEnabled(groupProfileId)) {
      groupConfig = await getRunningTextProfileConfig(groupProfileId)
    }
  }

  // 3. Device Profile
  const deviceProfileMap = await getRunningTextDeviceProfileMap()
  const deviceProfileId = deviceProfileMap[deviceId]
  const deviceConfig = deviceProfileId && await isRunningProfileEnabled(deviceProfileId)
    ? await getRunningTextProfileConfig(deviceProfileId)
    : null

  const base = globalConfig || FALLBACK_RUNNING_TEXT_CONFIG
  const group = groupConfig || null
  const device = deviceConfig || null

  // Merge: Global -> Group -> Device
  return normalizeRunningTextConfig({
    ...base,
    ...group,
    ...device,
    items: device?.items || group?.items || base.items,
    style: device?.style || group?.style || base.style,
  })
}

function normalizeRunningTextStyle(value: unknown): RunningTextStyle {
  if (typeof value !== 'object' || value === null) return FALLBACK_RUNNING_TEXT_STYLE
  const s = value as Record<string, unknown>
  const VALID_FONT_WEIGHTS = ['normal', 'bold', 'bolder', 'lighter'] as const
  const VALID_FONT_STYLES = ['normal', 'italic'] as const
  const VALID_POSITIONS = ['bottom', 'top'] as const
  const VALID_DIRECTIONS = ['left', 'right'] as const
  const VALID_TEXT_TRANSFORMS = ['none', 'uppercase', 'lowercase', 'capitalize'] as const

  return {
    fontFamily: typeof s.fontFamily === 'string' && s.fontFamily.trim() ? s.fontFamily.trim() : FALLBACK_RUNNING_TEXT_STYLE.fontFamily,
    fontSize: clamp(s.fontSize, 10, 120, FALLBACK_RUNNING_TEXT_STYLE.fontSize),
    fontWeight: VALID_FONT_WEIGHTS.includes(s.fontWeight as typeof VALID_FONT_WEIGHTS[number]) ? s.fontWeight as RunningTextStyle['fontWeight'] : FALLBACK_RUNNING_TEXT_STYLE.fontWeight,
    fontStyle: VALID_FONT_STYLES.includes(s.fontStyle as typeof VALID_FONT_STYLES[number]) ? s.fontStyle as RunningTextStyle['fontStyle'] : FALLBACK_RUNNING_TEXT_STYLE.fontStyle,
    textColor: typeof s.textColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(s.textColor) ? s.textColor : FALLBACK_RUNNING_TEXT_STYLE.textColor,
    bgColor: typeof s.bgColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(s.bgColor) ? s.bgColor : FALLBACK_RUNNING_TEXT_STYLE.bgColor,
    bgOpacity: clamp(s.bgOpacity, 0, 100, FALLBACK_RUNNING_TEXT_STYLE.bgOpacity),
    position: VALID_POSITIONS.includes(s.position as typeof VALID_POSITIONS[number]) ? s.position as RunningTextStyle['position'] : FALLBACK_RUNNING_TEXT_STYLE.position,
    direction: VALID_DIRECTIONS.includes(s.direction as typeof VALID_DIRECTIONS[number]) ? s.direction as RunningTextStyle['direction'] : FALLBACK_RUNNING_TEXT_STYLE.direction,
    paddingY: clamp(s.paddingY, 0, 60, FALLBACK_RUNNING_TEXT_STYLE.paddingY),
    separator: typeof s.separator === 'string' ? s.separator : FALLBACK_RUNNING_TEXT_STYLE.separator,
    textShadow: typeof s.textShadow === 'boolean' ? s.textShadow : FALLBACK_RUNNING_TEXT_STYLE.textShadow,
    textTransform: VALID_TEXT_TRANSFORMS.includes(s.textTransform as typeof VALID_TEXT_TRANSFORMS[number]) ? s.textTransform as RunningTextStyle['textTransform'] : FALLBACK_RUNNING_TEXT_STYLE.textTransform,
  }
}

function normalizeRunningTextConfig(value: unknown): RunningTextConfig {
  if (typeof value !== 'object' || value === null) return FALLBACK_RUNNING_TEXT_CONFIG
  const src = value as Record<string, unknown>
  const itemsSource = Array.isArray(src.items) ? src.items : FALLBACK_RUNNING_TEXT_CONFIG.items

  return {
    enabled: typeof src.enabled === 'boolean' ? src.enabled : FALLBACK_RUNNING_TEXT_CONFIG.enabled,
    visibleCount: clamp(src.visibleCount, 1, 10, FALLBACK_RUNNING_TEXT_CONFIG.visibleCount),
    rotationSeconds: clamp(src.rotationSeconds, 1, 600, FALLBACK_RUNNING_TEXT_CONFIG.rotationSeconds),
    displaySeconds: clamp(src.displaySeconds, 0, 600, FALLBACK_RUNNING_TEXT_CONFIG.displaySeconds),
    items: itemsSource
      .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
      .map((item, idx) => ({
        id: typeof item.id === 'string' ? item.id.trim() : `ticker_${idx}`,
        enabled: typeof item.enabled === 'boolean' ? item.enabled : true,
        text: typeof item.text === 'string' ? item.text.trim() : '',
      }))
      .filter((item) => item.text.length > 0),
    style: normalizeRunningTextStyle(src.style),
  }
}

function clamp(val: unknown, min: number, max: number, fallback: number): number {
  const parsed = typeof val === 'number' ? val : parseInt(String(val ?? ''))
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback
}
