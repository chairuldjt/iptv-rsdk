import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'RSDK IPTV Admin',
    short_name: 'RSDK IPTV',
    description: 'Dashboard administrasi RSDK IPTV untuk manajemen playlist, channel, dan perangkat STB.',
    start_url: '/',
    display: 'standalone',
    background_color: '#090d16',
    theme_color: '#0f172a',
    icons: [
      {
        src: '/rsdk-icon.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/rsdk-app-logo.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
