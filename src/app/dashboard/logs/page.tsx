import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import ConfirmForm from '@/components/ConfirmForm'
import PageHeader from '@/components/PageHeader'
import EmptyState from '@/components/FeedbackState'

export const revalidate = 0
const PAGE_SIZE = 100

async function clearAllLogsAction() {
  'use server'
  try {
    await prisma.deviceLog.deleteMany({})
    revalidatePath('/dashboard/logs')
    revalidatePath('/dashboard')
  } catch (error) {
    console.error('Clear logs error:', error)
  }
}

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<{ deviceId?: string; page?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const filterDeviceId = resolvedSearchParams.deviceId
  const currentPage = Math.max(1, parseInt(resolvedSearchParams.page || '1', 10) || 1)
  const logWhere = filterDeviceId ? { deviceId: filterDeviceId } : undefined
  const totalLogs = await prisma.deviceLog.count({ where: logWhere })
  const totalPages = Math.max(1, Math.ceil(totalLogs / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)

  const logs = await prisma.deviceLog.findMany({
    where: logWhere,
    include: { device: true },
    orderBy: { createdAt: 'desc' },
    skip: (safePage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  })

  const devices = await prisma.device.findMany({ orderBy: { deviceName: 'asc' } })

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <PageHeader
          title="Diagnostics Log Viewer"
          description="Real-time logs, playback errors, and hardware diagnostic events reported by client Android STBs."
        />
        <ConfirmForm action={clearAllLogsAction} message="Are you sure you want to clear all error logs?">
          <button type="submit" className="btn btn-sm text-rose-400 border border-rose-500/20 hover:bg-rose-500/10">
            Clear All Logs
          </button>
        </ConfirmForm>
      </div>

      {/* Filter Bar */}
      <div className="card p-4 rounded-2xl">
        <form method="GET" action="/dashboard/logs" className="flex flex-wrap gap-4 items-center">
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Filter by Device</span>
            <select name="deviceId" defaultValue={filterDeviceId || ''} className="field-input py-2 min-w-[200px]">
              <option value="">All Registered Devices</option>
              {devices.map((d) => (
                <option key={d.id} value={d.deviceId}>{d.deviceName} ({d.deviceId.substring(0, 8)}...)</option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-primary btn-sm py-2">Apply Filters</button>
          {filterDeviceId && (
            <a href="/dashboard/logs" className="btn btn-sm btn-ghost self-end">Clear Filter</a>
          )}
        </form>
      </div>

      {/* Logs Table */}
      <div className="card rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h3 className="font-semibold text-foreground text-sm">Diagnostics Logs ({totalLogs})</h3>
            {totalLogs > PAGE_SIZE && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Page {safePage} of {totalPages}</span>
                <a href={`/dashboard/logs?deviceId=${filterDeviceId || ''}&page=${Math.max(1, safePage - 1)}`}
                  className={`btn btn-xs btn-ghost ${safePage <= 1 ? 'pointer-events-none opacity-30' : ''}`}>Previous</a>
                <a href={`/dashboard/logs?deviceId=${filterDeviceId || ''}&page=${Math.min(totalPages, safePage + 1)}`}
                  className={`btn btn-xs btn-ghost ${safePage >= totalPages ? 'pointer-events-none opacity-30' : ''}`}>Next</a>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
                <th className="p-4 px-5">Timestamp</th>
                <th className="p-4">Client STB</th>
                <th className="p-4">Error Type</th>
                <th className="p-4">Error Message & Stream URL</th>
                <th className="p-4 px-5 text-center">Android SDK</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 text-xs">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState
                      title="No Diagnostics Logs"
                      description="Client devices are operating without issues!"
                    />
                  </td>
                </tr>
              ) : (
                logs.map((l) => (
                  <tr key={l.id} className="hover:bg-accent/30 transition-colors">
                    <td className="p-4 px-5 text-xs text-muted-foreground font-medium font-mono">
                      {new Date(l.createdAt).toLocaleString()}
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-foreground text-xs">{l.device.deviceName}</div>
                      <div className="text-muted-foreground text-[10px] font-mono mt-0.5">ID: {l.deviceId.substring(0, 12)}...</div>
                    </td>
                    <td className="p-4">
                      <span className="badge badge-destructive">{l.errorType}</span>
                    </td>
                    <td className="p-4 max-w-md">
                      <div className="text-foreground/80 font-semibold text-xs leading-normal break-words">{l.errorMessage}</div>
                      {l.streamUrl && (
                        <div className="text-muted-foreground text-[10px] font-mono break-all mt-1 bg-background/60 p-2 rounded-lg border border-border">
                          Stream: {l.streamUrl}
                        </div>
                      )}
                      {l.channelId && <div className="text-muted-foreground text-[9px] mt-1 font-semibold">Channel ID: {l.channelId}</div>}
                    </td>
                    <td className="p-4 px-5 text-center text-muted-foreground text-xs font-mono">{l.androidSdk || 'N/A'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
