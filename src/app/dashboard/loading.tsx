import React from 'react'
import { CardSkeleton } from '@/components/Skeleton'

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="skeleton h-8 w-56 rounded-lg" />
        <div className="skeleton h-4 w-80 rounded-md" />
      </div>
      <CardSkeleton count={4} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <div className="skeleton h-5 w-40 rounded" />
          </div>
          <div className="p-4 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="skeleton w-2 h-2 rounded-full" />
                  <div className="space-y-2">
                    <div className="skeleton h-4 w-28 rounded" />
                    <div className="skeleton h-3 w-40 rounded" />
                  </div>
                </div>
                <div className="skeleton h-5 w-14 rounded-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="card rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <div className="skeleton h-5 w-40 rounded" />
          </div>
          <div className="p-4 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2.5 border-b border-border/50 pb-4 last:border-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <div className="skeleton h-5 w-16 rounded-full" />
                  <div className="skeleton h-3 w-24 rounded" />
                </div>
                <div className="skeleton h-4 w-3/4 rounded" />
                <div className="skeleton h-3 w-48 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
