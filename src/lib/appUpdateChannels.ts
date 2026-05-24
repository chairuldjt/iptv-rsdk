export const APP_UPDATE_CHANNELS = ['production', 'debug-latency'] as const

export type AppUpdateChannel = (typeof APP_UPDATE_CHANNELS)[number]

export const APP_UPDATE_CHANNEL_LABELS: Record<AppUpdateChannel, string> = {
  production: 'Production',
  'debug-latency': 'Debug Latency',
}

export const APP_UPDATE_CHANNEL_DESCRIPTIONS: Record<AppUpdateChannel, string> = {
  production: 'APK utama untuk update OTA perangkat produksi.',
  'debug-latency': 'APK investigasi performa dengan package terpisah agar bisa terpasang berdampingan.',
}

export const APP_UPDATE_PACKAGE_HINTS: Record<AppUpdateChannel, string> = {
  production: 'com.example.rsdkiptvplayer',
  'debug-latency': 'com.example.rsdkiptvplayer.debuglatency',
}

export function isAppUpdateChannel(value: string): value is AppUpdateChannel {
  return APP_UPDATE_CHANNELS.includes(value as AppUpdateChannel)
}

export function normalizeAppUpdateChannel(value: string | null | undefined): AppUpdateChannel {
  return value && isAppUpdateChannel(value) ? value : 'production'
}
