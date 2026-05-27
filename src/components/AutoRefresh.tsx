'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/**
 * Komponen invisible yang memanggil router.refresh() secara periodik
 * agar data Server Component (device list, status, dll) selalu fresh
 * tanpa perlu full page reload.
 */
export default function AutoRefresh({ intervalMs = 30000 }: { intervalMs?: number }) {
  const router = useRouter()

  useEffect(() => {
    const id = setInterval(() => {
      router.refresh()
    }, intervalMs)
    return () => clearInterval(id)
  }, [router, intervalMs])

  return null
}
