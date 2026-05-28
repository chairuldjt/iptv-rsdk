import { NextResponse } from 'next/server'
import { readFile, stat } from 'fs/promises'
import path from 'path'

const CONTENT_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo',
  '.mov': 'video/quicktime',
  '.m4v': 'video/x-m4v',
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
    return new NextResponse('Invalid video path', { status: 400 })
  }

  const filePath = path.join(process.cwd(), 'public', 'uploads', 'videos', safeFileName)

  try {
    const fileStat = await stat(filePath)
    const fileSize = fileStat.size
    const ext = path.extname(safeFileName).toLowerCase()
    const contentType = CONTENT_TYPES[ext] || 'application/octet-stream'

    const rangeHeader = request.headers.get('range')

    if (rangeHeader) {
      const [startStr, endStr] = rangeHeader.replace(/bytes=/, '').split('-')
      const start = parseInt(startStr, 10)
      const end = endStr ? parseInt(endStr, 10) : fileSize - 1
      const chunkSize = end - start + 1

      const fileBuffer = await readFile(filePath)
      const chunk = fileBuffer.subarray(start, end + 1)

      return new NextResponse(new Uint8Array(chunk), {
        status: 206,
        headers: {
          'Content-Type': contentType,
          'Content-Length': chunkSize.toString(),
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=3600',
        },
      })
    }

    const fileBuffer = await readFile(filePath)

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileSize.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error: unknown) {
    if (isNodeFileError(error) && error.code === 'ENOENT') {
      console.warn(`[VIDEO] File not found on disk: ${filePath}`)
      return new NextResponse('Video Not Found', { status: 404 })
    }

    console.error('[VIDEO ERROR]:', error)
    return new NextResponse('Server error while reading video', { status: 500 })
  }
}
