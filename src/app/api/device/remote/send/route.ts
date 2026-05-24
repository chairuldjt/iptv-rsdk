import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getErrorMessage } from '@/lib/errors'
import { pushCommand } from '@/lib/remoteQueue'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { deviceId, command, value } = body

    if (!deviceId || !command) {
      return NextResponse.json(
        { status: false, message: 'Missing deviceId or command parameter' },
        { status: 400 }
      )
    }

    // 1. Verify the device exists
    const device = await prisma.device.findUnique({
      where: { deviceId },
    })

    if (!device) {
      return NextResponse.json(
        { status: false, message: 'Device not found on server' },
        { status: 404 }
      )
    }

    // 2. Push command to the queue
    pushCommand(deviceId, command, value)

    return NextResponse.json({
      status: true,
      message: `Successfully queued command: ${command}`,
    })
  } catch (error: unknown) {
    console.error('Remote Command API Error:', error)
    return NextResponse.json(
      { status: false, message: 'Server error: ' + getErrorMessage(error) },
      { status: 500 }
    )
  }
}
