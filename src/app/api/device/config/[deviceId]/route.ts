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

    // Retrieve device and config
    const device = await prisma.device.findUnique({
      where: { deviceId },
      include: { config: true },
    })

    if (!device) {
      return NextResponse.json(
        { status: false, message: 'Device not found', data: null },
        { status: 404 }
      )
    }

    // Create a config if it somehow doesn't exist yet
    let config = device.config
    if (!config) {
      config = await prisma.deviceConfig.create({
        data: {
          deviceId,
          defaultCategory: 'National TV',
          aspectRatio: 'fit',
          syncInterval: 1800,
          startScreen: 'live_tv',
          lockSettings: true,
          forceSync: false,
          autoStartOnBoot: false,
          technicianPin: '2468',
        },
      })
    }

    // If forceSync is true, we should reset it to false after sending so it only fires once on client
    if (config.forceSync) {
      await prisma.deviceConfig.update({
        where: { id: config.id },
        data: { forceSync: false },
      })
    }

    return NextResponse.json({
      status: true,
      message: 'Config loaded',
      data: {
        device_id: device.deviceId,
        active: device.isActive,
        playlist_id: device.playlistId,
        default_category: config.defaultCategory,
        default_channel_id: config.defaultChannelId,
        aspect_ratio: config.aspectRatio,
        sync_interval: config.syncInterval,
        start_screen: config.startScreen,
        lock_settings: config.lockSettings,
        force_sync: config.forceSync, // Send the true flag this one time
        auto_start_on_boot: config.autoStartOnBoot,
        technician_pin_enabled: true,
      },
    })
  } catch (error: any) {
    console.error('Config API Error:', error)
    return NextResponse.json(
      { status: false, message: 'Server error: ' + error.message },
      { status: 500 }
    )
  }
}
