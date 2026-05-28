import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

const CONTENT_TYPES: Record<string, string> = {
  // Images
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  // Audio
  '.mp3': 'audio/mpeg',
  '.aac': 'audio/aac',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
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
    return new NextResponse('Invalid file path', { status: 400 })
  }

  const filePath = path.join(process.cwd(), 'public', 'uploads', 'home-experience', safeFileName)

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
      console.warn(`[HOME EXPERIENCE] File not found on disk: ${filePath}`)
      return new NextResponse('File Not Found', { status: 404 })
    }

    console.error('[HOME EXPERIENCE ERROR]:', error)
    return new NextResponse('Server error while reading file', { status: 500 })
  }
}
