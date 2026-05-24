'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { writeFile, mkdir, unlink } from 'fs/promises'
import path from 'path'
import { getErrorMessage } from '@/lib/errors'

const VIDEO_UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'videos')
const THUMB_UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'video-thumbnails')
const VIDEO_URL_PREFIX = '/uploads/videos/'
const THUMB_URL_PREFIX = '/uploads/video-thumbnails/'

export async function createFolderAction(formData: FormData) {
  const name = normalizeName(formData.get('folderName') as string)
  if (!name) return

  let folderId: number | null = null
  try {
    const folder = await prisma.educationFolder.upsert({
      where: { name },
      update: {},
      create: { name },
    })
    folderId = folder.id
    revalidatePath('/dashboard/videos')
  } catch (error) {
    console.error('Create education folder error:', error)
  }

  if (folderId) redirect(`/dashboard/videos?folder=${folderId}`)
}

export async function renameFolderAction(formData: FormData) {
  const folderId = parseInt(formData.get('folderId') as string, 10)
  const name = normalizeName(formData.get('folderName') as string)

  if (!Number.isFinite(folderId) || !name) return

  try {
    await prisma.educationFolder.update({
      where: { id: folderId },
      data: { name },
    })
    revalidatePath('/dashboard/videos')
  } catch (error) {
    console.error('Rename education folder error:', error)
  }

  redirect(`/dashboard/videos?folder=${folderId}&saved=1`)
}

export async function toggleFolderPublishedAction(formData: FormData) {
  const folderId = parseInt(formData.get('folderId') as string, 10)
  const currentStatus = formData.get('currentStatus') === 'true'

  if (!Number.isFinite(folderId)) return

  try {
    await prisma.educationFolder.update({
      where: { id: folderId },
      data: { isPublished: !currentStatus },
    })
    revalidatePath('/dashboard/videos')
    revalidatePath('/api/education/videos')
  } catch (error) {
    console.error('Toggle education folder publish error:', error)
  }

  redirect(`/dashboard/videos?folder=${folderId}&saved=1`)
}

export async function deleteFolderAction(formData: FormData) {
  const folderId = parseInt(formData.get('folderId') as string, 10)
  if (!Number.isFinite(folderId)) return

  try {
    await prisma.educationFolder.delete({
      where: { id: folderId },
    })
    revalidatePath('/dashboard/videos')
  } catch (error) {
    console.error('Delete education folder error:', error)
  }

  redirect('/dashboard/videos?saved=1')
}

export async function toggleVideoPublishedAction(formData: FormData) {
  const id = parseInt(formData.get('videoId') as string, 10)
  const folderId = parseInt((formData.get('folderId') as string) || '', 10)
  const currentStatus = formData.get('currentStatus') === 'true'

  if (!Number.isFinite(id)) return

  try {
    await prisma.educationVideo.update({
      where: { id },
      data: { isPublished: !currentStatus },
    })
    revalidatePath('/dashboard/videos')
    revalidatePath('/api/education/videos')
  } catch (error) {
    console.error('Toggle education video publish error:', error)
  }

  if (Number.isFinite(folderId)) {
    redirect(`/dashboard/videos?folder=${folderId}&saved=1`)
  }
  redirect('/dashboard/videos?saved=1')
}

export async function addVideoAction(formData: FormData) {
  const title = normalizeName(formData.get('title') as string)
  let videoUrl = (formData.get('videoUrl') as string)?.trim()
  const folderId = nullableFolderId(formData)
  const videoFile = formData.get('videoFile') as File | null
  const thumbnailUrlInput = (formData.get('thumbnailUrl') as string)?.trim()
  const thumbnailFile = formData.get('thumbnailFile') as File | null

  if (!title) return { success: false, message: 'Judul video wajib diisi.' }

  try {
    if (videoFile && videoFile.size > 0) {
      videoUrl = await saveUpload(videoFile, VIDEO_UPLOAD_DIR, VIDEO_URL_PREFIX)
    }

    if (!videoUrl) {
      return { success: false, message: 'Harap masukkan URL video atau unggah berkas video.' }
    }

    let thumbnailUrl = thumbnailUrlInput || null
    if (thumbnailFile && thumbnailFile.size > 0) {
      thumbnailUrl = await saveUpload(thumbnailFile, THUMB_UPLOAD_DIR, THUMB_URL_PREFIX)
    }

    await prisma.educationVideo.create({
      data: {
        title,
        videoUrl,
        thumbnailUrl,
        folderId,
      },
    })

    revalidatePath('/dashboard/videos')
    return { success: true, message: 'Video berhasil ditambahkan ke galeri.' }
  } catch (error) {
    console.error('Add video action error:', error)
    return { success: false, message: `Gagal menambahkan video: ${getErrorMessage(error)}` }
  }
}

export async function editVideoAction(formData: FormData) {
  const id = parseInt(formData.get('videoId') as string, 10)
  const title = normalizeName(formData.get('title') as string)
  let videoUrl = (formData.get('videoUrl') as string)?.trim()
  const folderId = nullableFolderId(formData)
  const videoFile = formData.get('videoFile') as File | null
  const thumbnailUrlInput = (formData.get('thumbnailUrl') as string)?.trim()
  const thumbnailFile = formData.get('thumbnailFile') as File | null
  const removeThumbnail = formData.get('removeThumbnail') === 'on'

  if (!Number.isFinite(id) || !title) return { success: false, message: 'Data tidak lengkap.' }

  try {
    const existing = await prisma.educationVideo.findUnique({ where: { id } })
    if (!existing) return { success: false, message: 'Video tidak ditemukan.' }

    if (videoFile && videoFile.size > 0) {
      videoUrl = await saveUpload(videoFile, VIDEO_UPLOAD_DIR, VIDEO_URL_PREFIX)
      await removeLocalFile(existing.videoUrl, VIDEO_URL_PREFIX)
    }

    if (!videoUrl) {
      videoUrl = existing.videoUrl
    }

    let thumbnailUrl = thumbnailUrlInput || existing.thumbnailUrl
    if (removeThumbnail) {
      await removeLocalFile(existing.thumbnailUrl, THUMB_URL_PREFIX)
      thumbnailUrl = null
    }

    if (thumbnailFile && thumbnailFile.size > 0) {
      thumbnailUrl = await saveUpload(thumbnailFile, THUMB_UPLOAD_DIR, THUMB_URL_PREFIX)
      await removeLocalFile(existing.thumbnailUrl, THUMB_URL_PREFIX)
    }

    await prisma.educationVideo.update({
      where: { id },
      data: {
        title,
        videoUrl,
        thumbnailUrl,
        folderId,
      },
    })

    revalidatePath('/dashboard/videos')
  } catch (error) {
    console.error('Edit video action error:', error)
    return { success: false, message: `Gagal memperbarui video: ${getErrorMessage(error)}` }
  }

  redirect(`/dashboard/videos${folderId ? `?folder=${folderId}&saved=1` : '?saved=1'}`)
}

export async function deleteVideoAction(formData: FormData) {
  const id = parseInt(formData.get('videoId') as string, 10)
  const folderId = parseInt((formData.get('folderId') as string) || '', 10)
  if (!Number.isFinite(id)) return

  try {
    const video = await prisma.educationVideo.findUnique({ where: { id } })
    if (video) {
      await removeLocalFile(video.videoUrl, VIDEO_URL_PREFIX)
      await removeLocalFile(video.thumbnailUrl, THUMB_URL_PREFIX)
      await prisma.educationVideo.delete({ where: { id } })
    }

    revalidatePath('/dashboard/videos')
  } catch (error) {
    console.error('Delete video action error:', error)
  }

  if (Number.isFinite(folderId)) {
    redirect(`/dashboard/videos?folder=${folderId}&saved=1`)
  }
}

function nullableFolderId(formData: FormData): number | null {
  const rawFolderId = formData.get('folderId') as string
  const parsed = parseInt(rawFolderId, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function normalizeName(value: string | null | undefined): string {
  return (value || '').trim().replace(/\s+/g, ' ')
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
    console.warn('Failed to remove uploaded education asset:', error)
  }
}
