import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getErrorMessage } from '@/lib/errors'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { device_id, local_ip } = body

    if (!device_id) {
      return NextResponse.json(
        { status: false, message: 'Missing device_id parameter' },
        { status: 400 }
      )
    }

    // Find device and config
    const device = await prisma.device.findUnique({
      where: { deviceId: device_id },
      include: { config: true },
    })

    if (!device) {
      return NextResponse.json(
        { status: false, message: 'Device not registered' },
        { status: 404 }
      )
    }

    // Update last online and local IP
    const updatedDevice = await prisma.device.update({
      where: { deviceId: device_id },
      data: {
        lastOnline: new Date(),
        lastIp: local_ip || device.lastIp,
      },
      include: { config: true },
    })

    const config = updatedDevice.config

    return NextResponse.json({
      status: true,
      message: 'Heartbeat accepted',
      data: {
        force_sync: config?.forceSync ?? false,
        lock_settings: config?.lockSettings ?? true,
        active: updatedDevice.isActive,
      },
    })
  } catch (error: unknown) {
    console.error('Heartbeat API Error:', error)
    return NextResponse.json(
      { status: false, message: 'Server error: ' + getErrorMessage(error) },
      { status: 500 }
    )
  }
}
