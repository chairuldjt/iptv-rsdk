import prisma from '@/lib/db'

const OFFLINE_AUTO_DELETE_DAYS_KEY = 'device.offlineAutoDeleteDays'
const APP_PUBLIC_ORIGIN_KEY = 'app.publicOrigin'
const ON_DEMAND_HLS_RELAY_CONFIG_KEY = 'stream.onDemandHlsRelayConfig'
const PRIMARY_NTP_SERVER_KEY = 'app.primaryNtpServer'
const DEFAULT_APP_PUBLIC_ORIGIN = ''
const DEFAULT_PRIMARY_NTP_SERVER = '0.id.pool.ntp.org'

export type OnDemandHlsRelayConfig = {
  ffmpegBin: string
  localAddr: string
  outputRoot: string
  hlsTime: string
  hlsListSize: string
  fifoSize: string
  logLevel: string
  idleTimeoutMs: number
}

const DEFAULT_ON_DEMAND_HLS_RELAY_CONFIG: OnDemandHlsRelayConfig = {
  ffmpegBin: '/usr/bin/ffmpeg',
  localAddr: '10.0.0.199',
  outputRoot: '/var/www/html/landingpage/relay',
  hlsTime: '2',
  hlsListSize: '6',
  fifoSize: '50000',
  logLevel: 'warning',
  idleTimeoutMs: 600000,
}

export async function getOfflineAutoDeleteDays(): Promise<number> {
  const setting = await prisma.appSetting.findUnique({
    where: { key: OFFLINE_AUTO_DELETE_DAYS_KEY },
  })

  const value = Number.parseInt(setting?.value || '0', 10)
  return Number.isFinite(value) ? Math.max(0, value) : 0
}

export async function setOfflineAutoDeleteDays(days: number): Promise<void> {
  const safeDays = Math.max(0, Math.min(3650, Math.floor(days || 0)))

  await prisma.appSetting.upsert({
    where: { key: OFFLINE_AUTO_DELETE_DAYS_KEY },
    update: { value: safeDays.toString() },
    create: {
      key: OFFLINE_AUTO_DELETE_DAYS_KEY,
      value: safeDays.toString(),
    },
  })
}

export async function getAppPublicOrigin(): Promise<string> {
  const setting = await prisma.appSetting.findUnique({
    where: { key: APP_PUBLIC_ORIGIN_KEY },
  })

  return normalizePublicOrigin(setting?.value || DEFAULT_APP_PUBLIC_ORIGIN)
}

export async function setAppPublicOrigin(origin: string): Promise<void> {
  const safeOrigin = normalizePublicOrigin(origin || DEFAULT_APP_PUBLIC_ORIGIN)

  await prisma.appSetting.upsert({
    where: { key: APP_PUBLIC_ORIGIN_KEY },
    update: { value: safeOrigin },
    create: {
      key: APP_PUBLIC_ORIGIN_KEY,
      value: safeOrigin,
    },
  })
}

export async function getPrimaryNtpServer(): Promise<string> {
  const setting = await prisma.appSetting.findUnique({
    where: { key: PRIMARY_NTP_SERVER_KEY },
  })

  return normalizeNtpServer(setting?.value || DEFAULT_PRIMARY_NTP_SERVER)
}

export async function setPrimaryNtpServer(server: string): Promise<void> {
  const safeServer = normalizeNtpServer(server || DEFAULT_PRIMARY_NTP_SERVER)

  await prisma.appSetting.upsert({
    where: { key: PRIMARY_NTP_SERVER_KEY },
    update: { value: safeServer },
    create: {
      key: PRIMARY_NTP_SERVER_KEY,
      value: safeServer,
    },
  })
}

export async function resetRelayRuntimeSettings(): Promise<void> {
  await prisma.appSetting.deleteMany({
    where: {
      key: {
        in: [APP_PUBLIC_ORIGIN_KEY, ON_DEMAND_HLS_RELAY_CONFIG_KEY, PRIMARY_NTP_SERVER_KEY],
      },
    },
  })
}

export async function getOnDemandHlsRelayConfig(): Promise<OnDemandHlsRelayConfig> {
  const setting = await prisma.appSetting.findUnique({
    where: { key: ON_DEMAND_HLS_RELAY_CONFIG_KEY },
  })

  if (!setting?.value) {
    return DEFAULT_ON_DEMAND_HLS_RELAY_CONFIG
  }

  try {
    return normalizeOnDemandHlsRelayConfig(JSON.parse(setting.value))
  } catch {
    return DEFAULT_ON_DEMAND_HLS_RELAY_CONFIG
  }
}

export async function setOnDemandHlsRelayConfig(config: OnDemandHlsRelayConfig): Promise<void> {
  const safeConfig = normalizeOnDemandHlsRelayConfig(config)

  await prisma.appSetting.upsert({
    where: { key: ON_DEMAND_HLS_RELAY_CONFIG_KEY },
    update: { value: JSON.stringify(safeConfig) },
    create: {
      key: ON_DEMAND_HLS_RELAY_CONFIG_KEY,
      value: JSON.stringify(safeConfig),
    },
  })
}

export async function cleanupOfflineDevices(days: number): Promise<number> {
  if (days <= 0) return 0

  const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const result = await prisma.device.deleteMany({
    where: {
      isActive: true,
      lastOnline: {
        lt: threshold,
      },
    },
  })

  return result.count
}

function normalizePublicOrigin(origin: string): string {
  const trimmed = origin.trim()
  if (!trimmed) return ''

  try {
    const url = new URL(trimmed)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return ''
    }
    return url.origin.replace(/\/$/, '')
  } catch {
    return ''
  }
}

function normalizeNtpServer(server: string): string {
  const trimmed = server.trim().toLowerCase()
  if (!trimmed) return DEFAULT_PRIMARY_NTP_SERVER

  const normalized = trimmed.replace(/\.$/, '')
  return /^[a-z0-9.-]+$/.test(normalized) ? normalized : DEFAULT_PRIMARY_NTP_SERVER
}

function normalizeOnDemandHlsRelayConfig(value: unknown): OnDemandHlsRelayConfig {
  const source = isRecord(value) ? value : {}
  const fallback = DEFAULT_ON_DEMAND_HLS_RELAY_CONFIG

  return {
    ffmpegBin: safeString(source.ffmpegBin, fallback.ffmpegBin),
    localAddr: safeString(source.localAddr, fallback.localAddr),
    outputRoot: normalizeAbsolutePath(source.outputRoot, fallback.outputRoot),
    hlsTime: safePositiveNumberString(source.hlsTime, fallback.hlsTime),
    hlsListSize: safePositiveIntegerString(source.hlsListSize, fallback.hlsListSize),
    fifoSize: safePositiveIntegerString(source.fifoSize, fallback.fifoSize),
    logLevel: oneOf(source.logLevel, ['quiet', 'panic', 'fatal', 'error', 'warning', 'info', 'verbose', 'debug'], fallback.logLevel),
    idleTimeoutMs: clampInt(source.idleTimeoutMs, 10000, 86_400_000, fallback.idleTimeoutMs),
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

function normalizeAbsolutePath(value: unknown, fallback: string): string {
  const trimmed = safeString(value, fallback).replace(/\\/g, '/').replace(/\/$/, '')
  return trimmed.startsWith('/') ? trimmed : fallback
}

function safePositiveNumberString(value: unknown, fallback: string): string {
  const trimmed = typeof value === 'string' ? value.trim() : String(value ?? '')
  const parsed = Number.parseFloat(trimmed)
  return Number.isFinite(parsed) && parsed > 0 ? trimmed : fallback
}

function safePositiveIntegerString(value: unknown, fallback: string): string {
  const trimmed = typeof value === 'string' ? value.trim() : String(value ?? '')
  const parsed = Number.parseInt(trimmed, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed.toString() : fallback
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value), 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(min, Math.min(max, Math.floor(parsed)))
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && allowed.includes(value as T) ? (value as T) : fallback
}
