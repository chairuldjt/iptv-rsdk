import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getErrorMessage } from '@/lib/errors'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const versionCodeStr = searchParams.get('versionCode')

    if (!versionCodeStr) {
      return NextResponse.json(
        { status: false, message: 'Missing versionCode parameter' },
        { status: 400 }
      )
    }

    const currentVersionCode = parseInt(versionCodeStr, 10)
    if (isNaN(currentVersionCode)) {
      return NextResponse.json(
        { status: false, message: 'Invalid versionCode format' },
        { status: 400 }
      )
    }

    // Get the currently active deployed update
    const activeUpdate = await prisma.appUpdate.findFirst({
      where: { isDeployed: true },
      orderBy: { versionCode: 'desc' }, // fallback in case multiple are set
    })

    if (!activeUpdate) {
      return NextResponse.json({
        status: true,
        update_available: false,
        message: 'No deployed updates found',
      })
    }

    const updateAvailable = activeUpdate.versionCode > currentVersionCode

    // Construct download URL dynamically from request host
    const host = request.headers.get('host') || 'localhost:3000'
    const protocol = request.headers.get('x-forwarded-proto') || 'http'
    const apkUrl = `${protocol}://${host}/uploads/apk/${activeUpdate.apkFileName}`

    return NextResponse.json({
      status: true,
      update_available: updateAvailable,
      version_name: activeUpdate.versionName,
      version_code: activeUpdate.versionCode,
      apk_url: apkUrl,
      apk_file_name: activeUpdate.apkFileName,
      is_mandatory: activeUpdate.isMandatory,
      changelog: activeUpdate.changelog,
    })
  } catch (error: unknown) {
    console.error('App Update API Error:', error)
    return NextResponse.json(
      { status: false, message: 'Server error: ' + getErrorMessage(error) },
      { status: 500 }
    )
  }
}
