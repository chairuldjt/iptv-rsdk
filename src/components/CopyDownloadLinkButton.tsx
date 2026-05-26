'use client'

import { useState } from 'react'

interface CopyDownloadLinkButtonProps {
  url: string
}

export default function CopyDownloadLinkButton({ url }: CopyDownloadLinkButtonProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="btn btn-xs text-sky-400 border border-sky-500/20 hover:bg-sky-500/10"
    >
      {copied ? 'Copied' : 'Copy Link'}
    </button>
  )
}
