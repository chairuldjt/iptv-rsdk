import { NextResponse } from 'next/server'
import { deviceScreens, activeScreenRequests } from '@/lib/remoteQueue'

// Disable caching for live screen transmission
export const revalidate = 0

// POST: Upload screenshot from Android or change active request status from Web Dashboard
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { deviceId, image, active } = body

    if (!deviceId) {
      return NextResponse.json(
        { status: false, message: 'Missing deviceId parameter' },
        { status: 400 }
      )
    }

    // Branch 1: Android client uploading a base64 screenshot
    if (image !== undefined) {
      deviceScreens.set(deviceId, image)
      return NextResponse.json({
        status: true,
        message: 'Screenshot uploaded successfully'
      })
    }

    // Branch 2: Web Dashboard turning screenshot stream ON or OFF
    if (active !== undefined) {
      if (active) {
        activeScreenRequests.add(deviceId)
      } else {
        activeScreenRequests.delete(deviceId)
        // Clear cached image if stopping to avoid showing stale screen next time
        deviceScreens.delete(deviceId)
      }
      return NextResponse.json({
        status: true,
        message: `Screenshot preview ${active ? 'activated' : 'deactivated'} for device: ${deviceId}`
      })
    }

    return NextResponse.json(
      { status: false, message: 'Invalid payload: must contain image or active parameter' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('Remote Screenshot POST Error:', error)
    return NextResponse.json(
      { status: false, message: 'Server error: ' + error.message },
      { status: 500 }
    )
  }
}

// GET: Web Dashboard fetching the latest screenshot frame
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get('deviceId')

    if (!deviceId) {
      return NextResponse.json({
        status: true,
        devices: Array.from(deviceScreens.keys()),
        activeRequests: Array.from(activeScreenRequests)
      })
    }

    const image = deviceScreens.get(deviceId) || null

    return NextResponse.json({
      status: true,
      image,
      isStreaming: activeScreenRequests.has(deviceId)
    })
  } catch (error: any) {
    console.error('Remote Screenshot GET Error:', error)
    return NextResponse.json(
      { status: false, message: 'Server error: ' + error.message },
      { status: 500 }
    )
  }
}
