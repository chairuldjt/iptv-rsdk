'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'

interface DevicePaginationProps {
  totalItems: number
  pageSize: number
  currentPage: number
}

export default function DevicePagination({ totalItems, pageSize, currentPage }: DevicePaginationProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const totalPages = Math.ceil(totalItems / pageSize)
  if (totalPages <= 1) return null

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', page.toString())
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const getPageNumbers = () => {
    const pages: Array<number | string> = []
    const range = 1
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - range && i <= currentPage + range)) {
        pages.push(i)
      } else if (i === currentPage - range - 1 || i === currentPage + range + 1) {
        pages.push('...')
      }
    }
    const filtered: Array<number | string> = []
    pages.forEach((p) => {
      if (p === '...' && filtered[filtered.length - 1] === '...') return
      filtered.push(p)
    })
    return filtered
  }

  const pages = getPageNumbers()
  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalItems)

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-4 border-t border-border">
      <span className="text-xs text-muted-foreground">
        Showing <strong className="text-foreground">{startItem}-{endItem}</strong> of <strong className="text-foreground">{totalItems}</strong> devices
      </span>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="btn btn-xs btn-ghost disabled:opacity-30"
        >
          Prev
        </button>
        {pages.map((p, idx) => {
          if (p === '...') {
            return <span key={`dots-${idx}`} className="px-1 text-muted-foreground text-xs">...</span>
          }
          const pageNum = p as number
          return (
            <button
              key={`page-${pageNum}`}
              onClick={() => handlePageChange(pageNum)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold border transition-all ${
                currentPage === pageNum
                  ? 'bg-primary border-primary text-primary-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent/50'
              }`}
            >
              {pageNum}
            </button>
          )
        })}
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="btn btn-xs btn-ghost disabled:opacity-30"
        >
          Next
        </button>
      </div>
    </div>
  )
}
