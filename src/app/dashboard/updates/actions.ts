'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { writeFile, mkdir, unlink } from 'fs/promises'
import path from 'path'

// Server Action for uploading a new APK update
export async function uploadApkAction(formData: FormData) {
  const versionCodeStr = formData.get('versionCode') as string
  const versionName = formData.get('versionName') as string
  const changelog = formData.get('changelog') as string
  const isMandatory = true // Force all updates by default
  const apkFile = formData.get('apkFile') as File

  if (!versionCodeStr || !versionName || !apkFile || apkFile.size === 0) {
    return
  }

  const versionCode = parseInt(versionCodeStr, 10)
  if (isNaN(versionCode)) return

  try {
    // 1. Convert file to buffer and write to disk
    const buffer = Buffer.from(await apkFile.arrayBuffer())
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'apk')
    await mkdir(uploadDir, { recursive: true })
    
    // Clean file name to prevent directory traversal
    const safeFileName = `${versionCode}_${apkFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`
    const filePath = path.join(uploadDir, safeFileName)
    await writeFile(filePath, buffer)

    // 2. Save record to Prisma
    await prisma.appUpdate.create({
      data: {
        versionCode,
        versionName,
        apkFileName: safeFileName,
        changelog: changelog || null,
        isMandatory,
        isDeployed: false, // Upload as draft by default
      }
    })

    revalidatePath('/dashboard/updates')
  } catch (error) {
    console.error('Upload APK error:', error)
  }
}

// Server Action for deploying an update (only one can be active/deployed)
export async function deployUpdateAction(formData: FormData) {
  const id = parseInt(formData.get('updateId') as string, 10)
  if (isNaN(id)) return

  try {
    await prisma.$transaction([
      // Set all to false
      prisma.appUpdate.updateMany({
        where: { isDeployed: true },
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
