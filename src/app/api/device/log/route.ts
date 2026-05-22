import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getErrorMessage } from '@/lib/errors'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { device_id, error_type, error_message, channel_id, stream_url, android_sdk } = body

    if (!device_id || !error_type || !error_message) {
      return NextResponse.json(
        { status: false, message: 'Missing required logging parameters' },
        { status: 400 }
      )
    }

    // Verify device exists first
    const device = await prisma.device.findUnique({
      where: { deviceId: device_id },
    })

    if (!device) {
      return NextResponse.json(
        { status: false, message: 'Device not registered' },
        { status: 404 }
      )
    }

    // Create log entry
    await prisma.deviceLog.create({
      data: {
        deviceId: device_id,
        errorType: error_type,
        errorMessage: error_message,
        channelId: channel_id ? parseInt(channel_id.toString()) : null,
        streamUrl: stream_url || null,
        androidSdk: android_sdk ? parseInt(android_sdk.toString()) : null,
      },
    })

    return NextResponse.json({
      status: true,
      message: 'Error log recorded successfully',
    })
  } catch (error: unknown) {
    console.error('Remote Log API Error:', error)
    return NextResponse.json(
      { status: false, message: 'Server error: ' + getErrorMessage(error) },
      { status: 500 }
    )
  }
}
