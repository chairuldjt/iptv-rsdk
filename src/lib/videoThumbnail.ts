import { access, mkdir } from 'fs/promises'
import { spawn } from 'child_process'
import path from 'path'
import { getOnDemandHlsRelayConfig } from '@/lib/settings'

type GenerateVideoThumbnailOptions = {
  videoUrl: string
  outputDir: string
  publicPrefix: string
  fileNameBase?: string
}

export async function generateVideoThumbnail({
  videoUrl,
  outputDir,
  publicPrefix,
  fileNameBase,
}: GenerateVideoThumbnailOptions): Promise<string | null> {
  const trimmedVideoUrl = (videoUrl || '').trim()
  if (!trimmedVideoUrl) return null

  await mkdir(outputDir, { recursive: true })

  const inputPath = resolveThumbnailInput(trimmedVideoUrl)
  const safeBase = sanitizeFileName(fileNameBase || path.basename(trimmedVideoUrl, path.extname(trimmedVideoUrl)) || 'video')
  const outputFileName = `${Date.now()}_${safeBase}.jpg`
  const outputPath = path.join(outputDir, outputFileName)
  const ffmpegCandidates = await getFfmpegCandidates()

  for (const ffmpegBin of ffmpegCandidates) {
    try {
      await runFfmpeg(ffmpegBin, inputPath, outputPath)
      await access(outputPath)
      return `${publicPrefix}${outputFileName}`
    } catch (error) {
      console.warn(`Failed to generate thumbnail using "${ffmpegBin}":`, error)
    }
  }

  return null
}

function resolveThumbnailInput(videoUrl: string): string {
  if (videoUrl.startsWith('/')) {
    return path.join(process.cwd(), 'public', videoUrl)
  }

  return videoUrl
}

async function getFfmpegCandidates(): Promise<string[]> {
  const relayConfig = await getOnDemandHlsRelayConfig()
  const configured = (relayConfig.ffmpegBin || '').trim()
  const candidates = [configured, 'ffmpeg'].filter(Boolean)
  return [...new Set(candidates)]
}

function runFfmpeg(ffmpegBin: string, inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(ffmpegBin, [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-ss',
      '00:00:01.000',
      '-i',
      inputPath,
      '-frames:v',
      '1',
      '-vf',
      'scale=1280:-1',
      '-q:v',
      '3',
      outputPath,
    ])

    let stderr = ''

    ffmpeg.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    ffmpeg.on('error', reject)
    ffmpeg.on('exit', (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(stderr.trim() || `ffmpeg exited with code ${code}`))
    })
  })
}

function sanitizeFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '').replace(/\.+$/g, '') || 'video'
}
