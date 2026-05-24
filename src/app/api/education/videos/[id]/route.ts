import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getErrorMessage } from '@/lib/errors'
import { writeFile, mkdir, unlink } from 'fs/promises'
import path from 'path'

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

    if (!title) {
      return NextResponse.json({ status: false, message: 'Judul video wajib diisi.' }, { status: 400 })
    }

    // Handle File Upload if provided
    if (videoFile && videoFile.size > 0) {
      const buffer = Buffer.from(await videoFile.arrayBuffer())
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'videos')

      try {
        await mkdir(uploadDir, { recursive: true })
      } catch (err) {
        console.error('Failed to create videos upload directory:', err)
      }

      const safeFileName = `${Date.now()}_${videoFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`
      const filePath = path.join(uploadDir, safeFileName)

      try {
        await writeFile(filePath, buffer)
        
        // Delete old local file if existed
        if (existingVideo.videoUrl.startsWith('/uploads/videos/')) {
          const oldFilePath = path.join(process.cwd(), 'public', existingVideo.videoUrl)
          try {
            await unlink(oldFilePath)
          } catch (e) {
            console.warn('Failed to delete old video file:', e)
          }
        }

        videoUrl = `/uploads/videos/${safeFileName}`
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

    const updated = await prisma.educationVideo.update({
      where: { id: videoId },
      data: {
        title,
        videoUrl,
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
    if (video.videoUrl.startsWith('/uploads/videos/')) {
      const filePath = path.join(process.cwd(), 'public', video.videoUrl)
      try {
        await unlink(filePath)
      } catch (err) {
        console.error('Failed to delete video file on disk:', err)
      }
    }

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
