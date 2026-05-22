'use client'

import { useState } from 'react'

interface ChannelLogoProps {
  logoUrl: string | null
  name: string
}

export default function ChannelLogo({ logoUrl, name }: ChannelLogoProps) {
  const [error, setError] = useState(false)

  return (
    <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center shrink-0">
      {logoUrl && !error ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={logoUrl}
          alt={name}
          className="w-full h-full object-contain p-1"
          onError={() => setError(true)}
        />
      ) : (
        <span className="text-xs font-bold text-slate-600 font-mono">LOGO</span>
      )}
    </div>
  )
}
