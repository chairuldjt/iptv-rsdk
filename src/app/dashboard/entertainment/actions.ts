'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { mkdir, unlink, writeFile } from 'fs/promises'
import path from 'path'
import { getErrorMessage } from '@/lib/errors'

const THUMB_UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'entertainment-thumbnails')
const THUMB_URL_PREFIX = '/uploads/entertainment-thumbnails/'
const CONTENT_TYPES = ['webview', 'media_player', 'm3u_player', 'm3u_playlist'] as const

export async function saveEntertainmentItemAction(formData: FormData) {
  const id = parseInt((formData.get('itemId') as string) || '', 10)
  const title = normalizeText(formData.get('title') as string)
  const subtitle = normalizeText(formData.get('subtitle') as string)
  const url = normalizeText(formData.get('url') as string)
  const contentType = normalizeContentType(formData.get('contentType') as string)
  const sortOrder = parseInt((formData.get('sortOrder') as string) || '0', 10)
  const isActive = formData.get('isActive') === 'on'
  const thumbnailUrlInput = normalizeText(formData.get('thumbnailUrl') as string)
  const thumbnailFile = formData.get('thumbnailFile') as File | null
  const removeThumbnail = formData.get('removeThumbnail') === 'on'

  if (!title) {
    return { success: false, message: 'Judul item wajib diisi.' }
  }

  try {
    const existing = Number.isFinite(id)
      ? await prisma.entertainmentItem.findUnique({ where: { id } })
      : null

    let thumbnailUrl: string | null = thumbnailUrlInput || existing?.thumbnailUrl || null

    if (removeThumbnail) {
      await removeLocalThumbnail(existing?.thumbnailUrl)
      thumbnailUrl = null
    }

    if (thumbnailFile && thumbnailFile.size > 0) {
      thumbnailUrl = await saveThumbnail(thumbnailFile)
      await removeLocalThumbnail(existing?.thumbnailUrl)
    }

    if (existing) {
      await prisma.entertainmentItem.update({
        where: { id: existing.id },
        data: {
          title,
          subtitle,
          url: url || null,
          contentType,
          thumbnailUrl,
          isActive,
          sortOrder: Number.isFinite(sortOrder) ? sortOrder : existing.sortOrder,
        },
      })
    } else {
      await prisma.entertainmentItem.create({
        data: {
          title,
          subtitle,
          url: url || null,
          contentType,
          thumbnailUrl,
          isActive,
          sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
        },
      })
    }

    revalidatePath('/dashboard/entertainment')
  } catch (error) {
    console.error('Save entertainment item error:', error)
    return { success: false, message: `Gagal menyimpan item: ${getErrorMessage(error)}` }
  }

  redirect('/dashboard/entertainment?saved=1')
}

export async function deleteEntertainmentItemAction(formData: FormData) {
  const id = parseInt((formData.get('itemId') as string) || '', 10)
  if (!Number.isFinite(id)) return

  try {
    const item = await prisma.entertainmentItem.findUnique({ where: { id } })
    if (item) {
      await removeLocalThumbnail(item.thumbnailUrl)
      await prisma.entertainmentItem.delete({ where: { id } })
    }
    revalidatePath('/dashboard/entertainment')
  } catch (error) {
    console.error('Delete entertainment item error:', error)
  }

  redirect('/dashboard/entertainment?saved=1')
}

function normalizeText(value: string | null | undefined): string {
  return (value || '').trim().replace(/\s+/g, ' ')
}

function normalizeContentType(value: string): string {
  return CONTENT_TYPES.includes(value as (typeof CONTENT_TYPES)[number]) ? value : 'webview'
}

async function saveThumbnail(file: File): Promise<string> {
  await mkdir(THUMB_UPLOAD_DIR, { recursive: true })
  const buffer = Buffer.from(await file.arrayBuffer())
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '') || 'thumbnail'
  const fileName = `${Date.now()}_${safeName}`
  await writeFile(path.join(THUMB_UPLOAD_DIR, fileName), buffer)
  return `${THUMB_URL_PREFIX}${fileName}`
}

async function removeLocalThumbnail(url: string | null | undefined): Promise<void> {
  if (!url?.startsWith(THUMB_URL_PREFIX)) return
  if (url === `${THUMB_URL_PREFIX}default-soundcloud.svg` || url === `${THUMB_URL_PREFIX}default-youtube.svg`) return

  try {
    await unlink(path.join(process.cwd(), 'public', url))
  } catch (error) {
    console.warn('Failed to delete entertainment thumbnail:', error)
  }
}
