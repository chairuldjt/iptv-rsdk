'use server'

import prisma from '@/lib/db'
import { getErrorMessage } from '@/lib/errors'
import { revalidatePath } from 'next/cache'
import { writeFile, mkdir, unlink } from 'fs/promises'
import path from 'path'
import { normalizeAppUpdateChannel } from '@/lib/appUpdateChannels'

// Server Action for uploading a new APK update
export async function uploadApkAction(
  prevState: { success: boolean; message: string } | null,
  formData: FormData
) {
  void prevState
  const versionCodeStr = formData.get('versionCode') as string
  const versionName = formData.get('versionName') as string
  const updateChannel = normalizeAppUpdateChannel(formData.get('updateChannel') as string | null)
  const packageNameRaw = formData.get('packageName') as string | null
  const changelog = formData.get('changelog') as string
  const isMandatory = true // Force all updates by default
  const apkFile = formData.get('apkFile') as File

  if (!versionCodeStr || !versionName || !apkFile || apkFile.size === 0) {
    return { success: false, message: 'Harap lengkapi semua data dan berkas APK.' }
  }

  const versionCode = parseInt(versionCodeStr, 10)
  if (isNaN(versionCode)) {
    return { success: false, message: 'Format Version Code tidak valid.' }
  }

  try {
    // 1. Convert file to buffer and write to disk
    const buffer = Buffer.from(await apkFile.arrayBuffer())
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'apk')
    
    try {
      await mkdir(uploadDir, { recursive: true })
    } catch (err: unknown) {
      console.error('Failed to create upload directory:', err)
      return { 
        success: false, 
        message: `Gagal membuat folder penyimpanan di server. Pastikan server memiliki izin menulis (write permission) ke folder public/uploads. Error: ${getErrorMessage(err)}` 
      }
    }
    
    // Clean file name to prevent directory traversal
    const packageName = packageNameRaw?.trim() || null
    const safeFileName = `${updateChannel}_${versionCode}_${apkFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`
    const filePath = path.join(uploadDir, safeFileName)
    
    try {
      await writeFile(filePath, buffer)
    } catch (err: unknown) {
      console.error('Failed to write APK file:', err)
      return { 
        success: false, 
        message: `Gagal menulis file APK ke disk server. Pastikan server memiliki izin menulis ke folder public/uploads/apk. Error: ${getErrorMessage(err)}` 
      }
    }

    // 2. Save record to Prisma
    try {
      await prisma.appUpdate.create({
        data: {
          updateChannel,
          versionCode,
          versionName,
          apkFileName: safeFileName,
          packageName,
          changelog: changelog || null,
          isMandatory,
          isDeployed: false, // Upload as draft by default
        }
      })
    } catch (err: unknown) {
      console.error('Failed to insert database record:', err)
      return { 
        success: false, 
        message: `Gagal menyimpan data ke database. Error: ${getErrorMessage(err)}` 
      }
    }

    revalidatePath('/dashboard/updates')
    return { success: true, message: 'Berkas APK berhasil diunggah dan disimpan sebagai draft!' }
  } catch (error: unknown) {
    console.error('Upload APK error:', error)
    return { success: false, message: `Terjadi kesalahan sistem: ${getErrorMessage(error)}` }
  }
}

// Server Action for deploying an update (only one can be active/deployed)
export async function deployUpdateAction(formData: FormData) {
  const id = parseInt(formData.get('updateId') as string, 10)
  if (isNaN(id)) return

  try {
    const targetUpdate = await prisma.appUpdate.findUnique({
      where: { id },
      select: { updateChannel: true }
    })
    if (!targetUpdate) return

    await prisma.$transaction([
      // Set all to false
      prisma.appUpdate.updateMany({
        where: {
          isDeployed: true,
          updateChannel: targetUpdate.updateChannel,
        },
        data: { isDeployed: false }
      }),
      // Set this to true
      prisma.appUpdate.update({
        where: { id },
        data: { isDeployed: true }
      })
    ])

    revalidatePath('/dashboard/updates')
  } catch (error) {
    console.error('Deploy update error:', error)
  }
}

// Server Action for deleting an update record and file
export async function deleteUpdateAction(formData: FormData) {
  const id = parseInt(formData.get('updateId') as string, 10)
  if (isNaN(id)) return

  try {
    const update = await prisma.appUpdate.findUnique({
      where: { id }
    })

    if (update) {
      // Delete file
      const filePath = path.join(process.cwd(), 'public', 'uploads', 'apk', update.apkFileName)
      try {
        await unlink(filePath)
      } catch (err) {
        console.error('Failed to delete APK file:', err)
      }

      // Delete db record
      await prisma.appUpdate.delete({
        where: { id }
      })
    }

    revalidatePath('/dashboard/updates')
  } catch (error) {
    console.error('Delete update error:', error)
  }
}
