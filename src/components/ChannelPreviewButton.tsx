'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Hls from 'hls.js'

interface ChannelPreviewButtonProps {
  name: string
  streamUrl: string
  sourceLabel?: string
}

export default function ChannelPreviewButton({
  name,
  streamUrl,
  sourceLabel,
}: ChannelPreviewButtonProps) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState('Ready')
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    if (!open || !videoRef.current) return

    const video = videoRef.current
    let hls: Hls | null = null

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl
      video.play().catch(() => setStatus('Click play to start preview.'))
    } else if (Hls.isSupported()) {
      hls = new Hls({
        lowLatencyMode: true,
        backBufferLength: 30,
      })
      hls.loadSource(streamUrl)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => setStatus('Click play to start preview.'))
      })
      hls.on(Hls.Events.ERROR, (_event, data) => {
        setStatus(data.fatal ? `Stream error: ${data.details}` : `Stream warning: ${data.details}`)
      })
    } else {
      video.src = streamUrl
      video.play().catch(() => setStatus('Browser cannot autoplay this stream.'))
    }

    const onPlaying = () => setStatus(sourceLabel ? `Playing via ${sourceLabel}` : 'Playing preview stream')
    const onWaiting = () => setStatus('Buffering...')
    const onError = () => setStatus('Video element could not play this stream.')

    video.addEventListener('playing', onPlaying)
    video.addEventListener('waiting', onWaiting)
    video.addEventListener('error', onError)

    return () => {
      video.pause()
      video.removeAttribute('src')
      video.load()
      video.removeEventListener('playing', onPlaying)
      video.removeEventListener('waiting', onWaiting)
      video.removeEventListener('error', onError)
      hls?.destroy()
    }
  }, [open, sourceLabel, streamUrl])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/10 flex items-center gap-1.5"
        title="Preview stream"
      >
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M6.5 5.5v9l8-4.5-8-4.5z" />
        </svg>
        Preview
      </button>

      {open &&
        createPortal(
        <div className="fixed inset-0 z-[120] bg-slate-950/85 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="w-full max-w-5xl rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-white font-extrabold text-lg truncate">{name}</h3>
                <p className="text-[11px] text-slate-500 font-mono truncate">{streamUrl}</p>
              </div>
              <div className="flex items-center gap-2">
                {sourceLabel && (
                  <span className="px-3 py-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-[11px] font-bold text-emerald-300">
                    {sourceLabel}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-9 h-9 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900 flex items-center justify-center"
                  title="Close preview"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="bg-black aspect-video">
              <video
                ref={videoRef}
                controls
                playsInline
                className="w-full h-full bg-black"
              />
            </div>

            <div className="px-5 py-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-400">{status}</span>
              {sourceLabel && <span className="text-[11px] text-slate-500">Source: {sourceLabel}</span>}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
