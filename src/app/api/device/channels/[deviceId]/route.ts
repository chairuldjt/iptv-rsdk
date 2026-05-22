import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

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

    if (!device) {
      return NextResponse.json(
        { status: false, message: 'Device not registered', data: [] },
        { status: 404 }
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
      include: {
        category: true,
      },
      orderBy: {
        sortOrder: 'asc',
      },
    })

    // Map channels to expected client schema
    const mappedChannels = channels.map((c) => ({
      id: c.id,
      name: c.name,
      logo: c.logoUrl,
      group: c.category?.name || 'Uncategorized',
      stream_url: c.streamUrl,
      sort_order: c.sortOrder,
      active: c.isActive,
    }))

    return NextResponse.json({
      status: true,
      message: 'Channels loaded',
      data: mappedChannels,
    })
  } catch (error: any) {
    console.error('Channels API Error:', error)
    return NextResponse.json(
      { status: false, message: 'Server error: ' + error.message },
      { status: 500 }
    )
  }
}
