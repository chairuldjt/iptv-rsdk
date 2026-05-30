import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import JSZip from 'jszip'
import {
  exportHomeExperienceProfile,
  collectHomeExperienceAssetUrls,
} from '@/lib/homeExperience'

export async function GET(request: NextRequest) {
  const profileId = request.nextUrl.searchParams.get('profileId')
  if (!profileId) {
    return NextResponse.json({ error: 'Missing profileId' }, { status: 400 })
  }

  const exportData = await exportHomeExperienceProfile(profileId)
  if (!exportData) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const zip = new JSZip()
  zip.file('profile.json', JSON.stringify(exportData, null, 2))

  const assetUrls = collectHomeExperienceAssetUrls(exportData.config)
  const publicDir = path.join(process.cwd(), 'public')

  for (const assetUrl of assetUrls) {
    try {
      const filePath = path.join(publicDir, assetUrl)
      const fileBuffer = await fs.readFile(filePath)
      const relativePath = assetUrl.startsWith('/') ? assetUrl.slice(1) : assetUrl
      zip.file(relativePath, fileBuffer)
    } catch {
      // Asset not found, skip
    }
  }

  const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' })
  const fileName = `${exportData.profile.name.replace(/[^a-zA-Z0-9]/g, '_')}_export.zip`

  return new NextResponse(zipBuffer, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  })
}
