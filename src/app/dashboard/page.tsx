import prisma from '@/lib/db'
import Link from 'next/link'

export const revalidate = 0 // Disable cache for live stats

export default async function DashboardPage() {
  // Fetch stats from DB
  const totalDevices = await prisma.device.count()
  const activeDevices = await prisma.device.count({ where: { isActive: true } })
  
  // A device is considered online if it had a heartbeat in the last 10 minutes (600 seconds)
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
  const onlineDevices = await prisma.device.count({
    where: {
      lastOnline: {
        gte: tenMinutesAgo,
      },
      isActive: true,
    },
  })

  const totalPlaylists = await prisma.playlist.count()
  const totalChannels = await prisma.channel.count()
  const totalLogs = await prisma.deviceLog.count()

  // Fetch 5 recently active devices
  const recentDevices = await prisma.device.findMany({
    orderBy: { lastOnline: 'desc' },
    take: 5,
  })

  // Fetch 5 recent error logs
  const recentLogs = await prisma.deviceLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      device: true,
    },
  })

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Title */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white">Dashboard Overview</h2>
        <p className="text-slate-400 mt-1 text-sm">Real-time status of your RSDK IPTV player fleet and channel distribution.</p>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1 */}
        <div className="glass-card p-6 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Devices</span>
            <h3 className="text-3xl font-extrabold text-white mt-1">{totalDevices}</h3>
            <span className="text-xs text-emerald-400 font-medium mt-1 inline-block">{activeDevices} Active ({totalDevices - activeDevices} Inactive)</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 glow-indigo">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
        </div>

        {/* Card 2 */}
        <div className="glass-card p-6 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Online STBs</span>
            <h3 className="text-3xl font-extrabold text-emerald-400 mt-1">{onlineDevices}</h3>
            <span className="text-xs text-slate-400 font-medium mt-1 inline-block">Active heartbeats (10m)</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 glow-green">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>

        {/* Card 3 */}
        <div className="glass-card p-6 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Channels</span>
            <h3 className="text-3xl font-extrabold text-violet-400 mt-1">{totalChannels}</h3>
            <span className="text-xs text-slate-400 font-medium mt-1 inline-block">From {totalPlaylists} M3U Playlists</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 00-2 2z" />
            </svg>
          </div>
        </div>

        {/* Card 4 */}
        <div className="glass-card p-6 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Playback Errors</span>
            <h3 className="text-3xl font-extrabold text-rose-500 mt-1">{totalLogs}</h3>
            <span className="text-xs text-rose-400 font-medium mt-1 inline-block">Urgent logs registered</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Main Grid Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Devices */}
        <div className="glass-card rounded-2xl border border-border overflow-hidden">
          <div className="px-6 py-5 border-b border-border flex items-center justify-between">
            <h4 className="font-bold text-white text-base">Recently Active Devices</h4>
            <Link href="/dashboard/devices" className="text-xs font-bold text-indigo-400 hover:text-indigo-300">View All →</Link>
          </div>
          <div className="divide-y divide-border/60">
            {recentDevices.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">No registered devices yet. Run the Android client to auto-register.</div>
            ) : (
              recentDevices.map((d) => {
                const isOnline = d.lastOnline && d.lastOnline.getTime() >= tenMinutesAgo.getTime()
                return (
                  <div key={d.id} className="p-4 px-6 flex items-center justify-between hover:bg-slate-800/20 transition-all">
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-500 glow-green' : 'bg-slate-600'}`}></div>
                      <div>
                        <span className="font-semibold text-sm text-white">{d.deviceName}</span>
                        <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-slate-400 mt-0.5">
                          <span>IP: {d.lastIp || 'Unknown'}</span>
                          {d.macAddress && (
                            <>
                              <span>•</span>
                              <span className="text-indigo-400">MAC: {d.macAddress}</span>
                            </>
                          )}
                          <span>•</span>
                          <span>ID: {d.deviceId.substring(0, 12)}...</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${d.isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-700/30 text-slate-400 border border-slate-700/50'}`}>
                        {d.isActive ? 'Active' : 'Disabled'}
                      </span>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Online: {d.lastOnline ? new Date(d.lastOnline).toLocaleTimeString() : 'Never'}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Recent Error Logs */}
        <div className="glass-card rounded-2xl border border-border overflow-hidden">
          <div className="px-6 py-5 border-b border-border flex items-center justify-between">
            <h4 className="font-bold text-white text-base">Urgent Diagnostics Logs</h4>
            <Link href="/dashboard/logs" className="text-xs font-bold text-indigo-400 hover:text-indigo-300">View All →</Link>
          </div>
          <div className="divide-y divide-border/60">
            {recentLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">No client errors reported. Systems are running smoothly!</div>
            ) : (
              recentLogs.map((l) => (
                <div key={l.id} className="p-4 px-6 hover:bg-slate-800/20 transition-all flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-500 text-[10px] font-bold border border-rose-500/20">
                      {l.errorType}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(l.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-300 line-clamp-1">{l.errorMessage}</p>
                  <div className="flex gap-2 text-[10px] text-slate-500">
                    <span>STB: {l.device.deviceName}</span>
                    <span>•</span>
                    <span>Channel ID: {l.channelId || 'N/A'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
