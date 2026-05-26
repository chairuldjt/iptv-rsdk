import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getErrorMessage } from '@/lib/errors'
import { resolvePublicOrigin } from '@/lib/publicOrigin'

export const revalidate = 0

export async function GET(request: Request) {
  try {
    const activeUpdate = await prisma.appUpdate.findFirst({
      where: { isDeployed: true },
      orderBy: { versionCode: 'desc' },
    })

    if (!activeUpdate) {
      return new NextResponse('No deployed APK found', { status: 404 })
    }

    const origin = await resolvePublicOrigin(request)
    const downloadUrl = new URL(`/uploads/apk/${encodeURIComponent(activeUpdate.apkFileName)}`, origin)

    return NextResponse.redirect(downloadUrl, { status: 307 })
  } catch (error: unknown) {
    console.error('[LATEST APK DOWNLOAD ERROR]:', error)
    return NextResponse.json(
      { status: false, message: 'Server error: ' + getErrorMessage(error) },
      { status: 500 }
    )
  }
}
