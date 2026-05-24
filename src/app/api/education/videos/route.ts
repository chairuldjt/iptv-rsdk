import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getErrorMessage } from '@/lib/errors'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export const revalidate = 0 // Disable cache

const VIDEO_UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'videos')
const THUMB_UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'video-thumbnails')
const VIDEO_URL_PREFIX = '/uploads/videos/'
const THUMB_URL_PREFIX = '/uploads/video-thumbnails/'

export async function GET() {
  try {
    const [folders, videos] = await Promise.all([
      prisma.educationFolder.findMany({
        where: { isPublished: true },
        orderBy: { name: 'asc' },
        include: { _count: { select: { videos: { where: { isPublished: true } } } } },
      }),
      prisma.educationVideo.findMany({
        where: {
          isPublished: true,
          OR: [
            { folderId: null },
            { folder: { isPublished: true } },
          ],
        },
        include: { folder: true },
        orderBy: [{ folder: { name: 'asc' } }, { title: 'asc' }],
      }),
    ])

    return NextResponse.json({
      status: true,
      message: 'Videos loaded',
      folders: folders.map(folder => ({
        id: folder.id,
        name: folder.name,
        video_count: folder._count.videos,
      })),
      data: videos.map(v => ({
        id: v.id,
        title: v.title,
        video_url: v.videoUrl,
        thumbnail_url: v.thumbnailUrl,
        folder_id: v.folderId,
        folder_name: v.folder?.name || null,
        createdAt: v.createdAt,
      })),
    })
  } catch (error: unknown) {
    console.error('Get education videos error:', error)
    return NextResponse.json(
      { status: false, message: 'Server error: ' + getErrorMessage(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const title = formData.get('title') as string
    let videoUrl = formData.get('videoUrl') as string
    const videoFile = formData.get('videoFile') as File | null
    const folderId = nullableFolderId(formData)
    let thumbnailUrl = (formData.get('thumbnailUrl') as string)?.trim() || null
    const thumbnailFile = formData.get('thumbnailFile') as File | null

    if (!title) {
      return NextResponse.json(
        { status: false, message: 'Judul video wajib diisi.' },
        { status: 400 }
      )
    }

    // Handle File Upload if provided
    if (videoFile && videoFile.size > 0) {
      try {
        videoUrl = await saveUpload(videoFile, VIDEO_UPLOAD_DIR, VIDEO_URL_PREFIX)
      } catch (err: unknown) {
        console.error('Failed to write video file:', err)
        return NextResponse.json(
          { status: false, message: 'Gagal menulis berkas video ke disk server.' },
          { status: 500 }
        )
      }
    }

    if (thumbnailFile && thumbnailFile.size > 0) {
      try {
        thumbnailUrl = await saveUpload(thumbnailFile, THUMB_UPLOAD_DIR, THUMB_URL_PREFIX)
      } catch (err: unknown) {
        console.error('Failed to write thumbnail file:', err)
        return NextResponse.json(
          { status: false, message: 'Gagal menulis thumbnail ke disk server.' },
          { status: 500 }
        )
      }
    }

    if (!videoUrl) {
      return NextResponse.json(
        { status: false, message: 'Harap masukkan URL video atau unggah berkas video.' },
        { status: 400 }
      )
    }

    const video = await prisma.educationVideo.create({
      data: {
        title,
        videoUrl,
        thumbnailUrl,
        folderId,
        isPublished: true,
      },
    })

    return NextResponse.json({
      status: true,
      message: 'Video berhasil ditambahkan!',
      data: video,
    })
  } catch (error: unknown) {
    console.error('Create education video error:', error)
    return NextResponse.json(
      { status: false, message: 'Server error: ' + getErrorMessage(error) },
      { status: 500 }
    )
  }
}

function nullableFolderId(formData: FormData): number | null {
  const parsed = parseInt((formData.get('folderId') as string) || '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

async function saveUpload(file: File, uploadDir: string, publicPrefix: string): Promise<string> {
  await mkdir(uploadDir, { recursive: true })
  const buffer = Buffer.from(await file.arrayBuffer())
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '') || 'upload.bin'
  const fileName = `${Date.now()}_${safeName}`
  await writeFile(path.join(uploadDir, fileName), buffer)
  return `${publicPrefix}${fileName}`
}
