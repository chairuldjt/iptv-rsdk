import prisma from '@/lib/db'

const OFFLINE_AUTO_DELETE_DAYS_KEY = 'device.offlineAutoDeleteDays'
const HLS_RELAY_BASE_URL_KEY = 'stream.hlsRelayBaseUrl'
const DEFAULT_HLS_RELAY_BASE_URL = process.env.IPTV_HLS_RELAY_BASE_URL || 'http://10.55.1.5/relay'

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

export async function getHlsRelayBaseUrl(): Promise<string> {
  const setting = await prisma.appSetting.findUnique({
    where: { key: HLS_RELAY_BASE_URL_KEY },
  })

  return normalizeHlsRelayBaseUrl(setting?.value || DEFAULT_HLS_RELAY_BASE_URL)
}

export async function setHlsRelayBaseUrl(baseUrl: string): Promise<void> {
  const safeUrl = normalizeHlsRelayBaseUrl(baseUrl || DEFAULT_HLS_RELAY_BASE_URL)

  await prisma.appSetting.upsert({
    where: { key: HLS_RELAY_BASE_URL_KEY },
    update: { value: safeUrl },
    create: {
      key: HLS_RELAY_BASE_URL_KEY,
      value: safeUrl,
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

function normalizeHlsRelayBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim()
  if (!trimmed) return DEFAULT_HLS_RELAY_BASE_URL

  try {
    const url = new URL(trimmed)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return DEFAULT_HLS_RELAY_BASE_URL
    }
    return url.toString().replace(/\/$/, '')
  } catch {
    return DEFAULT_HLS_RELAY_BASE_URL
  }
}
