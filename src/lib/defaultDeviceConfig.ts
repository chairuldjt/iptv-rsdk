import type { Prisma } from '@prisma/client'
import prisma from '@/lib/db'
import { DEFAULT_CUSTOM_M3U_URL, DEFAULT_SYNC_MODE } from '@/lib/defaults'

const DEFAULT_DEVICE_CONFIG_KEY = 'device.defaultConfig'

export type DefaultDeviceConfig = {
  defaultCategory: string
  defaultChannelId: number | null
  aspectRatio: string
  syncInterval: number
  syncMode: string
  customM3uUrl: string
  startScreen: string
  lockSettings: boolean
  autoStartOnBoot: boolean
  technicianPin: string
  educationVideoPath: string
  educationSmbUsername: string
  educationSmbPassword: string
  educationSmbDomain: string
  educationRepeatMode: string
  educationPlayOrder: string
}

export const FALLBACK_DEFAULT_DEVICE_CONFIG: DefaultDeviceConfig = {
  defaultCategory: 'National TV',
  defaultChannelId: null,
  aspectRatio: 'fit',
  syncInterval: 1800,
  syncMode: DEFAULT_SYNC_MODE,
  customM3uUrl: DEFAULT_CUSTOM_M3U_URL,
  startScreen: 'live_tv',
  lockSettings: true,
  autoStartOnBoot: false,
  technicianPin: '2468',
  educationVideoPath: '',
  educationSmbUsername: '',
  educationSmbPassword: '',
  educationSmbDomain: '',
  educationRepeatMode: 'all',
  educationPlayOrder: 'alphabetical',
}

export async function getDefaultDeviceConfig(): Promise<DefaultDeviceConfig> {
  const setting = await prisma.appSetting.findUnique({
    where: { key: DEFAULT_DEVICE_CONFIG_KEY },
  })

  if (!setting?.value) {
    return FALLBACK_DEFAULT_DEVICE_CONFIG
  }

  try {
    return normalizeDefaultDeviceConfig(JSON.parse(setting.value))
  } catch {
    return FALLBACK_DEFAULT_DEVICE_CONFIG
  }
}

export async function setDefaultDeviceConfig(config: DefaultDeviceConfig): Promise<void> {
  const safeConfig = normalizeDefaultDeviceConfig(config)

  await prisma.appSetting.upsert({
    where: { key: DEFAULT_DEVICE_CONFIG_KEY },
    update: { value: JSON.stringify(safeConfig) },
    create: {
      key: DEFAULT_DEVICE_CONFIG_KEY,
      value: JSON.stringify(safeConfig),
    },
  })
}

export async function resetDefaultDeviceConfig(): Promise<void> {
  await prisma.appSetting.deleteMany({
    where: { key: DEFAULT_DEVICE_CONFIG_KEY },
  })
}

export function createDeviceConfigData(
  deviceId: string,
  config: DefaultDeviceConfig
): Prisma.DeviceConfigUncheckedCreateInput {
  const safeConfig = normalizeDefaultDeviceConfig(config)

  return {
    deviceId,
    ...safeConfig,
    forceSync: false,
    clearCacheTrigger: false,
    educationForceSync: false,
  }
}

export function defaultDeviceConfigFromFormData(formData: FormData): DefaultDeviceConfig {
  return normalizeDefaultDeviceConfig({
    defaultCategory: stringValue(formData, 'defaultCategory', FALLBACK_DEFAULT_DEVICE_CONFIG.defaultCategory),
    defaultChannelId: nullableIntValue(formData, 'defaultChannelId'),
    aspectRatio: stringValue(formData, 'aspectRatio', FALLBACK_DEFAULT_DEVICE_CONFIG.aspectRatio),
    syncInterval: intValue(formData, 'syncInterval', FALLBACK_DEFAULT_DEVICE_CONFIG.syncInterval),
    syncMode: stringValue(formData, 'syncMode', FALLBACK_DEFAULT_DEVICE_CONFIG.syncMode),
    customM3uUrl: stringValue(formData, 'customM3uUrl', FALLBACK_DEFAULT_DEVICE_CONFIG.customM3uUrl),
    startScreen: stringValue(formData, 'startScreen', FALLBACK_DEFAULT_DEVICE_CONFIG.startScreen),
    lockSettings: formData.get('lockSettings') === 'on',
    autoStartOnBoot: formData.get('autoStartOnBoot') === 'on',
    technicianPin: stringValue(formData, 'technicianPin', FALLBACK_DEFAULT_DEVICE_CONFIG.technicianPin),
    educationVideoPath: stringValue(formData, 'educationVideoPath', ''),
    educationSmbUsername: stringValue(formData, 'educationSmbUsername', ''),
    educationSmbPassword: stringValue(formData, 'educationSmbPassword', ''),
    educationSmbDomain: stringValue(formData, 'educationSmbDomain', ''),
    educationRepeatMode: stringValue(formData, 'educationRepeatMode', FALLBACK_DEFAULT_DEVICE_CONFIG.educationRepeatMode),
    educationPlayOrder: stringValue(formData, 'educationPlayOrder', FALLBACK_DEFAULT_DEVICE_CONFIG.educationPlayOrder),
  })
}

function normalizeDefaultDeviceConfig(value: unknown): DefaultDeviceConfig {
  const source = isRecord(value) ? value : {}

  return {
    defaultCategory: safeString(source.defaultCategory, FALLBACK_DEFAULT_DEVICE_CONFIG.defaultCategory),
    defaultChannelId: safeNullableInt(source.defaultChannelId),
    aspectRatio: oneOf(source.aspectRatio, ['fit', 'stretch', 'zoom', '16_9', '4_3'], FALLBACK_DEFAULT_DEVICE_CONFIG.aspectRatio),
    syncInterval: clampInt(source.syncInterval, 60, 86_400, FALLBACK_DEFAULT_DEVICE_CONFIG.syncInterval),
    syncMode: oneOf(source.syncMode, ['api', 'api_relay', 'custom'], FALLBACK_DEFAULT_DEVICE_CONFIG.syncMode),
    customM3uUrl: safeString(source.customM3uUrl, FALLBACK_DEFAULT_DEVICE_CONFIG.customM3uUrl),
    startScreen: oneOf(source.startScreen, ['live_tv', 'category_list', 'home_screen'], FALLBACK_DEFAULT_DEVICE_CONFIG.startScreen),
    lockSettings: safeBoolean(source.lockSettings, FALLBACK_DEFAULT_DEVICE_CONFIG.lockSettings),
    autoStartOnBoot: safeBoolean(source.autoStartOnBoot, FALLBACK_DEFAULT_DEVICE_CONFIG.autoStartOnBoot),
    technicianPin: safeString(source.technicianPin, FALLBACK_DEFAULT_DEVICE_CONFIG.technicianPin),
    educationVideoPath: safeString(source.educationVideoPath, ''),
    educationSmbUsername: safeString(source.educationSmbUsername, ''),
    educationSmbPassword: safeString(source.educationSmbPassword, ''),
    educationSmbDomain: safeString(source.educationSmbDomain, ''),
    educationRepeatMode: oneOf(source.educationRepeatMode, ['all', 'one', 'none'], FALLBACK_DEFAULT_DEVICE_CONFIG.educationRepeatMode),
    educationPlayOrder: oneOf(source.educationPlayOrder, ['alphabetical', 'random', 'shuffle'], FALLBACK_DEFAULT_DEVICE_CONFIG.educationPlayOrder),
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function safeString(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  return trimmed || fallback
}

function safeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function safeNullableInt(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value), 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(min, Math.min(max, Math.floor(parsed)))
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && allowed.includes(value as T) ? (value as T) : fallback
}

function stringValue(formData: FormData, key: string, fallback: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value : fallback
}

function intValue(formData: FormData, key: string, fallback: number): number {
  const value = formData.get(key)
  return typeof value === 'string' ? Number.parseInt(value, 10) : fallback
}

function nullableIntValue(formData: FormData, key: string): number | null {
  const value = formData.get(key)
  return typeof value === 'string' ? Number.parseInt(value, 10) : null
}
