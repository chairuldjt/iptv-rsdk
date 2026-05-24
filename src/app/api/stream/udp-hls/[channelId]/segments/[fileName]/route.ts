import { NextResponse } from 'next/server'
import { getOnDemandHlsSegment } from '@/lib/onDemandHlsRelay'

export const revalidate = 0
export const runtime = 'nodejs'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ channelId: string; fileName: string }> }
) {
  const { channelId: rawChannelId, fileName } = await params
  const channelId = Number.parseInt(rawChannelId, 10)

  if (!Number.isInteger(channelId) || channelId <= 0) {
    return NextResponse.json(
      { status: false, message: 'Missing or invalid channelId.' },
      { status: 400 }
    )
  }

  try {
    const segment = await getOnDemandHlsSegment(channelId, fileName)
    return new Response(new Uint8Array(segment), {
      status: 200,
      headers: {
        'Content-Type': 'video/mp2t',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    return NextResponse.json(
      { status: false, message: error instanceof Error ? error.message : 'Unable to read HLS segment.' },
      { status: 404 }
    )
  }
}
