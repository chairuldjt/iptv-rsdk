// Session secret key configuration
const SESSION_SECRET = process.env.SESSION_SECRET || 'rsdk-iptv-super-secret-key-32-chars-or-more-2026-nuger-27102022'

// Obtain global Web Crypto object safely (guaranteed in Node 19+ and Next.js Edge Runtime)
const getSubtleCrypto = () => {
  const cryptoObj = typeof globalThis !== 'undefined' && globalThis.crypto 
    ? globalThis.crypto 
    : typeof crypto !== 'undefined' 
      ? (crypto as unknown as Crypto) 
      : null;

  if (!cryptoObj || !cryptoObj.subtle) {
    throw new Error('Web Crypto API (crypto.subtle) is not available in this environment.')
  }
  return cryptoObj.subtle
}

// Web Crypto HMAC key import
async function getCryptoKey() {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(SESSION_SECRET)
  const subtle = getSubtleCrypto()
  
  return await subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

// Generate secure stateless JWT token
export async function createSessionToken(payload: { userId: number; username: string; role: string }): Promise<string> {
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000 // 1 Day Session Life
  const header = { alg: 'HS256', typ: 'JWT' }

  // Base64Url encode helpers
  const toBase64Url = (obj: any) => {
    const str = typeof obj === 'string' ? obj : JSON.stringify(obj)
    const base64 = typeof window !== 'undefined' ? window.btoa(str) : Buffer.from(str).toString('base64')
    return base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  }

  const headerBase64 = toBase64Url(header)
  const payloadBase64 = toBase64Url({ ...payload, expiresAt })
  const message = `${headerBase64}.${payloadBase64}`

  const encoder = new TextEncoder()
  const subtle = getSubtleCrypto()
  const key = await getCryptoKey()
  const signatureBuffer = await subtle.sign(
    'HMAC',
    key,
    encoder.encode(message)
  )

  const signatureArray = Array.from(new Uint8Array(signatureBuffer))
  const signatureBase64 = (typeof window !== 'undefined' ? window.btoa(String.fromCharCode(...signatureArray)) : Buffer.from(signatureBuffer).toString('base64'))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')

  return `${message}.${signatureBase64}`
}

// Verify JWT token signature and expiration
export async function verifySessionToken(token: string): Promise<{ userId: number; username: string; role: string } | null> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const [headerBase64, payloadBase64, signatureBase64] = parts
    const message = `${headerBase64}.${payloadBase64}`

    const subtle = getSubtleCrypto()
    const key = await getCryptoKey()
    const encoder = new TextEncoder()

    // Base64Url decode helper
    const fromBase64Url = (base64url: string) => {
      const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
      return typeof window !== 'undefined' ? window.atob(base64) : Buffer.from(base64, 'base64').toString('utf-8')
    }

    // Decode signature
    const sigBase64 = signatureBase64.replace(/-/g, '+').replace(/_/g, '/')
    const sigBytes = typeof window !== 'undefined' 
      ? new Uint8Array(window.atob(sigBase64).split('').map(c => c.charCodeAt(0))) 
      : Buffer.from(sigBase64, 'base64')

    const isValid = await subtle.verify(
      'HMAC',
      key,
      sigBytes,
      encoder.encode(message)
    )

    if (!isValid) return null

    // Decode payload and verify expiration
    const payload = JSON.parse(fromBase64Url(payloadBase64))
    if (Date.now() > payload.expiresAt) {
      return null
    }

    return {
      userId: payload.userId,
      username: payload.username,
      role: payload.role
    }
  } catch (err) {
    console.error('Session Token verification error:', err)
    return null
  }
}
