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
