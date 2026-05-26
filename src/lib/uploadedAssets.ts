import { mkdir, writeFile } from 'fs/promises'
import path from 'path'

const HOME_EXPERIENCE_UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'home-experience')
const HOME_EXPERIENCE_URL_PREFIX = '/uploads/home-experience/'

export async function saveHomeExperienceAsset(file: File, prefix: string): Promise<string> {
  if (!file || file.size <= 0) {
    throw new Error('Uploaded file is empty.')
  }

  await mkdir(HOME_EXPERIENCE_UPLOAD_DIR, { recursive: true })
  const buffer = Buffer.from(await file.arrayBuffer())
  const safeOriginalName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '') || 'asset'
  const fileName = `${Date.now()}_${prefix}_${safeOriginalName}`
  await writeFile(path.join(HOME_EXPERIENCE_UPLOAD_DIR, fileName), buffer)
  return `${HOME_EXPERIENCE_URL_PREFIX}${fileName}`
}
