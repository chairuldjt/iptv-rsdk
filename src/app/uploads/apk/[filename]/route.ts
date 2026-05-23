import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params
    
    // Construct the absolute path to the file inside public/uploads/apk
    const filePath = path.join(process.cwd(), 'public', 'uploads', 'apk', filename)

    // Read file from disk
    let fileBuffer: Buffer
    try {
      fileBuffer = await readFile(filePath)
    } catch (e: any) {
      if (e.code === 'ENOENT') {
        console.warn(`[APK DOWNLOAD] File not found on disk: ${filePath}`)
        return new NextResponse('APK File Not Found', { status: 404 })
      }
      throw e
    }

    // Return the file with proper headers for APK files
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Length': fileBuffer.length.toString(),
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    })
  } catch (error: any) {
    console.error('[APK DOWNLOAD ERROR]:', error)
    return NextResponse.json(
      { status: false, message: 'Server error: ' + error.message },
      { status: 500 }
    )
  }
}
