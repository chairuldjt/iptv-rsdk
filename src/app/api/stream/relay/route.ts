import { createRelayUrl, verifyRelayToken } from '@/lib/streamRelay'

export const revalidate = 0
export const runtime = 'nodejs'

const HLS_CONTENT_TYPES = [
  'application/vnd.apple.mpegurl',
  'application/x-mpegurl',
  'audio/mpegurl',
  'audio/x-mpegurl',
]

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const token = requestUrl.searchParams.get('t')
  const targetUrl = token ? verifyRelayToken(token) : null

  if (!targetUrl) {
    return Response.json({ status: false, message: 'Invalid stream relay token' }, { status: 403 })
  }

  try {
    const upstream = await fetch(targetUrl, {
      cache: 'no-store',
      headers: buildRelayHeaders(request),
      signal: AbortSignal.timeout(15000),
    })

    if (!upstream.ok) {
      return Response.json(
        { status: false, message: `Upstream stream error: HTTP ${upstream.status}` },
        { status: upstream.status }
      )
    }

    const contentType = upstream.headers.get('content-type') || ''
    if (isHlsPlaylist(targetUrl, contentType)) {
      const playlist = await upstream.text()
      const rewritten = rewriteHlsPlaylist(playlist, targetUrl, requestUrl.origin)
      return new Response(rewritten, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl; charset=utf-8',
          'Cache-Control': 'no-store',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: buildResponseHeaders(upstream.headers),
    })
  } catch (error) {
    console.error('Stream relay error:', error)
    return Response.json(
      { status: false, message: 'Unable to relay stream from upstream source' },
      { status: 502 }
    )
  }
}

function buildRelayHeaders(request: Request): Headers {
  const headers = new Headers()
  const range = request.headers.get('range')
  if (range) headers.set('range', range)
  headers.set('user-agent', request.headers.get('user-agent') || 'RSDK-IPTV-Relay')
  return headers
}

function buildResponseHeaders(upstreamHeaders: Headers): Headers {
  const headers = new Headers()
  const passthroughHeaders = [
    'content-type',
    'content-length',
    'content-range',
    'accept-ranges',
  ]

  for (const name of passthroughHeaders) {
    const value = upstreamHeaders.get(name)
    if (value) headers.set(name, value)
  }

  headers.set('Cache-Control', 'no-store')
  headers.set('Access-Control-Allow-Origin', '*')
  return headers
}

function isHlsPlaylist(targetUrl: string, contentType: string): boolean {
  const lowerContentType = contentType.toLowerCase()
  return targetUrl.toLowerCase().includes('.m3u8') ||
    HLS_CONTENT_TYPES.some((type) => lowerContentType.includes(type))
}

function rewriteHlsPlaylist(playlist: string, playlistUrl: string, origin: string): string {
  return playlist
    .split(/\r?\n/)
    .map((line) => rewriteHlsLine(line, playlistUrl, origin))
    .join('\n')
}

function rewriteHlsLine(line: string, playlistUrl: string, origin: string): string {
  const trimmed = line.trim()
  if (!trimmed) return line

  if (trimmed.startsWith('#')) {
    return line.replace(/URI="([^"]+)"/g, (_match, uri: string) => {
      return `URI="${createRelayUrl(origin, resolveStreamUrl(uri, playlistUrl))}"`
    })
  }

  const prefixLength = line.length - line.trimStart().length
  const prefix = line.slice(0, prefixLength)
  return `${prefix}${createRelayUrl(origin, resolveStreamUrl(trimmed, playlistUrl))}`
}

function resolveStreamUrl(value: string, baseUrl: string): string {
  return new URL(value, baseUrl).toString()
}
