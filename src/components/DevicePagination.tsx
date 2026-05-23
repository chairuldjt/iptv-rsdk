'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'

interface DevicePaginationProps {
  totalItems: number
  pageSize: number
  currentPage: number
}

export default function DevicePagination({
  totalItems,
  pageSize,
  currentPage,
}: DevicePaginationProps) {
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

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages = []
    const range = 1 // how many pages to show around current page
    
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - range && i <= currentPage + range)
      ) {
        pages.push(i)
      } else if (
        i === currentPage - range - 1 ||
        i === currentPage + range + 1
      ) {
        pages.push('...')
      }
    }
    
    // Filter duplicates of '...'
    const filteredPages: Array<number | string> = []
    pages.forEach((p) => {
      if (p === '...' && filteredPages[filteredPages.length - 1] === '...') {
        return
      }
      filteredPages.push(p)
    })
    return filteredPages
  }

  const pages = getPageNumbers()

  // Calculate item range
  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalItems)

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-5 border-t border-slate-800 bg-slate-950/20">
      {/* Items status */}
      <span className="text-xs text-slate-400">
        Showing <strong className="text-white">{startItem}-{endItem}</strong> of <strong className="text-white">{totalItems}</strong> devices
      </span>

      {/* Navigation Buttons */}
      <div className="flex items-center gap-1.5">
        {/* Previous Button */}
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700/80 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 hover:text-white rounded-xl border border-slate-700/50 shadow-sm transition-all text-xs font-bold cursor-pointer"
        >
          Prev
        </button>

        {/* Page numbers */}
        {pages.map((p, idx) => {
          if (p === '...') {
            return (
              <span key={`dots-${idx}`} className="px-1.5 text-slate-500 font-bold select-none text-xs">
                ...
              </span>
            )
          }

          const pageNum = p as number
          return (
            <button
              key={`page-${pageNum}`}
              onClick={() => handlePageChange(pageNum)}
              className={`w-7.5 h-7.5 flex items-center justify-center rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                currentPage === pageNum
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-slate-800/50 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              {pageNum}
            </button>
          )
        })}

        {/* Next Button */}
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700/80 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 hover:text-white rounded-xl border border-slate-700/50 shadow-sm transition-all text-xs font-bold cursor-pointer"
        >
          Next
        </button>
      </div>
    </div>
  )
}
