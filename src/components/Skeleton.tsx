import React from 'react'

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-border">
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="p-4 px-5">
                <div className="skeleton h-3 w-16 rounded" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c} className="p-4 px-5">
                  <div className="skeleton h-4 rounded" style={{ width: `${40 + Math.random() * 60}%` }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-5 rounded-2xl flex items-center justify-between">
          <div className="space-y-3 flex-1">
            <div className="skeleton h-3 w-20 rounded" />
            <div className="skeleton h-8 w-16 rounded-lg" />
            <div className="skeleton h-3 w-32 rounded" />
          </div>
          <div className="skeleton w-11 h-11 rounded-xl shrink-0" />
        </div>
      ))}
    </div>
  )
}

export function ContentSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="skeleton h-8 w-48 rounded-lg" />
      <div className="skeleton h-4 w-96 rounded-md" />
      <CardSkeleton count={4} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <div className="skeleton h-5 w-40 rounded" />
          </div>
          <div className="p-4 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton h-6 rounded" />
            ))}
          </div>
        </div>
        <div className="card rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <div className="skeleton h-5 w-40 rounded" />
          </div>
          <div className="p-4 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton h-6 rounded" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
