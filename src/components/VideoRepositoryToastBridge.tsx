'use client'

import { Suspense, useEffect, useRef } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useToast } from '@/components/Toast'

function VideoRepositoryToastBridgeInner() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const { showToast } = useToast()
  const shownKeyRef = useRef<string | null>(null)

  useEffect(() => {
    const notice = searchParams.get('notice')
    const error = searchParams.get('error')
    if (!notice && !error) return

    const key = `${notice || ''}:${error || ''}:${searchParams.toString()}`
    if (shownKeyRef.current === key) return
    shownKeyRef.current = key

    if (error) {
      showToast('error', decodeURIComponent(error))
    } else if (notice) {
      const noticeMessage = getNoticeMessage(notice)
      if (noticeMessage) {
        showToast('success', noticeMessage)
      }
    }

    const params = new URLSearchParams(searchParams.toString())
    params.delete('notice')
    params.delete('error')
    const nextQuery = params.toString()
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false })
  }, [pathname, router, searchParams, showToast])

  useEffect(() => {
    const handleResize = () => {
      const mainEl = document.querySelector('main')
      if (!mainEl) return

      if (window.innerWidth >= 1280) {
        mainEl.style.overflow = 'hidden'
        mainEl.style.height = 'calc(100vh - 64px)'
        mainEl.style.maxHeight = 'calc(100vh - 64px)'
      } else {
        mainEl.style.overflow = ''
        mainEl.style.height = ''
        mainEl.style.maxHeight = ''
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      const mainEl = document.querySelector('main')
      if (mainEl) {
        mainEl.style.overflow = ''
        mainEl.style.height = ''
        mainEl.style.maxHeight = ''
      }
    }
  }, [])


  return null
}

export default function VideoRepositoryToastBridge() {
  return (
    <Suspense fallback={null}>
      <VideoRepositoryToastBridgeInner />
    </Suspense>
  )
}

function getNoticeMessage(notice: string) {
  switch (notice) {
    case 'video-updated':
      return 'Perubahan video berhasil disimpan.'
    case 'video-deleted':
      return 'Video berhasil dihapus dari repository.'
    case 'folder-created':
      return 'Folder baru berhasil ditambahkan.'
    case 'folder-updated':
      return 'Perubahan folder berhasil disimpan.'
    case 'folder-deleted':
      return 'Folder berhasil dihapus.'
    case 'folder-status':
      return 'Status folder berhasil diperbarui.'
    case 'video-status':
      return 'Status video berhasil diperbarui.'
    case 'broadcast-saved':
      return 'Video broadcast berhasil disimpan.'
    case 'broadcast-reset':
      return 'Video broadcast berhasil direset.'
    case 'broadcast-live':
      return 'Perintah video broadcast live berhasil dikirim.'
    default:
      return ''
  }
}
