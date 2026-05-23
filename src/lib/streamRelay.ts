import crypto from 'crypto'

const RELAY_SECRET = process.env.SESSION_SECRET

if (!RELAY_SECRET) {
  throw new Error('SESSION_SECRET must be configured.')
}

type RelayPayload = {
  url: string
}

export function createRelayToken(url: string): string {
  const payload = base64UrlEncode(JSON.stringify({ url } satisfies RelayPayload))
  const signature = sign(payload)
  return `${payload}.${signature}`
}

export function verifyRelayToken(token: string): string | null {
  const parts = token.split('.')
  if (parts.length !== 2) return null

  const [payload, signature] = parts
  const expected = sign(payload)
  if (!safeEqual(signature, expected)) return null

  try {
    const parsed = JSON.parse(base64UrlDecode(payload)) as RelayPayload
    const url = new URL(parsed.url)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null
    }
    return url.toString()
  } catch {
    return null
  }
}

export function createRelayUrl(origin: string, targetUrl: string): string {
  const relayUrl = new URL('/api/stream/relay', origin)
  relayUrl.searchParams.set('t', createRelayToken(targetUrl))
  return relayUrl.toString()
}

function sign(payload: string): string {
  return base64UrlEncode(
    crypto
      .createHmac('sha256', RELAY_SECRET as string)
      .update(payload)
      .digest()
  )
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && crypto.timingSafeEqual(left, right)
}

function base64UrlEncode(value: string | Buffer): string {
  return Buffer.from(value)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function base64UrlDecode(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  return Buffer.from(base64, 'base64').toString('utf-8')
}
