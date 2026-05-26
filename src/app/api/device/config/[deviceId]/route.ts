import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getErrorMessage } from '@/lib/errors'
import { DEFAULT_CUSTOM_M3U_URL, DEFAULT_SYNC_MODE, normalizeSyncMode } from '@/lib/defaults'
import { createDeviceConfigData, getDefaultDeviceConfig } from '@/lib/defaultDeviceConfig'
import { resolveEffectiveHomeExperience } from '@/lib/homeExperience'
import { getPrimaryNtpServer } from '@/lib/settings'
import { resolveEffectiveVideoBroadcast } from '@/lib/videoBroadcast'

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
      const defaultConfig = await getDefaultDeviceConfig()
      config = await prisma.deviceConfig.create({
        data: createDeviceConfigData(deviceId, defaultConfig),
      })
    }

    // If forceSync, clearCacheTrigger, or educationForceSync is true, we should reset it to false after sending so it only fires once on client
    const currentForceSync = config.forceSync
    const currentClearCache = config.clearCacheTrigger || false
    const currentEducationForceSync = config.educationForceSync || false

    if (currentForceSync || currentClearCache || currentEducationForceSync) {
      await prisma.deviceConfig.update({
        where: { id: config.id },
        data: { 
          forceSync: false,
          clearCacheTrigger: false,
          educationForceSync: false
        },
      })
    }

    // Get global playlist if it exists
    const globalPlaylist = await prisma.playlist.findFirst({
      where: { isGlobal: true }
    })
    const primaryNtpServer = await getPrimaryNtpServer()
    const [homeExperience, videoBroadcast] = await Promise.all([
      resolveEffectiveHomeExperience(device.deviceId),
      resolveEffectiveVideoBroadcast(device.deviceId),
    ])


    return NextResponse.json({
      status: true,
      message: 'Config loaded',
      data: {
        device_id: device.deviceId,
        active: device.isActive,
        playlist_id: normalizeSyncMode(config.syncMode || DEFAULT_SYNC_MODE) === 'custom' ? null : (globalPlaylist?.id || null),
        sync_mode: normalizeSyncMode(config.syncMode || DEFAULT_SYNC_MODE),
        custom_m3u_url: config.customM3uUrl || DEFAULT_CUSTOM_M3U_URL,
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
        education_repeat_mode: config.educationRepeatMode || 'all',
        education_play_order: config.educationPlayOrder || 'alphabetical',
        education_source: config.educationSource || 'smb',
        education_playback_mode: config.educationPlaybackMode || 'copy',
        education_force_sync: currentEducationForceSync,
        ntp_server: primaryNtpServer,
        home_experience_json: JSON.stringify(homeExperience),
        video_broadcast_json: JSON.stringify(videoBroadcast),
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
