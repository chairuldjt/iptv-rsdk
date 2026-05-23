import { NextResponse } from 'next/server'
import { popCommands } from '@/lib/remoteQueue'

export const revalidate = 0 // Disable cache for API polling

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get('deviceId')

    if (!deviceId) {
      return NextResponse.json(
        { status: false, message: 'Missing deviceId parameter' },
        { status: 400 }
      )
    }

    // Long polling loop: wait up to 4.5 seconds for a command to arrive
    const startTime = Date.now()
    const pollTimeout = 4500 // 4.5 seconds

    while (Date.now() - startTime < pollTimeout) {
      const commands = popCommands(deviceId)
      if (commands.length > 0) {
        return NextResponse.json({
          status: true,
          commands: commands.map(c => ({
            command: c.command,
            value: c.value || null
          }))
        })
      }
      
      // Delay for 200ms before checking the in-memory map again
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    // Timeout reached, return empty commands array
    return NextResponse.json({
      status: true,
      commands: []
    })
  } catch (error: any) {
    console.error('Remote Poll API Error:', error)
    return NextResponse.json(
      { status: false, message: 'Server error: ' + error.message },
      { status: 500 }
    )
  }
}
