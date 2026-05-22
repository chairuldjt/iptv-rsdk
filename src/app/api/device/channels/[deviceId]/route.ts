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

    if (!device.isActive) {
      return NextResponse.json({
        status: false,
        message: 'Device has been deactivated',
        data: [],
      })
    }

    // Determine the playlist ID
    let playlistId = device.playlistId

    if (!playlistId) {
      // Use the global default playlist (e.g. the first one or latest one in the database)
      const defaultPlaylist = await prisma.playlist.findFirst({
        orderBy: { updatedAt: 'desc' },
      })
      if (defaultPlaylist) {
        playlistId = defaultPlaylist.id
      }
    }

    if (!playlistId) {
      return NextResponse.json({
        status: true,
        message: 'No active playlists available on server',
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
