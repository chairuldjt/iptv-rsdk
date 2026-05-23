import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const versionCodeStr = formData.get('versionCode') as string
    const versionName = formData.get('versionName') as string
    const changelog = formData.get('changelog') as string
    const apkFile = formData.get('apkFile') as File

    if (!versionCodeStr || !versionName || !apkFile || apkFile.size === 0) {
      return NextResponse.json(
        { success: false, message: 'Harap lengkapi semua data dan berkas APK.' },
        { status: 400 }
      )
    }

    const versionCode = parseInt(versionCodeStr, 10)
    if (isNaN(versionCode)) {
      return NextResponse.json(
        { success: false, message: 'Format Version Code tidak valid.' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await apkFile.arrayBuffer())
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'apk')
    
    // Try to create directory with permission fallback check
    try {
      await mkdir(uploadDir, { recursive: true })
    } catch (err: any) {
      console.error('[APK UPLOAD ERROR] Directory creation failed:', err)
      return NextResponse.json(
        { 
          success: false, 
          message: `Gagal membuat folder penyimpanan di server (EACCES). Pastikan user PM2/Next.js memiliki hak akses menulis (write permission) ke folder public/uploads. Detail: ${err.message}` 
        },
        { status: 500 }
      )
    }

    const safeFileName = `${versionCode}_${apkFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`
    const filePath = path.join(uploadDir, safeFileName)

    // Try to write file with permission fallback check
    try {
      await writeFile(filePath, buffer)
    } catch (err: any) {
      console.error('[APK UPLOAD ERROR] File write failed:', err)
      return NextResponse.json(
        { 
          success: false, 
          message: `Gagal menyimpan file APK ke disk server (EACCES). Pastikan folder public/uploads/apk memiliki hak akses menulis yang benar. Detail: ${err.message}` 
        },
        { status: 500 }
      )
    }

    // Try to save database record
    try {
      await prisma.appUpdate.create({
        data: {
          versionCode,
          versionName,
          apkFileName: safeFileName,
          changelog: changelog || null,
          isMandatory: true,
          isDeployed: false,
        }
      })
    } catch (err: any) {
      console.error('[APK UPLOAD ERROR] Database write failed:', err)
      return NextResponse.json(
        { 
          success: false, 
          message: `Gagal menyimpan informasi update ke database. Detail: ${err.message}` 
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: 'Berkas APK berhasil diunggah!' })
  } catch (error: any) {
    console.error('[APK UPLOAD SYSTEM ERROR]:', error)
    return NextResponse.json(
      { success: false, message: `Terjadi kesalahan sistem di server: ${error.message}` },
      { status: 500 }
    )
  }
}
