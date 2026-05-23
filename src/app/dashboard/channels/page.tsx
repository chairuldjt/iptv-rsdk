import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import ChannelLogo from '@/components/ChannelLogo'
import ChannelPreviewButton from '@/components/ChannelPreviewButton'
import { createRelayPath } from '@/lib/streamRelay'

export const revalidate = 0 // Disable cache for live channel lists
const PAGE_SIZE = 200

// Server Action to toggle a channel's active status
async function toggleChannelAction(formData: FormData) {
  'use server'
  const channelId = parseInt(formData.get('channelId') as string)
  const currentStatus = formData.get('currentStatus') === 'true'

  try {
    await prisma.channel.update({
      where: { id: channelId },
      data: { isActive: !currentStatus },
    })
    revalidatePath('/dashboard/channels')
  } catch (error) {
    console.error('Toggle channel error:', error)
  }
}

export default async function ChannelsPage({
  searchParams,
}: {
  searchParams: Promise<{ playlistId?: string; search?: string; page?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const filterPlaylistId = resolvedSearchParams.playlistId ? parseInt(resolvedSearchParams.playlistId) : undefined
  const searchQuery = resolvedSearchParams.search || ''
  const currentPage = Math.max(1, parseInt(resolvedSearchParams.page || '1', 10) || 1)

  // Fetch all playlists for filter selector
  const playlists = await prisma.playlist.findMany({
    orderBy: { name: 'asc' },
  })

  // Determine active playlist filter ID
  const selectedPlaylistId = filterPlaylistId || playlists[0]?.id

  const channelWhere = selectedPlaylistId
    ? {
        playlistId: selectedPlaylistId,
        name: searchQuery
          ? {
              contains: searchQuery,
            }
          : undefined,
      }
    : undefined

  const totalMatchingChannels = channelWhere
    ? await prisma.channel.count({ where: channelWhere })
    : 0

  const totalPages = Math.max(1, Math.ceil(totalMatchingChannels / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)

  // Fetch channels based on filter
  const channels = selectedPlaylistId
    ? await prisma.channel.findMany({
        where: channelWhere,
        include: {
          category: true,
          playlist: true,
        },
        orderBy: [
          { category: { sortOrder: 'asc' } },
          { sortOrder: 'asc' },
        ],
        skip: (safePage - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      })
    : []

  // Group channels by Category
  const groupedChannels: { [categoryName: string]: typeof channels } = {}
  channels.forEach((c) => {
    const groupName = c.category?.name || 'Uncategorized'
    if (!groupedChannels[groupName]) {
      groupedChannels[groupName] = []
    }
    groupedChannels[groupName].push(c)
  })

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">Channel & Category Manager</h2>
          <p className="text-slate-400 mt-1 text-sm">Browse, search, and manage channels extracted from your playlists. Disable offline/broken streams instantly.</p>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-border flex flex-col md:flex-row gap-4 items-center justify-between">
        <form method="GET" action="/dashboard/channels" className="flex flex-wrap gap-4 items-center w-full">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-500 uppercase mb-1">Select Playlist</span>
            <select
              name="playlistId"
              defaultValue={selectedPlaylistId || ''}
              className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-primary min-w-[200px]"
            >
              {playlists.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.totalChannels} channels)
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col flex-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase mb-1">Search Channels</span>
            <div className="relative">
              <input
                type="text"
                name="search"
                defaultValue={searchQuery}
                placeholder="Search channel name..."
                className="w-full px-4 py-2 pl-10 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-primary"
              />
              <svg className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-primary hover:bg-indigo-500 text-white text-xs font-bold transition-all self-end h-[38px] cursor-pointer"
          >
            Apply Filters
          </button>
        </form>
      </div>

      {/* Grouped Channels Grid */}
      {totalMatchingChannels > PAGE_SIZE && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-400">
          <span>
            Showing {channels.length} of {totalMatchingChannels} channels, page {safePage} of {totalPages}
          </span>
          <div className="flex gap-2">
            <a
              href={`/dashboard/channels?playlistId=${selectedPlaylistId || ''}&search=${encodeURIComponent(searchQuery)}&page=${Math.max(1, safePage - 1)}`}
              className={`px-3 py-2 rounded-lg border border-border ${safePage <= 1 ? 'pointer-events-none opacity-40' : 'hover:bg-slate-800'}`}
            >
              Previous
            </a>
            <a
              href={`/dashboard/channels?playlistId=${selectedPlaylistId || ''}&search=${encodeURIComponent(searchQuery)}&page=${Math.min(totalPages, safePage + 1)}`}
              className={`px-3 py-2 rounded-lg border border-border ${safePage >= totalPages ? 'pointer-events-none opacity-40' : 'hover:bg-slate-800'}`}
            >
              Next
            </a>
          </div>
        </div>
      )}

      {Object.keys(groupedChannels).length === 0 ? (
        <div className="glass-card p-12 text-center text-slate-500 rounded-2xl border border-border">
          {searchQuery ? 'No channels matched your search query.' : 'Select a playlist from the filter options or upload one in the Playlists section.'}
        </div>
      ) : (
        Object.keys(groupedChannels).map((catName) => (
          <div key={catName} className="space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-1">
              <span className="w-2.5 h-2.5 rounded bg-primary glow-indigo"></span>
              <h3 className="font-bold text-white text-lg">{catName}</h3>
              <span className="text-xs text-slate-400 font-semibold bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700">
                {groupedChannels[catName].length} Channels
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {groupedChannels[catName].map((c) => (
                <div
                  key={c.id}
                  className={`glass-card p-5 rounded-2xl border flex items-center justify-between gap-4 ${
                    c.isActive ? 'border-border/60' : 'border-rose-500/20 bg-rose-500/5 opacity-70'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    {/* Channel Logo */}
                    <ChannelLogo logoUrl={c.logoUrl} name={c.name} />

                    <div className="overflow-hidden">
                      <h4 className="font-bold text-white text-sm truncate" title={c.name}>{c.name}</h4>
                      <p className="text-[10px] text-slate-500 font-mono truncate mt-0.5" title={c.streamUrl}>
                        {c.streamUrl}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <ChannelPreviewButton
                      name={c.name}
                      directUrl={c.streamUrl}
                      relayUrl={createRelayPath(c.streamUrl)}
                    />

                    {/* Toggle Activation Action */}
                    <form action={toggleChannelAction}>
                      <input type="hidden" name="channelId" value={c.id} />
                      <input type="hidden" name="currentStatus" value={c.isActive ? 'true' : 'false'} />
                      <button
                        type="submit"
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                          c.isActive
                            ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/10'
                            : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/10'
                        }`}
                      >
                        {c.isActive ? 'Active' : 'Disabled'}
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
