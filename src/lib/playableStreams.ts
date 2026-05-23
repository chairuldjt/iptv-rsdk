import { createRelayPath, createRelayUrl } from '@/lib/streamRelay'

type PlayableStreamOptions = {
  origin: string
  name: string
  streamUrl: string
  hlsRelayBaseUrl: string
}

export function createPlayableStreamUrl({
  origin,
  name,
  streamUrl,
  hlsRelayBaseUrl,
}: PlayableStreamOptions): string {
  if (isUdpStreamUrl(streamUrl)) {
    return createUdpHlsRelayUrl(name, hlsRelayBaseUrl)
  }

  if (isHttpStreamUrl(streamUrl)) {
    return origin ? createRelayUrl(origin, streamUrl) : createRelayPath(streamUrl)
  }

  return streamUrl
}

export function createUdpHlsRelayUrl(channelName: string, hlsRelayBaseUrl: string): string {
  const baseUrl = hlsRelayBaseUrl.replace(/\/$/, '')
  return `${baseUrl}/${slugifyChannelName(channelName)}/index.m3u8`
}

export function createUdpOnDemandHlsPath(channelId: number): string {
  const relayUrl = new URL('/api/stream/udp-hls', 'http://localhost')
  relayUrl.searchParams.set('channelId', channelId.toString())
  return `${relayUrl.pathname}${relayUrl.search}`
}

export function isUdpStreamUrl(streamUrl: string): boolean {
  return streamUrl.trim().toLowerCase().startsWith('udp://')
}

export function isHttpStreamUrl(streamUrl: string): boolean {
  const lower = streamUrl.trim().toLowerCase()
  return lower.startsWith('http://') || lower.startsWith('https://')
}

export function slugifyChannelName(channelName: string): string {
  const slug = channelName
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || 'channel'
}
