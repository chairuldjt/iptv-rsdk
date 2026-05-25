import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { createPlayableStreamUrl, createUdpOnDemandHlsPath, isUdpStreamUrl } from '@/lib/playableStreams'
import { getAppPublicOrigin, getHlsRelayBaseUrl } from '@/lib/settings'

export const revalidate = 0

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const playlistId = parseInt(id, 10)

    if (!Number.isFinite(playlistId)) {
      return new Response('Invalid playlist ID', { status: 400 })
    }

    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
      include: {
        channels: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          include: {
            category: {
              select: { name: true }
            }
          }
        }
      }
    })

    if (!playlist) {
      return new Response('Playlist not found', { status: 404 })
    }

    const appPublicOrigin = await getAppPublicOrigin()
    const hlsRelayBaseUrl = await getHlsRelayBaseUrl()
    
    const origin = appPublicOrigin || new URL(request.url).origin
    const relayBase = hlsRelayBaseUrl || ''

    let m3uContent = '#EXTM3U\n'

    for (const channel of playlist.channels) {
      const logo = channel.logoUrl || ''
      const group = channel.category?.name || 'Uncategorized'
      
      // Determine the stream URL (relay if UDP, otherwise direct stream url)
      let finalStreamUrl = channel.streamUrl
      if (isUdpStreamUrl(channel.streamUrl)) {
        finalStreamUrl = origin ? new URL(createUdpOnDemandHlsPath(channel.id), origin).toString() : createUdpOnDemandHlsPath(channel.id)
      } else {
        finalStreamUrl = createPlayableStreamUrl({
          origin,
          name: channel.name,
          streamUrl: channel.streamUrl,
          hlsRelayBaseUrl: relayBase,
        })
      }

      m3uContent += `#EXTINF:-1 tvg-id="${channel.id}" tvg-name="${channel.name}" tvg-logo="${logo}" group-title="${group}",${channel.name}\n`
      m3uContent += `${finalStreamUrl}\n`
    }

    return new Response(m3uContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-mpegurl; charset=utf-8',
        'Content-Disposition': `attachment; filename="playlist_${playlistId}.m3u"`,
      }
    })
  } catch (error) {
    console.error('Export playlist error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
