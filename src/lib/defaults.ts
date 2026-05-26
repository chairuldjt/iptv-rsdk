export const DEFAULT_SYNC_MODE = 'custom'
export const DEFAULT_CUSTOM_M3U_URL = 'http://10.0.0.1/iptv/iptv_rsdk.m3u'

export function normalizeSyncMode(value: string | null | undefined): 'api' | 'custom' {
  return value === 'custom' ? 'custom' : 'api'
}
