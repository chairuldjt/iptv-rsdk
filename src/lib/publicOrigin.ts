import { getAppPublicOrigin } from './settings'

export async function resolvePublicOrigin(request: Request): Promise<string> {
  const configuredOrigin = await getAppPublicOrigin()
  if (configuredOrigin) {
    return configuredOrigin.replace(/\/$/, '')
  }

  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https'
  if (forwardedHost) {
    return `${forwardedProto.split(',')[0]}://${forwardedHost.split(',')[0]}`.replace(/\/$/, '')
  }

  return new URL(request.url).origin.replace(/\/$/, '')
}

export async function resolvePublicOriginFromHeaders(headers: Headers): Promise<string> {
  const configuredOrigin = await getAppPublicOrigin()
  if (configuredOrigin) {
    return configuredOrigin.replace(/\/$/, '')
  }

  const forwardedHost = headers.get('x-forwarded-host') || headers.get('host')
  const forwardedProto = headers.get('x-forwarded-proto') || 'http'
  if (forwardedHost) {
    return `${forwardedProto.split(',')[0]}://${forwardedHost.split(',')[0]}`.replace(/\/$/, '')
  }

  return ''
}
