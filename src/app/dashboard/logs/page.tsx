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

      <div className="toolbar">
        <form method="GET" action="/dashboard/logs" className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col">
            <span className="text-[0.625rem] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Filter Perangkat</span>
            <select name="deviceId" defaultValue={filterDeviceId || ''} className="field-input py-2 min-w-[200px]">
              <option value="">Semua Perangkat</option>
              {devices.map((d) => (
                <option key={d.id} value={d.deviceId}>{d.deviceName}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-primary btn-sm">Terapkan</button>
          {filterDeviceId && (
            <a href="/dashboard/logs" className="btn btn-sm btn-ghost">Hapus Filter</a>
          )}
        </form>
      </div>

      <div className="section-card">
        <div className="section-card-header flex items-center justify-between flex-wrap gap-3">
          <h3 className="font-semibold text-sm text-foreground">Diagnostics Logs ({totalLogs})</h3>
          {totalLogs > PAGE_SIZE && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Halaman {safePage} / {totalPages}</span>
              <a href={`/dashboard/logs?deviceId=${filterDeviceId || ''}&page=${Math.max(1, safePage - 1)}`}
                className={`btn btn-xs btn-ghost ${safePage <= 1 ? 'pointer-events-none opacity-30' : ''}`}>Sebelumnya</a>
              <a href={`/dashboard/logs?deviceId=${filterDeviceId || ''}&page=${Math.min(totalPages, safePage + 1)}`}
                className={`btn btn-xs btn-ghost ${safePage >= totalPages ? 'pointer-events-none opacity-30' : ''}`}>Berikutnya</a>
            </div>
          )}
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Perangkat</th>
                <th>Tipe Error</th>
                <th>Pesan &amp; Stream</th>
                <th className="text-center">SDK</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState
                      title="Tidak Ada Log Diagnostik"
                      description="Semua perangkat beroperasi normal tanpa masalah!"
                    />
                  </td>
                </tr>
              ) : (
                logs.map((l) => (
                  <tr key={l.id}>
                    <td className="text-muted-foreground font-mono text-[0.6875rem]">
                      {new Date(l.createdAt).toLocaleString('id-ID')}
                    </td>
                    <td>
                      <div className="font-semibold text-foreground">{l.device.deviceName}</div>
                      <div className="text-[0.625rem] text-muted-foreground font-mono mt-0.5">ID: {l.deviceId.substring(0, 12)}...</div>
                    </td>
                    <td>
                      <span className="badge badge-destructive">{l.errorType}</span>
                    </td>
                    <td className="max-w-md">
                      <div className="text-foreground/80 font-medium leading-normal break-words">{l.errorMessage}</div>
                      {l.streamUrl && (
                        <div className="text-[0.625rem] text-muted-foreground font-mono break-all mt-1 bg-background/60 p-2 rounded-lg border border-border">
                          Stream: {l.streamUrl}
                        </div>
                      )}
                      {l.channelId && <div className="text-[0.5625rem] text-muted-foreground mt-1">Channel ID: {l.channelId}</div>}
                    </td>
                    <td className="text-center text-muted-foreground font-mono">{l.androidSdk || '-'}</td>
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
