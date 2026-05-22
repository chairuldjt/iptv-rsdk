import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getErrorMessage } from '@/lib/errors'

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

    if (!device || !device.isActive) {
      return NextResponse.json(
        { status: false, message: !device ? 'Device not found' : 'Device is inactive', data: null },
        { status: !device ? 404 : 403 }
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
          educationVideoPath: '',
          educationSmbUsername: '',
          educationSmbPassword: '',
          educationSmbDomain: '',
        },
      })
    }

    // If forceSync or clearCacheTrigger is true, we should reset it to false after sending so it only fires once on client
    const currentForceSync = config.forceSync
    const currentClearCache = config.clearCacheTrigger || false

    if (currentForceSync || currentClearCache) {
      await prisma.deviceConfig.update({
        where: { id: config.id },
        data: { 
          forceSync: false,
          clearCacheTrigger: false
        },
      })
    }

    // Get global playlist if it exists
    const globalPlaylist = await prisma.playlist.findFirst({
      where: { isGlobal: true }
    })

    return NextResponse.json({
      status: true,
      message: 'Config loaded',
      data: {
        device_id: device.deviceId,
        active: device.isActive,
        playlist_id: config.syncMode === 'custom' ? null : (globalPlaylist?.id || null),
        sync_mode: config.syncMode || 'api',
        custom_m3u_url: config.customM3uUrl || '',
        default_category: config.defaultCategory,
        default_channel_id: config.defaultChannelId,
        aspect_ratio: config.aspectRatio,
        sync_interval: config.syncInterval,
        start_screen: config.startScreen,
        lock_settings: config.lockSettings,
        force_sync: currentForceSync,
        clear_cache_trigger: currentClearCache,
        auto_start_on_boot: config.autoStartOnBoot,
        technician_pin_enabled: true,
        technician_pin: config.technicianPin,
        education_video_path: config.educationVideoPath,
        education_smb_username: config.educationSmbUsername,
        education_smb_password: config.educationSmbPassword,
        education_smb_domain: config.educationSmbDomain,
      },
    })
  } catch (error: unknown) {
    console.error('Config API Error:', error)
    return NextResponse.json(
      { status: false, message: 'Server error: ' + getErrorMessage(error) },
      { status: 500 }
    )
  }
}
