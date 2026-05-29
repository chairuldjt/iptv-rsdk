import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getErrorMessage } from '@/lib/errors'
import { createDeviceConfigData, getDefaultDeviceConfig } from '@/lib/defaultDeviceConfig'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { device_id, device_name, device_name_updated_at, app_version, app_version_code, android_version, mac_address, local_ip, api_base_url_confirmed, screen_width, screen_height, screen_dpi } = body

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
          // Selalu update nama jika berbeda — last sender wins
          const shouldUpdateName = device_name && device_name !== existingDeviceByMac.deviceName

          device = await prisma.device.update({
            where: { id: existingDeviceByMac.id },
            data: {
              deviceId: device_id,
              ...(shouldUpdateName ? { deviceName: device_name, deviceNameUpdatedAt: new Date() } : {}),
              appVersion: app_version || existingDeviceByMac.appVersion,
              appVersionCode: app_version_code ?? existingDeviceByMac.appVersionCode,
              androidVersion: android_version || existingDeviceByMac.androidVersion,
              lastIp: local_ip || existingDeviceByMac.lastIp,
              lastOnline: new Date(),
              ...(screen_width ? { screenWidth: screen_width } : {}),
              ...(screen_height ? { screenHeight: screen_height } : {}),
              ...(screen_dpi ? { screenDpi: screen_dpi } : {}),
            },
            include: { config: true },
          })
        }
      }
    }
 
    if (!device) {
      // Device does not exist (fully new device) -> Register it as Active by default
      const defaultConfig = await getDefaultDeviceConfig()
      device = await prisma.$transaction(async (tx) => {
        const newDevice = await tx.device.create({
          data: {
            deviceId: device_id,
            deviceName: device_name || 'Android STB',
            isActive: true,
            appVersion: app_version,
            appVersionCode: app_version_code ?? null,
            androidVersion: android_version,
            lastIp: local_ip,
            macAddress: mac_address,
            lastOnline: new Date(),
            screenWidth: screen_width ?? null,
            screenHeight: screen_height ?? null,
            screenDpi: screen_dpi ?? null,
          },
        })
 
        // Create default config for this new device
        const newConfig = await tx.deviceConfig.create({
          data: createDeviceConfigData(device_id, defaultConfig),
        })
 
        return { ...newDevice, config: newConfig }
      })
 
      return NextResponse.json({
        status: true,
        message: 'Device registered and active',
        data: {
          device_id: device.deviceId,
          device_name: device.deviceName,
          active: device.isActive,
          sync_interval: device.config?.syncInterval ?? 1800,
          is_new_device: true,
        },
      })
    } else {
      // Device exists -> Update heartbeat details
      // Selalu update nama jika berbeda — last sender wins
      const shouldUpdateName = device_name && device_name !== device.deviceName

      const updatedDevice = await prisma.device.update({
        where: { deviceId: device_id },
        data: {
          ...(shouldUpdateName ? { deviceName: device_name, deviceNameUpdatedAt: new Date() } : {}),
          appVersion: app_version || device.appVersion,
          appVersionCode: app_version_code ?? device.appVersionCode,
          androidVersion: android_version || device.androidVersion,
          lastIp: local_ip || device.lastIp,
          macAddress: mac_address || device.macAddress,
          lastOnline: new Date(),
          ...(screen_width ? { screenWidth: screen_width } : {}),
          ...(screen_height ? { screenHeight: screen_height } : {}),
          ...(screen_dpi ? { screenDpi: screen_dpi } : {}),
          // Jika Android konfirmasi sudah pindah ke URL baru, reset apiBaseUrl di server
          // agar tidak dikirim lagi ke device lain atau saat sync berikutnya
          ...(api_base_url_confirmed === true ? {
            config: { update: { apiBaseUrl: null } }
          } : {}),
        },
        include: { config: true },
      })

      return NextResponse.json({
        status: true,
        message: updatedDevice.isActive ? 'Device registered and active' : 'Device registered but inactive',
        data: {
          device_id: updatedDevice.deviceId,
          device_name: updatedDevice.deviceName,
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
