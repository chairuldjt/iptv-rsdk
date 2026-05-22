import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getErrorMessage } from '@/lib/errors'
import { DEFAULT_CUSTOM_M3U_URL, DEFAULT_SYNC_MODE } from '@/lib/defaults'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { device_id, device_name, app_version, android_version, mac_address, local_ip } = body

    if (!device_id) {
      return NextResponse.json(
        { status: false, message: 'Missing device_id parameter' },
        { status: 400 }
      )
    }

    // Check if device exists
    let device = await prisma.device.findUnique({
      where: { deviceId: device_id },
      include: { config: true },
    })
 
    if (!device) {
      // If UUID doesn't match, check if we have a match by MAC address to preserve device data (e.g. after reinstall)
      if (mac_address) {
        const existingDeviceByMac = await prisma.device.findFirst({
          where: { macAddress: mac_address },
          include: { config: true },
        })
 
        if (existingDeviceByMac) {
          // Hardware match found! Update deviceId (which cascades automatically to DeviceConfig)
          device = await prisma.device.update({
            where: { id: existingDeviceByMac.id },
            data: {
              deviceId: device_id,
              deviceName: device_name || existingDeviceByMac.deviceName,
              appVersion: app_version || existingDeviceByMac.appVersion,
              androidVersion: android_version || existingDeviceByMac.androidVersion,
              lastIp: local_ip || existingDeviceByMac.lastIp,
              lastOnline: new Date(),
            },
            include: { config: true },
          })
        }
      }
    }
 
    if (!device) {
      // Device does not exist (fully new device) -> Register it as Active by default
      device = await prisma.$transaction(async (tx) => {
        const newDevice = await tx.device.create({
          data: {
            deviceId: device_id,
            deviceName: device_name || 'Android STB',
            isActive: true,
            appVersion: app_version,
            androidVersion: android_version,
            lastIp: local_ip,
            macAddress: mac_address,
            lastOnline: new Date(),
          },
        })
 
        // Create default config for this new device
        const newConfig = await tx.deviceConfig.create({
          data: {
            deviceId: device_id,
            defaultCategory: 'National TV',
            aspectRatio: 'fit',
            syncInterval: 1800,
            syncMode: DEFAULT_SYNC_MODE,
            customM3uUrl: DEFAULT_CUSTOM_M3U_URL,
            startScreen: 'live_tv',
            lockSettings: true,
            forceSync: false,
            autoStartOnBoot: false,
            technicianPin: '2468',
          },
        })
 
        return { ...newDevice, config: newConfig }
      })
 
      return NextResponse.json({
        status: true,
        message: 'Device registered and active',
        data: {
          device_id: device.deviceId,
          active: device.isActive,
          sync_interval: device.config?.syncInterval ?? 1800,
        },
      })
    } else {
      // Device exists -> Update heartbeat details
      const updatedDevice = await prisma.device.update({
        where: { deviceId: device_id },
        data: {
          deviceName: device_name || device.deviceName,
          appVersion: app_version || device.appVersion,
          androidVersion: android_version || device.androidVersion,
          lastIp: local_ip || device.lastIp,
          macAddress: mac_address || device.macAddress,
          lastOnline: new Date(),
        },
        include: { config: true },
      })

      return NextResponse.json({
        status: true,
        message: updatedDevice.isActive ? 'Device registered and active' : 'Device registered but inactive',
        data: {
          device_id: updatedDevice.deviceId,
          active: updatedDevice.isActive,
          sync_interval: updatedDevice.config?.syncInterval ?? 1800,
        },
      })
    }
  } catch (error: unknown) {
    console.error('Registration API Error:', error)
    return NextResponse.json(
      { status: false, message: 'Server error: ' + getErrorMessage(error) },
      { status: 500 }
    )
  }
}
