import { NextResponse } from 'next/server'
import { popCommands, activeScreenRequests } from '@/lib/remoteQueue'
import { getErrorMessage } from '@/lib/errors'

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

    const hasScreenshotRequest = activeScreenRequests.has(deviceId)

    // Long polling loop: wait up to 4.5 seconds for a command to arrive
    const startTime = Date.now()
    const pollTimeout = 4500 // 4.5 seconds

    while (Date.now() - startTime < pollTimeout) {
      const commands = popCommands(deviceId)
      
      // If commands are received, OR if the activeScreenRequest state has changed,
      // return immediately so the client can react.
      if (commands.length > 0 || activeScreenRequests.has(deviceId) !== hasScreenshotRequest) {
        return NextResponse.json({
          status: true,
          capture_screenshot: activeScreenRequests.has(deviceId),
          commands: commands.map(c => ({
            command: c.command,
            value: c.value || null
          }))
        })
      }
      
      // Delay for 200ms before checking again
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    // Timeout reached, return empty commands array with current screenshot state
    return NextResponse.json({
      status: true,
      capture_screenshot: activeScreenRequests.has(deviceId),
      commands: []
    })
  } catch (error: unknown) {
    console.error('Remote Poll API Error:', error)
    return NextResponse.json(
      { status: false, message: 'Server error: ' + getErrorMessage(error) },
      { status: 500 }
    )
  }
}
