import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getErrorMessage } from '@/lib/errors'
import { absolutizeHomeExperienceUrls, resolveEffectiveHomeExperience } from '@/lib/homeExperience'
import { resolvePublicOrigin } from '@/lib/publicOrigin'

/**
 * GET /api/device/preload/[deviceId]
 *
 * Returns a flat manifest of all asset URLs that the Android client should
 * preload (via Coil) before dismissing the splash screen and entering the
 * home screen. This avoids blank backgrounds / missing logos on first render.
 *
 * Asset categories returned:
 *  - splash   : background, logo, sound
 *  - home     : logoUrl, homeBackgroundUrl
 *  - menus    : each menu's backgroundUrl (enabled menus only)
 *  - overlays : each overlay's imageUrl (enabled logo/app_logo overlays only)
 *  - sounds   : selectionSoundUrl
 *
 * Empty strings are excluded from every list.
 *
 * Response shape:
 * {
 *   "status": true,
 *   "data": {
 *     "images": ["https://..."],   // preload with Coil ImageLoader
 *     "sounds": ["https://..."],   // preload with MediaPlayer / ExoPlayer
 *     "total": 7
 *   }
 * }
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await params

    if (!deviceId) {
      return NextResponse.json(
        { status: false, message: 'Missing deviceId parameter' },
        { status: 400 }
      )
    }

    const device = await prisma.device.findUnique({
      where: { deviceId },
      select: { deviceId: true, isActive: true },
    })

    if (!device) {
      return NextResponse.json(
        { status: false, message: 'Device not found' },
        { status: 404 }
      )
    }

    if (!device.isActive) {
      return NextResponse.json(
        { status: false, message: 'Device is inactive' },
        { status: 403 }
      )
    }

    const [homeExperienceRaw, publicOrigin] = await Promise.all([
      resolveEffectiveHomeExperience(deviceId),
      resolvePublicOrigin(request),
    ])

    const homeExperience = absolutizeHomeExperienceUrls(homeExperienceRaw, publicOrigin)

    // ── Collect image URLs ────────────────────────────────────────────────────
    const imageSet = new Set<string>()

    const addImage = (url: string | undefined) => {
      if (url && url.trim()) imageSet.add(url.trim())
    }

    // Splash assets
    if (homeExperience.splash.enabled) {
      addImage(homeExperience.splash.backgroundUrl)
      addImage(homeExperience.splash.logoUrl)
    }

    // Home background + logo
    addImage(homeExperience.homeBackgroundUrl)
    addImage(homeExperience.logoUrl)

    // Menu card backgrounds (enabled menus only)
    for (const menu of homeExperience.menus) {
      if (menu.enabled) {
        addImage(menu.backgroundUrl)
      }
    }

    // Overlay images (enabled logo/app_logo overlays only)
    for (const overlay of homeExperience.overlays) {
      if (overlay.enabled && (overlay.type === 'logo' || overlay.type === 'app_logo')) {
        addImage(overlay.imageUrl)
      }
    }

    // ── Collect sound URLs ────────────────────────────────────────────────────
    const soundSet = new Set<string>()

    const addSound = (url: string | undefined) => {
      if (url && url.trim()) soundSet.add(url.trim())
    }

    if (homeExperience.splash.enabled && homeExperience.splash.showSound) {
      addSound(homeExperience.splash.soundUrl)
    }

    if (homeExperience.sounds.enableSelectionSound) {
      addSound(homeExperience.sounds.selectionSoundUrl)
    }

    const images = Array.from(imageSet)
    const sounds = Array.from(soundSet)

    return NextResponse.json({
      status: true,
      message: 'Preload manifest ready',
      data: {
        images,
        sounds,
        total: images.length + sounds.length,
      },
    })
  } catch (error: unknown) {
    console.error('Preload API Error:', error)
    return NextResponse.json(
      { status: false, message: 'Server error: ' + getErrorMessage(error) },
      { status: 500 }
    )
  }
}
