'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface RemoteControlModalProps {
  deviceId: string
  deviceName: string
  deviceIp: string | null
  closeUrl: string
}

type RemoteResponse = {
  status?: boolean
  message?: string
  image?: string
}

export default function RemoteControlModal({
  deviceId,
  deviceName,
  deviceIp,
  closeUrl,
}: RemoteControlModalProps) {
  const [status, setStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message: string }>({
    type: 'idle',
    message: deviceIp ? `Proxy active for: ${deviceIp}` : 'No IP address found for device',
  })
  
  const [screenshot, setScreenshot] = useState<string | null>(null)

  useEffect(() => {
    // 1. Tell Next.js server to start requesting screenshots for this device
    const setStatusActive = async (active: boolean) => {
      try {
        await fetch('/api/device/remote/screenshot', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ deviceId, active }),
        })
      } catch (e) {
        console.error('Failed to change screenshot active status:', e)
      }
    }

    setStatusActive(true)

    // 2. Poll for screenshots every 1.5 seconds
    const fetchScreenshot = async () => {
      try {
        const response = await fetch(`/api/device/remote/screenshot?deviceId=${encodeURIComponent(deviceId)}`)
        if (response.ok) {
          const data = await response.json() as RemoteResponse
          if (data.status && data.image) {
            setScreenshot(data.image)
          }
        }
      } catch (e) {
        console.error('Failed to fetch screenshot:', e)
      }
    }

    const intervalId = setInterval(fetchScreenshot, 1500)
    
    // Initial fetch
    fetchScreenshot()

    return () => {
      clearInterval(intervalId)
      setStatusActive(false)
    }
  }, [deviceId])

  const sendCommand = async (command: string, value?: string) => {
    setStatus({ type: 'loading', message: `Sending: ${command}...` })
    try {
      const response = await fetch('/api/device/remote/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deviceId, command, value }),
      })

      const data = await response.json() as RemoteResponse
      if (response.ok && data.status) {
        setStatus({ type: 'success', message: `Executed command: ${command}` })
      } else {
        setStatus({
          type: 'error',
          message: data.message || `Error code ${response.status}`,
        })
      }
    } catch (e: unknown) {
      setStatus({
        type: 'error',
        message: e instanceof Error ? e.message : 'Network connection failed',
      })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-sm glass-card p-6 rounded-3xl border border-indigo-500/30 shadow-2xl relative flex flex-col items-center bg-slate-900/90 text-white animate-scale-in">
        
        {/* Modal Close Button */}
        <Link
          href={closeUrl}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition-all"
          title="Close Remote"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </Link>

        {/* Remote Header */}
        <div className="text-center w-full mb-4 mt-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full text-[10px] font-bold tracking-wider uppercase mb-2">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            Virtual Remote
          </div>
          <h3 className="font-extrabold text-white text-lg tracking-tight truncate px-6">{deviceName}</h3>
          <p className="text-slate-500 text-xs mt-0.5 font-mono">{deviceIp || 'Offline'}</p>
        </div>

        {/* Physical-style Remote Wrapper */}
        <div className="w-72 bg-gradient-to-b from-slate-950 to-slate-900 border border-slate-800 rounded-[40px] px-6 py-6 shadow-inner flex flex-col gap-5 items-center">
          
          {/* Virtual TV Screen Preview */}
          <div className="w-full aspect-video bg-slate-950 border-2 border-slate-850 rounded-2xl shadow-inner relative overflow-hidden flex items-center justify-center">
            {screenshot ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`data:image/jpeg;base64,${screenshot}`}
                alt="Device Screen Preview"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-3 text-center text-slate-500 gap-2">
                <svg className="w-7 h-7 text-slate-600 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h18M3 16h18" />
                </svg>
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Connecting Screen...</span>
              </div>
            )}
            
            {/* Screen indicator overlay */}
            <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/75 px-1.5 py-0.5 rounded text-[8px] font-bold text-emerald-400">
              <span className="w-1 h-1 bg-emerald-500 rounded-full animate-ping"></span>
              SCREEN PREVIEW
            </div>
          </div>

          {/* Top Control Buttons */}
          <div className="flex justify-between w-full px-2">
            {/* Back Button */}
            <button
              onClick={() => sendCommand('BACK')}
              className="w-11 h-11 flex items-center justify-center bg-slate-800 hover:bg-slate-700/80 active:scale-95 text-slate-300 hover:text-white rounded-full border border-slate-700/50 shadow-md transition-all cursor-pointer"
              title="Back"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>

            {/* Home Button */}
            <button
              onClick={() => sendCommand('NAVIGATE_HOME')}
              className="w-11 h-11 flex items-center justify-center bg-slate-800 hover:bg-slate-700/80 active:scale-95 text-slate-300 hover:text-white rounded-full border border-slate-700/50 shadow-md transition-all cursor-pointer"
              title="Home Screen"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </button>

            {/* Power/Reboot Button */}
            <button
              onClick={() => sendCommand('REBOOT')}
              className="w-11 h-11 flex items-center justify-center bg-rose-950/40 hover:bg-rose-900/60 active:scale-95 text-rose-500 hover:text-rose-400 rounded-full border border-rose-500/20 shadow-md transition-all cursor-pointer"
              title="Reboot App"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </button>
          </div>

          {/* D-Pad Circular Group */}
          <div className="relative w-40 h-40 rounded-full bg-slate-900 border border-slate-800 shadow-lg flex items-center justify-center">
            
            {/* D-Pad Up */}
            <button
              onClick={() => sendCommand('UP')}
              className="absolute top-1.5 w-14 h-10 flex items-center justify-center text-slate-400 hover:text-white active:scale-90 transition-all cursor-pointer"
              title="Up"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
              </svg>
            </button>

            {/* D-Pad Left */}
            <button
              onClick={() => sendCommand('LEFT')}
              className="absolute left-1.5 w-10 h-14 flex items-center justify-center text-slate-400 hover:text-white active:scale-90 transition-all cursor-pointer"
              title="Left"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Center OK Button */}
            <button
              onClick={() => sendCommand('ENTER')}
              className="w-16 h-16 rounded-full bg-indigo-600 hover:bg-indigo-500 active:scale-90 border-2 border-indigo-400/30 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer z-10"
            >
              OK
            </button>

            {/* D-Pad Right */}
            <button
              onClick={() => sendCommand('RIGHT')}
              className="absolute right-1.5 w-10 h-14 flex items-center justify-center text-slate-400 hover:text-white active:scale-90 transition-all cursor-pointer"
              title="Right"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* D-Pad Down */}
            <button
              onClick={() => sendCommand('DOWN')}
              className="absolute bottom-1.5 w-14 h-10 flex items-center justify-center text-slate-400 hover:text-white active:scale-90 transition-all cursor-pointer"
              title="Down"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Volume Control Group */}
          <div className="flex items-center justify-between w-full bg-slate-900/50 border border-slate-800/80 rounded-2xl p-2">
            <button
              onClick={() => sendCommand('VOLUME_DOWN')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700/80 active:scale-95 text-slate-300 hover:text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer"
              title="Volume Down"
            >
              VOL -
            </button>
            <button
              onClick={() => sendCommand('MUTE')}
              className="p-1.5 bg-slate-800 hover:bg-slate-700/80 active:scale-95 text-slate-300 hover:text-white rounded-lg transition-all cursor-pointer"
              title="Mute"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            </button>
            <button
              onClick={() => sendCommand('VOLUME_UP')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700/80 active:scale-95 text-slate-300 hover:text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer"
              title="Volume Up"
            >
              VOL +
            </button>
          </div>

          {/* Quick Screen Launch Shortcuts */}
          <div className="flex flex-col gap-2 w-full">
            <span className="text-[8px] font-bold text-slate-500 text-center uppercase tracking-widest">Launch Screen</span>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => sendCommand('NAVIGATE_TV')}
                className="py-1.5 bg-indigo-950/30 hover:bg-indigo-900/40 active:scale-95 text-indigo-400 hover:text-indigo-300 border border-indigo-500/10 rounded-xl text-[10px] font-bold transition-all cursor-pointer"
              >
                LIVE TV
              </button>
              <button
                onClick={() => sendCommand('NAVIGATE_EDUCATION')}
                className="py-1.5 bg-emerald-950/30 hover:bg-emerald-900/40 active:scale-95 text-emerald-400 hover:text-emerald-300 border border-emerald-500/10 rounded-xl text-[10px] font-bold transition-all cursor-pointer"
              >
                EDUKASI
              </button>
              <button
                onClick={() => sendCommand('NAVIGATE_SETTINGS')}
                className="py-1.5 bg-sky-950/30 hover:bg-sky-900/40 active:scale-95 text-sky-400 hover:text-sky-300 border border-sky-500/10 rounded-xl text-[10px] font-bold transition-all cursor-pointer"
              >
                SETTINGS
              </button>
            </div>
          </div>

        </div>

        {/* Command Status Box */}
        <div className={`mt-4 w-full p-2.5 rounded-xl border text-center text-xs font-medium transition-all ${
          status.type === 'loading'
            ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
            : status.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : status.type === 'error'
            ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            : 'bg-slate-800/30 border-slate-800 text-slate-400'
        }`}>
          {status.type === 'loading' && (
            <svg className="animate-spin -ml-1 mr-1.5 h-3.5 w-3.5 inline text-amber-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}
          {status.message}
        </div>

      </div>
    </div>
  )
}
