'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState, useTransition } from 'react'

export default function DeviceSearchAndLimit() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const currentSearch = searchParams.get('q') || ''
  const currentLimit = searchParams.get('limit') || '25'
  const [search, setSearch] = useState(currentSearch)

  const updateParams = useCallback((newSearch: string, newLimit: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (newSearch) params.set('q', newSearch)
    else params.delete('q')
    params.set('limit', newLimit)
    params.set('page', '1')
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    })
  }, [pathname, router, searchParams])

  useEffect(() => {
    if (search === currentSearch) return
    const delayDebounce = setTimeout(() => {
      updateParams(search, currentLimit)
    }, 450)
    return () => clearTimeout(delayDebounce)
  }, [currentLimit, currentSearch, search, updateParams])

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between w-full px-5 pt-5 pb-2">
      <div className="relative w-full sm:max-w-xs md:max-w-md">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-muted-foreground">
          {isPending ? (
            <svg className="animate-spin h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          )}
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, ID, IP or MAC..."
          className="w-full pl-10 pr-10 py-2 bg-background border border-border rounded-lg text-foreground text-xs focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors placeholder:text-muted-foreground"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
        <label className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Per Page:</label>
        <select
          value={currentLimit}
          onChange={(e) => updateParams(search, e.target.value)}
          className="px-2.5 py-1.5 bg-background border border-border rounded-lg text-foreground text-xs font-semibold focus:outline-none focus:border-primary/50 cursor-pointer"
        >
          <option value="10">10</option>
          <option value="25">25</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </select>
      </div>
    </div>
  )
}
