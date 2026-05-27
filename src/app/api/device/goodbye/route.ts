import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getErrorMessage } from '@/lib/errors'

// Device memanggil endpoint ini sebelum pindah ke server baru
// agar status online di server lama langsung di-reset (tidak stuck online)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { device_id } = body

    if (!device_id) {
      return NextResponse.json(
        { status: false, message: 'Missing device_id' },
        { status: 400 }
      )
    }

    // Set lastOnline ke waktu yang sudah melewati threshold online (11 menit lalu)
    // sehingga device langsung dianggap offline di dashboard
    const elevenMinutesAgo = new Date(Date.now() - 11 * 60 * 1000)

    await prisma.device.updateMany({
      where: { deviceId: device_id },
      data: { lastOnline: elevenMinutesAgo },
    })

    return NextResponse.json({ status: true, message: 'Device marked offline' })
  } catch (error: unknown) {
    console.error('Goodbye API Error:', error)
    return NextResponse.json(
      { status: false, message: 'Server error: ' + getErrorMessage(error) },
      { status: 500 }
    )
  }
}
