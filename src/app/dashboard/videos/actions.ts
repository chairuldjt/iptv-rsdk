'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { writeFile, mkdir, unlink } from 'fs/promises'
import path from 'path'
import { getErrorMessage } from '@/lib/errors'

export async function addVideoAction(formData: FormData) {
  const title = formData.get('title') as string
  let videoUrl = formData.get('videoUrl') as string
  const videoFile = formData.get('videoFile') as File | null

  if (!title) return { success: false, message: 'Judul video wajib diisi.' }

  try {
    if (videoFile && videoFile.size > 0) {
      const buffer = Buffer.from(await videoFile.arrayBuffer())
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'videos')

      try {
        await mkdir(uploadDir, { recursive: true })
      } catch (err) {
        console.error('Failed to create upload dir:', err)
      }

      const safeFileName = `${Date.now()}_${videoFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`
      const filePath = path.join(uploadDir, safeFileName)

      await writeFile(filePath, buffer)
      videoUrl = `/uploads/videos/${safeFileName}`
    }

    if (!videoUrl) {
      return { success: false, message: 'Harap masukkan URL video atau unggah berkas video.' }
    }

    await prisma.educationVideo.create({
      data: {
        title,
        videoUrl,
      },
    })

    revalidatePath('/dashboard/videos')
    return { success: true, message: 'Video berhasil ditambahkan ke repository!' }
  } catch (error) {
    console.error('Add video action error:', error)
    return { success: false, message: `Gagal menambahkan video: ${getErrorMessage(error)}` }
  }
}

export async function editVideoAction(formData: FormData) {
  const id = parseInt(formData.get('videoId') as string, 10)
  const title = formData.get('title') as string
  let videoUrl = formData.get('videoUrl') as string
  const videoFile = formData.get('videoFile') as File | null

  if (isNaN(id) || !title) return { success: false, message: 'Data tidak lengkap.' }

  try {
    const existing = await prisma.educationVideo.findUnique({ where: { id } })
    if (!existing) return { success: false, message: 'Video tidak ditemukan.' }

    if (videoFile && videoFile.size > 0) {
      const buffer = Buffer.from(await videoFile.arrayBuffer())
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'videos')

      try {
        await mkdir(uploadDir, { recursive: true })
      } catch (err) {
        console.error('Failed to create upload dir:', err)
      }

      const safeFileName = `${Date.now()}_${videoFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`
      const filePath = path.join(uploadDir, safeFileName)

      await writeFile(filePath, buffer)

      // Delete old local file if existed
      if (existing.videoUrl.startsWith('/uploads/videos/')) {
        const oldFilePath = path.join(process.cwd(), 'public', existing.videoUrl)
        try {
          await unlink(oldFilePath)
        } catch (e) {
          console.warn('Failed to delete old video:', e)
        }
      }

      videoUrl = `/uploads/videos/${safeFileName}`
    }

    if (!videoUrl) {
      videoUrl = existing.videoUrl
    }

    await prisma.educationVideo.update({
      where: { id },
      data: {
        title,
        videoUrl,
      },
    })

    revalidatePath('/dashboard/videos')
  } catch (error) {
    console.error('Edit video action error:', error)
    return { success: false, message: `Gagal memperbarui video: ${getErrorMessage(error)}` }
  }

  redirect('/dashboard/videos?saved=1')
}

export async function deleteVideoAction(formData: FormData) {
  const id = parseInt(formData.get('videoId') as string, 10)
  if (isNaN(id)) return

  try {
    const video = await prisma.educationVideo.findUnique({ where: { id } })
    if (video) {
      if (video.videoUrl.startsWith('/uploads/videos/')) {
        const filePath = path.join(process.cwd(), 'public', video.videoUrl)
        try {
          await unlink(filePath)
        } catch (err) {
          console.error('Failed to delete video file on disk:', err)
        }
      }

      await prisma.educationVideo.delete({ where: { id } })
    }

    revalidatePath('/dashboard/videos')
  } catch (error) {
    console.error('Delete video action error:', error)
  }
}
