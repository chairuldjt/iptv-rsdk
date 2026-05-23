import { NextResponse } from 'next/server'
import { deviceScreens } from '@/lib/remoteQueue'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { deviceId, image } = body

    if (!deviceId) {
      return NextResponse.json(
        { status: false, message: 'Missing deviceId parameter' },
        { status: 400 }
      )
    }

    if (image !== undefined) {
      deviceScreens.set(deviceId, image)
      return NextResponse.json({
        status: true,
        message: 'Screenshot uploaded successfully'
      })
    }

    return NextResponse.json(
      { status: false, message: 'Invalid payload: must contain image' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('Remote Screenshot Upload POST Error:', error)
    return NextResponse.json(
      { status: false, message: 'Server error: ' + error.message },
      { status: 500 }
    )
  }
}
