import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getErrorMessage } from '@/lib/errors'
import { createPlayableStreamUrl, createUdpOnDemandHlsPath, isUdpStreamUrl } from '@/lib/playableStreams'
import { getAppPublicOrigin } from '@/lib/settings'
import { normalizeSyncMode } from '@/lib/defaults'

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

    if (normalizeSyncMode(config?.syncMode) === 'custom') {
        return NextResponse.json({
            status: true,
            message: 'Device is in Custom M3U mode. Use the custom URL provided in config.',
            data: [],
        })
    }

    // Use the globally active playlist
    let globalPlaylist = await prisma.playlist.findFirst({
      where: { isGlobal: true },
      select: {
        id: true,
        relayEnabled: true,
      },
    })
    
    // Fallback: If no playlist is marked as global, use the most recently updated one
    if (!globalPlaylist) {
        globalPlaylist = await prisma.playlist.findFirst({
            orderBy: { updatedAt: 'desc' },
            select: {
              id: true,
              relayEnabled: true,
            },
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

    const shouldProxyStreams = normalizeSyncMode(config?.syncMode) === 'api'
    const allowUdpOnDemandRelay = shouldProxyStreams && Boolean(globalPlaylist?.relayEnabled)
    const requestOrigin = await getPublicOrigin(request)

    // Map channels to expected client schema
    const mappedChannels = channels.map((c) => ({
      id: c.id,
      name: c.name,
      logo: c.logoUrl ? (c.logoUrl.startsWith('/') ? `${requestOrigin}${c.logoUrl}` : c.logoUrl) : null,
      group: c.category?.name || 'Uncategorized',
      stream_url: shouldProxyStreams
        ? createRelayedClientStreamUrl({
            channelId: c.id,
            origin: requestOrigin,
            streamUrl: c.streamUrl,
            allowUdpOnDemandRelay,
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

async function getPublicOrigin(request: Request): Promise<string> {
  const configuredOrigin = await getAppPublicOrigin()
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
  streamUrl,
  allowUdpOnDemandRelay,
}: {
  channelId: number
  origin: string
  streamUrl: string
  allowUdpOnDemandRelay: boolean
}): string {
  if (isUdpStreamUrl(streamUrl)) {
    return allowUdpOnDemandRelay
      ? new URL(createUdpOnDemandHlsPath(channelId), origin).toString()
      : streamUrl
  }

  return createPlayableStreamUrl({
    origin,
    streamUrl,
  })
}
