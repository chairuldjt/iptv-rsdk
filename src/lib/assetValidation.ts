import sharp from 'sharp'

/**
 * Centralised validation + normalization rules for assets uploaded through
 * the Home Experience editor. Image inputs are converted to a single canonical
 * format per kind so the Android client always receives predictable assets.
 */

export type ImageAssetKind = 'logo' | 'background'

export type AudioAssetKind = 'audio'

const ACCEPTED_IMAGE_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/heic',
  'image/heif',
  'image/svg+xml',
])

const ACCEPTED_AUDIO_MIME = new Set([
  'audio/mpeg', // mp3
  'audio/mp3',
  'audio/ogg',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/x-pn-wav',
])

const IMAGE_RULES: Record<ImageAssetKind, {
  maxBytes: number
  minWidth: number
  minHeight: number
  /** Output format we will normalise the image to. */
  outputFormat: 'webp' | 'png'
  /** Optional cap on output dimensions to keep payload small. */
  maxWidth?: number
  maxHeight?: number
}> = {
  logo: {
    maxBytes: 1 * 1024 * 1024,
    minWidth: 128,
    minHeight: 128,
    outputFormat: 'png',
    maxWidth: 1024,
    maxHeight: 1024,
  },
  background: {
    maxBytes: 4 * 1024 * 1024,
    minWidth: 320,
    minHeight: 180,
    outputFormat: 'webp',
    maxWidth: 2560,
    maxHeight: 1440,
  },
}

const AUDIO_RULES = {
  maxBytes: 1 * 1024 * 1024,
}

export type NormalisedAsset = {
  buffer: Buffer
  /** Final extension without the leading dot, e.g. `webp` or `mp3`. */
  extension: string
  /** Final MIME type, e.g. `image/webp`. */
  mimeType: string
}

/**
 * Validate an uploaded image and convert it to the canonical format/size for
 * the given kind. Throws a descriptive Error on rejection so the caller can
 * surface it back to the admin.
 */
export async function validateAndNormaliseImage(file: File, kind: ImageAssetKind): Promise<NormalisedAsset> {
  const rule = IMAGE_RULES[kind]

  if (!file || file.size === 0) {
    throw new Error('File upload kosong.')
  }
  if (file.size > rule.maxBytes) {
    throw new Error(`Ukuran file maksimal ${formatBytes(rule.maxBytes)}, file ini ${formatBytes(file.size)}.`)
  }
  if (!ACCEPTED_IMAGE_MIME.has(file.type) && file.type !== '') {
    throw new Error(
      `Tipe file '${file.type}' tidak didukung. Gunakan PNG, JPEG, WebP, GIF, AVIF, HEIC, atau SVG.`
    )
  }

  const inputBuffer = Buffer.from(await file.arrayBuffer())

  // SVG is vector — pass through without raster conversion to preserve quality.
  // We still validate it parses as XML by checking the leading bytes.
  if (file.type === 'image/svg+xml' || isProbablySvg(inputBuffer)) {
    if (kind === 'background') {
      throw new Error('SVG tidak didukung untuk background. Gunakan PNG, JPEG, atau WebP.')
    }
    return {
      buffer: inputBuffer,
      extension: 'svg',
      mimeType: 'image/svg+xml',
    }
  }

  let pipeline: sharp.Sharp
  let metadata: sharp.Metadata
  try {
    pipeline = sharp(inputBuffer, { failOn: 'none' })
    metadata = await pipeline.metadata()
  } catch (error) {
    throw new Error(`Gagal membaca file gambar: ${(error as Error).message}`)
  }

  const width = metadata.width ?? 0
  const height = metadata.height ?? 0
  if (width < rule.minWidth || height < rule.minHeight) {
    throw new Error(
      `Resolusi gambar minimal ${rule.minWidth}x${rule.minHeight}px, file ini ${width}x${height}px.`
    )
  }

  if (rule.maxWidth && rule.maxHeight && (width > rule.maxWidth || height > rule.maxHeight)) {
    pipeline = pipeline.resize({
      width: rule.maxWidth,
      height: rule.maxHeight,
      fit: 'inside',
      withoutEnlargement: true,
    })
  }

  const buffer = rule.outputFormat === 'webp'
    ? await pipeline.webp({ quality: 82 }).toBuffer()
    : await pipeline.png({ compressionLevel: 9 }).toBuffer()

  return {
    buffer,
    extension: rule.outputFormat,
    mimeType: rule.outputFormat === 'webp' ? 'image/webp' : 'image/png',
  }
}

/**
 * Validate an uploaded audio clip. We don't transcode (no ffmpeg dependency)
 * but we enforce MIME and size limits so the device never receives oversized
 * blobs. Duration is intentionally not validated server-side — the file picker
 * UX should be enough for this admin tool.
 */
export async function validateAudio(file: File): Promise<NormalisedAsset> {
  if (!file || file.size === 0) {
    throw new Error('File upload kosong.')
  }
  if (file.size > AUDIO_RULES.maxBytes) {
    throw new Error(`Ukuran audio maksimal ${formatBytes(AUDIO_RULES.maxBytes)}, file ini ${formatBytes(file.size)}.`)
  }
  if (file.type && !ACCEPTED_AUDIO_MIME.has(file.type)) {
    throw new Error(`Tipe audio '${file.type}' tidak didukung. Gunakan MP3, OGG, atau WAV.`)
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const ext = inferAudioExtension(file)
  const mimeType = inferAudioMime(ext)

  return { buffer, extension: ext, mimeType }
}

function inferAudioExtension(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (['mp3', 'ogg', 'wav'].includes(fromName)) return fromName
  if (file.type === 'audio/ogg') return 'ogg'
  if (file.type === 'audio/wav' || file.type === 'audio/wave' || file.type === 'audio/x-wav' || file.type === 'audio/x-pn-wav') return 'wav'
  return 'mp3'
}

function inferAudioMime(extension: string): string {
  switch (extension) {
    case 'ogg':
      return 'audio/ogg'
    case 'wav':
      return 'audio/wav'
    default:
      return 'audio/mpeg'
  }
}

function isProbablySvg(buffer: Buffer): boolean {
  const head = buffer.subarray(0, 256).toString('utf8').trimStart().toLowerCase()
  return head.startsWith('<?xml') || head.startsWith('<svg')
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Public, declarative summary of the rules — handy for surfacing in form
 * helper text so admins know what's expected before uploading.
 */
export const ASSET_RULES_SUMMARY = {
  logo: {
    maxSize: '1 MB',
    minDimension: '128 × 128 px',
    formats: 'PNG, JPEG, WebP, GIF, AVIF, HEIC, SVG',
    output: 'PNG',
  },
  background: {
    maxSize: '4 MB',
    minDimension: '320 × 180 px',
    formats: 'PNG, JPEG, WebP, GIF, AVIF, HEIC',
    output: 'WebP',
  },
  audio: {
    maxSize: '1 MB',
    formats: 'MP3, OGG, WAV',
    output: 'tanpa konversi',
  },
} as const
