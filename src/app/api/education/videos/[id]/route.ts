import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getErrorMessage } from '@/lib/errors'
import { writeFile, mkdir, unlink } from 'fs/promises'
import path from 'path'

const VIDEO_UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'videos')
const THUMB_UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'video-thumbnails')
const VIDEO_URL_PREFIX = '/uploads/videos/'
const THUMB_URL_PREFIX = '/uploads/video-thumbnails/'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const videoId = parseInt(id, 10)
    if (isNaN(videoId)) {
      return NextResponse.json({ status: false, message: 'Invalid ID' }, { status: 400 })
    }

    const existingVideo = await prisma.educationVideo.findUnique({
      where: { id: videoId },
    })

    if (!existingVideo) {
      return NextResponse.json({ status: false, message: 'Video tidak ditemukan' }, { status: 404 })
    }

    const formData = await request.formData()
    const title = formData.get('title') as string
    let videoUrl = formData.get('videoUrl') as string
    const videoFile = formData.get('videoFile') as File | null
    const folderId = nullableFolderId(formData)
    let thumbnailUrl = (formData.get('thumbnailUrl') as string)?.trim() || existingVideo.thumbnailUrl
    const thumbnailFile = formData.get('thumbnailFile') as File | null
    const removeThumbnail = formData.get('removeThumbnail') === 'on'

    if (!title) {
      return NextResponse.json({ status: false, message: 'Judul video wajib diisi.' }, { status: 400 })
    }

    // Handle File Upload if provided
    if (videoFile && videoFile.size > 0) {
      try {
        videoUrl = await saveUpload(videoFile, VIDEO_UPLOAD_DIR, VIDEO_URL_PREFIX)
        await removeLocalFile(existingVideo.videoUrl, VIDEO_URL_PREFIX)
      } catch (err: unknown) {
        console.error('Failed to write video file:', err)
        return NextResponse.json(
          { status: false, message: 'Gagal menulis berkas video ke disk server: ' + getErrorMessage(err) },
          { status: 500 }
        )
      }
    }

    if (!videoUrl) {
      videoUrl = existingVideo.videoUrl
    }

    if (removeThumbnail) {
      await removeLocalFile(existingVideo.thumbnailUrl, THUMB_URL_PREFIX)
      thumbnailUrl = null
    }

    if (thumbnailFile && thumbnailFile.size > 0) {
      try {
        thumbnailUrl = await saveUpload(thumbnailFile, THUMB_UPLOAD_DIR, THUMB_URL_PREFIX)
        await removeLocalFile(existingVideo.thumbnailUrl, THUMB_URL_PREFIX)
      } catch (err: unknown) {
        console.error('Failed to write thumbnail file:', err)
        return NextResponse.json(
          { status: false, message: 'Gagal menulis thumbnail ke disk server: ' + getErrorMessage(err) },
          { status: 500 }
        )
      }
    }

    const updated = await prisma.educationVideo.update({
      where: { id: videoId },
      data: {
        title,
        videoUrl,
        thumbnailUrl,
        folderId,
      },
    })

    return NextResponse.json({
      status: true,
      message: 'Video berhasil diperbarui!',
      data: updated,
    })
  } catch (error: unknown) {
    console.error('Update education video error:', error)
    return NextResponse.json(
      { status: false, message: 'Server error: ' + getErrorMessage(error) },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const videoId = parseInt(id, 10)
    if (isNaN(videoId)) {
      return NextResponse.json({ status: false, message: 'Invalid ID' }, { status: 400 })
    }

    const video = await prisma.educationVideo.findUnique({
      where: { id: videoId },
    })

    if (!video) {
      return NextResponse.json({ status: false, message: 'Video tidak ditemukan' }, { status: 404 })
    }

    // Delete local file if it was uploaded
    await removeLocalFile(video.videoUrl, VIDEO_URL_PREFIX)
    await removeLocalFile(video.thumbnailUrl, THUMB_URL_PREFIX)

    await prisma.educationVideo.delete({
      where: { id: videoId },
    })

    return NextResponse.json({
      status: true,
      message: 'Video berhasil dihapus dari repository!',
    })
  } catch (error: unknown) {
    console.error('Delete education video error:', error)
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

async function removeLocalFile(url: string | null | undefined, prefix: string): Promise<void> {
  if (!url?.startsWith(prefix)) return

  try {
    await unlink(path.join(process.cwd(), 'public', url))
  } catch (error) {
    console.warn('Failed to remove education asset:', error)
  }
}
