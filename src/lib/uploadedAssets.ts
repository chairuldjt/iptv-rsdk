import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import {
  type ImageAssetKind,
  validateAndNormaliseImage,
  validateAudio,
} from '@/lib/assetValidation'

const HOME_EXPERIENCE_UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'home-experience')
const HOME_EXPERIENCE_URL_PREFIX = '/uploads/home-experience/'

/**
 * Persist an uploaded image after validating it and normalising the format.
 *
 * Throws a descriptive Error if the file fails validation. The caller is
 * expected to surface that message to the admin (server actions in
 * `dashboard/experience` capture and render it via the redirect query).
 */
export async function saveHomeExperienceImage(
  file: File,
  prefix: string,
  kind: ImageAssetKind
): Promise<string> {
  const normalised = await validateAndNormaliseImage(file, kind)
  return persistAsset(normalised.buffer, prefix, normalised.extension)
}

export async function saveHomeExperienceAudio(file: File, prefix: string): Promise<string> {
  const normalised = await validateAudio(file)
  return persistAsset(normalised.buffer, prefix, normalised.extension)
}

async function persistAsset(buffer: Buffer, prefix: string, extension: string): Promise<string> {
  await mkdir(HOME_EXPERIENCE_UPLOAD_DIR, { recursive: true })
  const fileName = `${Date.now()}_${sanitisePrefix(prefix)}.${extension}`
  await writeFile(path.join(HOME_EXPERIENCE_UPLOAD_DIR, fileName), buffer)
  return `${HOME_EXPERIENCE_URL_PREFIX}${fileName}`
}

function sanitisePrefix(prefix: string): string {
  const cleaned = prefix.replace(/[^a-zA-Z0-9.\-_]/g, '')
  return cleaned || 'asset'
}
