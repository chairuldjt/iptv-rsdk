import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getOnDemandHlsManifest } from '@/lib/onDemandHlsRelay'
import { getHlsRelayBaseUrl } from '@/lib/settings'

export const revalidate = 0
export const runtime = 'nodejs'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const channelId = getChannelId(requestUrl)

  if (!Number.isInteger(channelId) || channelId <= 0) {
    return NextResponse.json(
      { status: false, message: 'Missing or invalid channelId.' },
      { status: 400 }
    )
  }

  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: {
      id: true,
      name: true,
      streamUrl: true,
      isActive: true,
    },
  })

  if (!channel || !channel.isActive) {
    return NextResponse.json(
      { status: false, message: !channel ? 'Channel not found.' : 'Channel is disabled.' },
      { status: !channel ? 404 : 403 }
    )
  }

  try {
    console.info(`UDP HLS relay request: channel=${channel.id} name="${channel.name}" url=${requestUrl.pathname}`)
    const manifest = await getOnDemandHlsManifest({
      channelId: channel.id,
      name: channel.name,
      streamUrl: channel.streamUrl,
      segmentBaseUrl: await getHlsRelayBaseUrl(),
    })

    return new Response(manifest, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl; charset=utf-8',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    console.error('UDP HLS relay error:', error)
    return NextResponse.json(
      { status: false, message: error instanceof Error ? error.message : 'Unable to start UDP HLS relay.' },
      { status: 502 }
    )
  }
}

function getChannelId(requestUrl: URL): number {
  const queryId = Number.parseInt(requestUrl.searchParams.get('channelId') || '', 10)
  if (Number.isInteger(queryId) && queryId > 0) {
    return queryId
  }

  const match = requestUrl.pathname.match(/\/api\/stream\/udp-hls\/(\d+)\/index\.m3u8$/)
  return Number.parseInt(match?.[1] || '', 10)
}
