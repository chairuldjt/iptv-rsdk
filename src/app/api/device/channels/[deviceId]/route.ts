import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getErrorMessage } from '@/lib/errors'
import { createPlayableStreamUrl, createUdpOnDemandHlsPath, isUdpStreamUrl } from '@/lib/playableStreams'
import { getHlsRelayBaseUrl } from '@/lib/settings'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await params

    if (!deviceId) {
      return NextResponse.json(
        { status: false, message: 'Missing deviceId parameter' },
        { status: 400 }
      )
    }

    // Find the device
    const device = await prisma.device.findUnique({
      where: { deviceId },
    })

    if (!device || !device.isActive) {
      return NextResponse.json(
        { status: false, message: !device ? 'Device not registered' : 'Device is inactive', data: [] },
        { status: !device ? 404 : 403 }
      )
    }

    // Determine the playlist ID from device config
    const config = await prisma.deviceConfig.findUnique({
      where: { deviceId }
    })

    if (config?.syncMode === 'custom') {
        return NextResponse.json({
            status: true,
            message: 'Device is in Custom M3U mode. Use the custom URL provided in config.',
            data: [],
        })
    }

    // Use the globally active playlist
    let globalPlaylist = await prisma.playlist.findFirst({
      where: { isGlobal: true },
    })
    
    // Fallback: If no playlist is marked as global, use the most recently updated one
    if (!globalPlaylist) {
        globalPlaylist = await prisma.playlist.findFirst({
            orderBy: { updatedAt: 'desc' }
        })
    }

    const playlistId = globalPlaylist?.id

    if (!playlistId) {
      return NextResponse.json({
        status: true,
        message: 'No global active playlists available on server',
        data: [],
      })
    }

    // Fetch channels for the determined playlist
    const channels = await prisma.channel.findMany({
      where: {
        playlistId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        streamUrl: true,
        sortOrder: true,
        isActive: true,
        category: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        sortOrder: 'asc',
      },
    })

    const shouldRelayStreams = config?.syncMode === 'api_relay'
    const requestOrigin = getPublicOrigin(request)
    const hlsRelayBaseUrl = shouldRelayStreams ? await getHlsRelayBaseUrl() : ''

    // Map channels to expected client schema
    const mappedChannels = channels.map((c) => ({
      id: c.id,
      name: c.name,
      logo: c.logoUrl,
      group: c.category?.name || 'Uncategorized',
      stream_url: shouldRelayStreams
        ? createRelayedClientStreamUrl({
            channelId: c.id,
            origin: requestOrigin,
            name: c.name,
            streamUrl: c.streamUrl,
            hlsRelayBaseUrl,
          })
        : c.streamUrl,
      sort_order: c.sortOrder,
      active: c.isActive,
    }))

    return NextResponse.json({
      status: true,
      message: 'Channels loaded',
      data: mappedChannels,
    })
  } catch (error: unknown) {
    console.error('Channels API Error:', error)
    return NextResponse.json(
      { status: false, message: 'Server error: ' + getErrorMessage(error) },
      { status: 500 }
    )
  }
}

function getPublicOrigin(request: Request): string {
  const configuredOrigin = process.env.APP_PUBLIC_ORIGIN || process.env.NEXT_PUBLIC_APP_URL
  if (configuredOrigin) {
    return configuredOrigin.replace(/\/$/, '')
  }

  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https'
  if (forwardedHost) {
    return `${forwardedProto.split(',')[0]}://${forwardedHost.split(',')[0]}`.replace(/\/$/, '')
  }

  return new URL(request.url).origin
}

function createRelayedClientStreamUrl({
  channelId,
  origin,
  name,
  streamUrl,
  hlsRelayBaseUrl,
}: {
  channelId: number
  origin: string
  name: string
  streamUrl: string
  hlsRelayBaseUrl: string
}): string {
  if (isUdpStreamUrl(streamUrl)) {
    return new URL(createUdpOnDemandHlsPath(channelId), origin).toString()
  }

  return createPlayableStreamUrl({
    origin,
    name,
    streamUrl,
    hlsRelayBaseUrl,
  })
}
