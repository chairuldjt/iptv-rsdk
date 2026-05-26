'use client'

import { useEffect, useRef, useState } from 'react'

type AutoVideoThumbnailProps = {
  videoUrl: string
  thumbnailUrl?: string | null
  alt: string
  className?: string
}

export default function AutoVideoThumbnail({
  videoUrl,
  thumbnailUrl,
  alt,
  className = '',
}: AutoVideoThumbnailProps) {
  const [generatedThumbnail, setGeneratedThumbnail] = useState<string | null>(null)
  const [captureFailed, setCaptureFailed] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    if (thumbnailUrl || !videoUrl) return

    const video = videoRef.current
    if (!video) return

    let cancelled = false

    const captureFrame = () => {
      if (cancelled) return

      try {
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight

        if (!canvas.width || !canvas.height) {
          setCaptureFailed(true)
          return
        }

        const context = canvas.getContext('2d')
        if (!context) {
          setCaptureFailed(true)
          return
        }

        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82)
        if (!cancelled) {
          setGeneratedThumbnail(dataUrl)
          setCaptureFailed(false)
        }
      } catch {
        if (!cancelled) setCaptureFailed(true)
      }
    }

    const handleLoadedMetadata = () => {
      const targetTime = Math.min(1, Number.isFinite(video.duration) ? Math.max(video.duration * 0.1, 0.1) : 1)

      if (targetTime <= 0) {
        captureFrame()
        return
      }

      try {
        video.currentTime = targetTime
      } catch {
        captureFrame()
      }
    }

    const handleSeeked = () => {
      captureFrame()
    }

    const handleError = () => {
      if (!cancelled) setCaptureFailed(true)
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('seeked', handleSeeked)
    video.addEventListener('error', handleError)

    if (video.readyState >= 1) {
      handleLoadedMetadata()
    } else {
      video.load()
    }

    return () => {
      cancelled = true
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('seeked', handleSeeked)
      video.removeEventListener('error', handleError)
    }
  }, [thumbnailUrl, videoUrl])

  if (thumbnailUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={thumbnailUrl} alt={alt} className={className} />
  }

  if (generatedThumbnail) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={generatedThumbnail} alt={alt} className={className} />
  }

  return (
    <>
      <video
        ref={videoRef}
        src={videoUrl}
        preload="metadata"
        muted
        playsInline
        crossOrigin="anonymous"
        className="hidden"
      />
      <div className={`${className} flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-background`}>
        <span className="w-12 h-12 rounded-full bg-foreground/10 border border-foreground/10 flex items-center justify-center text-foreground/70 text-sm">
          {captureFailed ? '!' : '▶'}
        </span>
      </div>
    </>
  )
}
