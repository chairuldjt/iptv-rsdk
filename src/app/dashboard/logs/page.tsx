import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import ConfirmForm from '@/components/ConfirmForm'

export const revalidate = 0 // Disable cache for live logs
const PAGE_SIZE = 100

// Server Action to clear all error logs
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
  const logWhere = filterDeviceId
    ? {
        deviceId: filterDeviceId,
      }
    : undefined
  const totalLogs = await prisma.deviceLog.count({ where: logWhere })
  const totalPages = Math.max(1, Math.ceil(totalLogs / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)

  // Fetch all logs matching search params
  const logs = await prisma.deviceLog.findMany({
    where: logWhere,
    include: {
      device: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    skip: (safePage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  })

  // Fetch devices for filter dropdown
  const devices = await prisma.device.findMany({
    orderBy: { deviceName: 'asc' },
  })

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">Diagnostics Log Viewer</h2>
          <p className="text-slate-400 mt-1 text-sm">Real-time logs, playback errors, and hardware diagnostic events reported by client Android STBs.</p>
        </div>

        {/* Clear Logs Button Form */}
        <ConfirmForm action={clearAllLogsAction} message="Are you sure you want to clear all error logs?">
          <button
            type="submit"
            className="px-4 py-2 text-xs font-bold text-rose-400 hover:text-white border border-rose-500/20 hover:bg-rose-500/10 rounded-xl cursor-pointer transition-all self-end shrink-0"
          >
            Clear All Logs
          </button>
        </ConfirmForm>
      </div>

      {/* Filter Control Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-border">
        <form method="GET" action="/dashboard/logs" className="flex flex-wrap gap-4 items-center">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-500 uppercase mb-1">Filter by Device</span>
            <select
              name="deviceId"
              defaultValue={filterDeviceId || ''}
              className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-primary min-w-[200px]"
            >
              <option value="">All Registered Devices</option>
              {devices.map((d) => (
                <option key={d.id} value={d.deviceId}>
                  {d.deviceName} ({d.deviceId.substring(0, 8)}...)
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-primary hover:bg-indigo-500 text-white text-xs font-bold transition-all self-end h-[38px] cursor-pointer"
          >
            Apply Filters
          </button>

          {filterDeviceId && (
            <a
              href="/dashboard/logs"
              className="px-4 py-2.5 text-xs text-slate-400 hover:text-white border border-slate-700/50 hover:bg-slate-800/40 rounded-xl transition-all self-end h-[38px] flex items-center"
            >
              Clear Filter
            </a>
          )}
        </form>
      </div>

      {/* Diagnostics Logs Table Card */}
      <div className="glass-card rounded-2xl border border-border overflow-hidden">
        <div className="px-6 py-5 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h3 className="font-bold text-white text-lg">Diagnostics Logs ({totalLogs})</h3>
            {totalLogs > PAGE_SIZE && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Page {safePage} of {totalPages}</span>
                <a
                  href={`/dashboard/logs?deviceId=${filterDeviceId || ''}&page=${Math.max(1, safePage - 1)}`}
                  className={`px-3 py-2 rounded-lg border border-border ${safePage <= 1 ? 'pointer-events-none opacity-40' : 'hover:bg-slate-800'}`}
                >
                  Previous
                </a>
                <a
                  href={`/dashboard/logs?deviceId=${filterDeviceId || ''}&page=${Math.min(totalPages, safePage + 1)}`}
                  className={`px-3 py-2 rounded-lg border border-border ${safePage >= totalPages ? 'pointer-events-none opacity-40' : 'hover:bg-slate-800'}`}
                >
                  Next
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-border/80 text-slate-400 text-xs font-semibold uppercase tracking-wider bg-slate-900/30">
                <th className="p-4 px-6">Timestamp</th>
                <th className="p-4">Client STB</th>
                <th className="p-4">Error Type</th>
                <th className="p-4">Error Message & Stream URL</th>
                <th className="p-4 px-6 text-center">Android SDK</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-500 text-sm">
                    No diagnostics logs captured. Client devices are operating without issues!
                  </td>
                </tr>
              ) : (
                logs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-800/10 transition-colors">
                    <td className="p-4 px-6 text-xs text-slate-400 font-medium">
                      {new Date(l.createdAt).toLocaleString()}
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-white">{l.device.deviceName}</div>
                      <div className="text-slate-500 text-[10px] font-mono mt-0.5">ID: {l.deviceId.substring(0, 12)}...</div>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        {l.errorType}
                      </span>
                    </td>
                    <td className="p-4 max-w-md">
                      <div className="text-slate-200 font-semibold text-xs leading-normal break-words">
                        {l.errorMessage}
                      </div>
                      {l.streamUrl && (
                        <div className="text-slate-500 text-[10px] font-mono break-all mt-1 bg-slate-900/30 p-1.5 rounded border border-border/40">
                          Stream: {l.streamUrl}
                        </div>
                      )}
                      {l.channelId && (
                        <div className="text-slate-400 text-[10px] mt-1 font-medium">
                          Channel ID: {l.channelId}
                        </div>
                      )}
                    </td>
                    <td className="p-4 px-6 text-center text-slate-400 text-xs font-mono">
                      {l.androidSdk || 'N/A'}
                    </td>
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
