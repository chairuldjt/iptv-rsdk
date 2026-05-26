import prisma from '@/lib/db'
import { getOnDemandHlsRelayConfig, type OnDemandHlsRelayConfig } from '@/lib/settings'

export type PlaylistRelayConfigOverride = Partial<Pick<
  OnDemandHlsRelayConfig,
  'localAddr' | 'hlsTime' | 'hlsListSize' | 'fifoSize' | 'idleTimeoutMs'
>>

export type PlaylistRelaySettings = {
  enabled: boolean
  config: PlaylistRelayConfigOverride
}

export async function getPlaylistRelaySettings(playlistId: number): Promise<PlaylistRelaySettings> {
  const playlist = await prisma.playlist.findUnique({
    where: { id: playlistId },
    select: {
      relayEnabled: true,
      relayConfig: true,
    },
  })

  return getPlaylistRelaySettingsFromValue(playlist?.relayEnabled, playlist?.relayConfig)
}

export function getPlaylistRelaySettingsFromValue(
  relayEnabled: boolean | null | undefined,
  relayConfig: string | null | undefined
): PlaylistRelaySettings {
  return {
    enabled: Boolean(relayEnabled),
    config: normalizePlaylistRelayConfigOverride(parseRelayConfigJson(relayConfig)),
  }
}

export async function getEffectiveOnDemandHlsRelayConfigForPlaylist(playlistId: number): Promise<{
  enabled: boolean
  config: OnDemandHlsRelayConfig
}> {
  const [globalConfig, playlistSettings] = await Promise.all([
    getOnDemandHlsRelayConfig(),
    getPlaylistRelaySettings(playlistId),
  ])

  return {
    enabled: playlistSettings.enabled,
    config: {
      ...globalConfig,
      ...playlistSettings.config,
    },
  }
}

export async function getEffectiveOnDemandHlsRelayConfigForChannel(channelId: number): Promise<{
  enabled: boolean
  config: OnDemandHlsRelayConfig
  playlistId: number
}> {
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: {
      playlistId: true,
    },
  })

  if (!channel) {
    throw new Error('Channel not found for relay configuration.')
  }

  const effective = await getEffectiveOnDemandHlsRelayConfigForPlaylist(channel.playlistId)
  return {
    ...effective,
    playlistId: channel.playlistId,
  }
}

export function playlistRelayConfigFromFormData(formData: FormData): PlaylistRelaySettings {
  return {
    enabled: formData.get('relayEnabled') === 'on',
    config: normalizePlaylistRelayConfigOverride({
      localAddr: optionalTrimmedString(formData.get('localAddr')),
      hlsTime: optionalPositiveNumberString(formData.get('hlsTime')),
      hlsListSize: optionalPositiveIntegerString(formData.get('hlsListSize')),
      fifoSize: optionalPositiveIntegerString(formData.get('fifoSize')),
      idleTimeoutMs: optionalClampedInt(formData.get('idleTimeoutMs'), 10000, 86_400_000),
    }),
  }
}

export function serializePlaylistRelayConfig(config: PlaylistRelayConfigOverride): string | null {
  const normalized = normalizePlaylistRelayConfigOverride(config)
  return Object.keys(normalized).length > 0 ? JSON.stringify(normalized) : null
}

function parseRelayConfigJson(value: string | null | undefined): unknown {
  if (!value?.trim()) {
    return {}
  }

  try {
    return JSON.parse(value)
  } catch {
    return {}
  }
}

function normalizePlaylistRelayConfigOverride(value: unknown): PlaylistRelayConfigOverride {
  const source = isRecord(value) ? value : {}
  const normalized: PlaylistRelayConfigOverride = {}

  const localAddr = optionalTrimmedString(source.localAddr)
  const hlsTime = optionalPositiveNumberString(source.hlsTime)
  const hlsListSize = optionalPositiveIntegerString(source.hlsListSize)
  const fifoSize = optionalPositiveIntegerString(source.fifoSize)
  const idleTimeoutMs = optionalClampedInt(source.idleTimeoutMs, 10000, 86_400_000)

  if (localAddr) normalized.localAddr = localAddr
  if (hlsTime) normalized.hlsTime = hlsTime
  if (hlsListSize) normalized.hlsListSize = hlsListSize
  if (fifoSize) normalized.fifoSize = fifoSize
  if (typeof idleTimeoutMs === 'number') normalized.idleTimeoutMs = idleTimeoutMs

  return normalized
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function optionalTrimmedString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed || undefined
}

function optionalPositiveNumberString(value: unknown): string | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined
  const trimmed = String(value).trim()
  if (!trimmed) return undefined
  const parsed = Number.parseFloat(trimmed)
  return Number.isFinite(parsed) && parsed > 0 ? trimmed : undefined
}

function optionalPositiveIntegerString(value: unknown): string | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined
  const trimmed = String(value).trim()
  if (!trimmed) return undefined
  const parsed = Number.parseInt(trimmed, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed.toString() : undefined
}

function optionalClampedInt(value: unknown, min: number, max: number): number | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined
  const trimmed = String(value).trim()
  if (!trimmed) return undefined
  const parsed = Number.parseInt(trimmed, 10)
  if (!Number.isFinite(parsed)) return undefined
  return Math.max(min, Math.min(max, Math.floor(parsed)))
}
