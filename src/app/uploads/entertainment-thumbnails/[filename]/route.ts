import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

const CONTENT_TYPES: Record<string, string> = {
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
}

function isNodeFileError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params
  const safeFileName = path.basename(filename)

  if (!safeFileName || safeFileName !== filename) {
    return new NextResponse('Invalid thumbnail path', { status: 400 })
  }

  const filePath = path.join(process.cwd(), 'public', 'uploads', 'entertainment-thumbnails', safeFileName)

  try {
    const fileBuffer = await readFile(filePath)
    const ext = path.extname(safeFileName).toLowerCase()

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': CONTENT_TYPES[ext] || 'application/octet-stream',
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error: unknown) {
    if (isNodeFileError(error) && error.code === 'ENOENT') {
      console.warn(`[ENTERTAINMENT THUMBNAIL] File not found on disk: ${filePath}`)
      return new NextResponse('Thumbnail Not Found', { status: 404 })
    }

    console.error('[ENTERTAINMENT THUMBNAIL ERROR]:', error)
    return new NextResponse('Server error while reading thumbnail', { status: 500 })
  }
}
