import prisma from '@/lib/db'
import { getOnlineThreshold } from '@/lib/time'
import Link from 'next/link'
import StatCard from '@/components/StatCard'
import PageHeader from '@/components/PageHeader'

export const revalidate = 0

export default async function DashboardPage() {
  const totalDevices = await prisma.device.count()
  const activeDevices = await prisma.device.count({ where: { isActive: true } })

  const tenMinutesAgo = getOnlineThreshold(10)
  const onlineDevices = await prisma.device.count({
    where: {
      lastOnline: { gte: tenMinutesAgo },
      isActive: true,
    },
  })

  const totalPlaylists = await prisma.playlist.count()
  const totalChannels = await prisma.channel.count()
  const totalLogs = await prisma.deviceLog.count()

  const recentDevices = await prisma.device.findMany({
    orderBy: { lastOnline: 'desc' },
    take: 5,
  })

  const recentLogs = await prisma.deviceLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { device: true },
  })

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Dashboard Overview"
        description="Real-time status of your RSDK IPTV player fleet and channel distribution."
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Devices"
          value={totalDevices}
          subtitle={`${activeDevices} Active · ${totalDevices - activeDevices} Inactive`}
          variant="info"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
            </svg>
          }
        />
        <StatCard
          title="Online STBs"
          value={onlineDevices}
          subtitle="Active heartbeats (10 min)"
          variant="success"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          }
        />
        <StatCard
          title="Total Channels"
          value={totalChannels}
          subtitle={`From ${totalPlaylists} M3U Playlists`}
          variant="info"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9.75a2.25 2.25 0 002.25-2.25V7.5a2.25 2.25 0 00-2.25-2.25H4.5A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
            </svg>
          }
        />
        <StatCard
          title="Playback Errors"
          value={totalLogs}
          subtitle="Urgent logs registered"
          variant="destructive"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          }
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Devices */}
        <div className="card rounded-2xl overflow-hidden border-border">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h4 className="font-semibold text-foreground text-sm">Recently Active Devices</h4>
            <Link href="/dashboard/devices" className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors">
              View All &rarr;
            </Link>
          </div>
          <div className="divide-y divide-border/50">
            {recentDevices.length === 0 ? (
              <div className="px-5 py-12 text-center text-xs text-muted-foreground">
                No registered devices yet. Run the Android client to auto-register.
              </div>
            ) : (
              recentDevices.map((d) => {
                const isOnline = d.lastOnline && d.lastOnline.getTime() >= tenMinutesAgo.getTime()
                return (
                  <div key={d.id} className="p-4 px-5 flex items-center justify-between hover:bg-accent/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${isOnline ? 'bg-emerald-500' : 'bg-muted'}`} />
                      <div className="min-w-0">
                        <span className="font-semibold text-xs text-foreground block truncate">{d.deviceName}</span>
                        <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground mt-0.5 font-mono">
                          <span>IP: {d.lastIp || 'Unknown'}</span>
                          {d.macAddress && (
                            <>
                              <span>·</span>
                              <span>MAC: {d.macAddress}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <span className={d.isActive
                        ? 'badge badge-success'
                        : 'badge badge-muted'
                      }>
                        {d.isActive ? 'Active' : 'Disabled'}
                      </span>
                      <p className="text-[9px] text-muted-foreground mt-1 font-mono">
                        {d.lastOnline ? new Date(d.lastOnline).toLocaleTimeString() : 'Never'}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Recent Logs */}
        <div className="card rounded-2xl overflow-hidden border-border">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h4 className="font-semibold text-foreground text-sm">Recent Diagnostics Logs</h4>
            <Link href="/dashboard/logs" className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors">
              View All &rarr;
            </Link>
          </div>
          <div className="divide-y divide-border/50">
            {recentLogs.length === 0 ? (
              <div className="px-5 py-12 text-center text-xs text-muted-foreground">
                No client errors reported. Systems are running smoothly.
              </div>
            ) : (
              recentLogs.map((l) => (
                <div key={l.id} className="p-4 px-5 hover:bg-accent/30 transition-colors flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="badge badge-destructive">{l.errorType}</span>
                    <span className="text-[9px] text-muted-foreground font-mono">
                      {new Date(l.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-foreground/80 line-clamp-1">{l.errorMessage}</p>
                  <div className="flex gap-2 text-[9px] text-muted-foreground font-mono">
                    <span>STB: {l.device.deviceName}</span>
                    <span>·</span>
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
