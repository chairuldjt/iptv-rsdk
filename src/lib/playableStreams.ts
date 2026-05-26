import { createRelayPath, createRelayUrl } from '@/lib/streamRelay'

type PlayableStreamOptions = {
  origin: string
  streamUrl: string
}

export function createPlayableStreamUrl({
  origin,
  streamUrl,
}: PlayableStreamOptions): string {
  if (isHttpStreamUrl(streamUrl)) {
    return origin ? createRelayUrl(origin, streamUrl) : createRelayPath(streamUrl)
  }

  return streamUrl
}

export function createUdpOnDemandHlsPath(channelId: number): string {
  return `/api/stream/udp-hls/${channelId}/index.m3u8`
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
