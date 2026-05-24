import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getErrorMessage } from '@/lib/errors'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export const revalidate = 0 // Disable cache

export async function GET() {
  try {
    const videos = await prisma.educationVideo.findMany({
      orderBy: { title: 'asc' },
    })

    return NextResponse.json({
      status: true,
      message: 'Videos loaded',
      data: videos.map(v => ({
        id: v.id,
        title: v.title,
        video_url: v.videoUrl,
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

    if (!title) {
      return NextResponse.json(
        { status: false, message: 'Judul video wajib diisi.' },
        { status: 400 }
      )
    }

    // Handle File Upload if provided
    if (videoFile && videoFile.size > 0) {
      const buffer = Buffer.from(await videoFile.arrayBuffer())
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'videos')

      try {
        await mkdir(uploadDir, { recursive: true })
      } catch (err: unknown) {
        console.error('Failed to create videos upload directory:', err)
        return NextResponse.json(
          { status: false, message: 'Gagal membuat folder upload di server.' },
          { status: 500 }
        )
      }

      const safeFileName = `${Date.now()}_${videoFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`
      const filePath = path.join(uploadDir, safeFileName)

      try {
        await writeFile(filePath, buffer)
        // Store relative URL path
        videoUrl = `/uploads/videos/${safeFileName}`
      } catch (err: unknown) {
        console.error('Failed to write video file:', err)
        return NextResponse.json(
          { status: false, message: 'Gagal menulis berkas video ke disk server.' },
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
