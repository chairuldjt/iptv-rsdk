import prisma from '@/lib/db'
import path from 'path'
import { mkdir, writeFile } from 'fs/promises'
import { revalidatePath } from 'next/cache'
import ChannelLogo from '@/components/ChannelLogo'
import ChannelPreviewButton from '@/components/ChannelPreviewButton'
import PageHeader from '@/components/PageHeader'
import EmptyState from '@/components/FeedbackState'
import { createPlayableStreamUrl, createUdpOnDemandHlsPath, isUdpStreamUrl } from '@/lib/playableStreams'

export const revalidate = 0
const PAGE_SIZE = 200
const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024
const ALLOWED_LOGO_TYPES = new Map([
  ['image/png', 'png'], ['image/jpeg', 'jpg'], ['image/webp', 'webp'], ['image/svg+xml', 'svg'],
])
const PRELOADED_CHANNEL_LOGOS: Record<string, string> = {
  inews: '/uploads/channel-logos/preloaded/inews.png',
  antv: '/uploads/channel-logos/preloaded/antv.png',
  mdtv: '/uploads/channel-logos/preloaded/md-tv.png',
  tvone: '/uploads/channel-logos/preloaded/tv-one.png',
  mnctv: '/uploads/channel-logos/preloaded/mnc-tv.png',
  metrotv: '/uploads/channel-logos/preloaded/metro-tv.png',
  mentaritv: '/uploads/channel-logos/preloaded/mentari-tv.png',
  gtv: '/uploads/channel-logos/preloaded/gtv.png',
  transtv: '/uploads/channel-logos/preloaded/trans-tv.png',
  moji: '/uploads/channel-logos/preloaded/moji-tv.png',
  mojitv: '/uploads/channel-logos/preloaded/moji-tv.png',
  sinpotv: '/uploads/channel-logos/preloaded/sinpo-tv.png',
  rtv: '/uploads/channel-logos/preloaded/rtv.png',
  rajawalitv: '/uploads/channel-logos/preloaded/rtv.png',
  sctv: '/uploads/channel-logos/preloaded/sctv.png',
  trans7: '/uploads/channel-logos/preloaded/trans-7.png',
  indosiar: '/uploads/channel-logos/preloaded/indosiar.png',
  rcti: '/uploads/channel-logos/preloaded/rcti-tv.png',
  rctitv: '/uploads/channel-logos/preloaded/rcti-tv.png',
  tvrisport: '/uploads/channel-logos/preloaded/tvri-sport.png',
  kompastv: '/uploads/channel-logos/preloaded/kompas-tv.png',
  redbulltv: '/uploads/channel-logos/preloaded/red-bull-tv.png',
  intermilantv: '/uploads/channel-logos/preloaded/inter-milan-tv.png',
  intertv: '/uploads/channel-logos/preloaded/inter-milan-tv.png',
  qatartv: '/uploads/channel-logos/preloaded/qatar-tv.png',
  qatartelevision: '/uploads/channel-logos/preloaded/qatar-tv.png',
  dubaisporttv: '/uploads/channel-logos/preloaded/dubai-sport-tv.png',
  dubaisportstv: '/uploads/channel-logos/preloaded/dubai-sport-tv.png',
}

function sanitizeLogoFileName(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'channel-logo'
}
function normalizeChannelLogoKey(value: string) {
  return value.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
}

async function toggleChannelAction(formData: FormData) {
  'use server'
  const channelId = parseInt(formData.get('channelId') as string)
  const currentStatus = formData.get('currentStatus') === 'true'
  try {
    await prisma.channel.update({ where: { id: channelId }, data: { isActive: !currentStatus } })
    revalidatePath('/dashboard/channels')
  } catch (error) { console.error('Toggle channel error:', error) }
}

async function updateChannelLogoAction(formData: FormData) {
  'use server'
  const channelId = parseInt(formData.get('channelId') as string)
  const channelName = (formData.get('channelName') as string) || 'channel'
  const logoUrl = ((formData.get('logoUrl') as string) || '').trim()
  const logoFile = formData.get('logoFile') as File | null
  if (!Number.isInteger(channelId)) return
  try {
    let nextLogoUrl: string | null = logoUrl || null
    if (logoFile && logoFile.size > 0) {
      const extension = ALLOWED_LOGO_TYPES.get(logoFile.type)
      if (!extension) throw new Error(`Unsupported logo type: ${logoFile.type || 'unknown'}`)
      if (logoFile.size > MAX_LOGO_SIZE_BYTES) throw new Error('Logo file is larger than 2MB')
      const buffer = Buffer.from(await logoFile.arrayBuffer())
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'channel-logos', 'custom')
      await mkdir(uploadDir, { recursive: true })
      const safeName = sanitizeLogoFileName(channelName)
      const fileName = `${channelId}-${safeName}-${Date.now()}.${extension}`
      await writeFile(path.join(uploadDir, fileName), buffer)
      nextLogoUrl = `/uploads/channel-logos/custom/${fileName}`
    }
    await prisma.channel.update({ where: { id: channelId }, data: { logoUrl: nextLogoUrl } })
    revalidatePath('/dashboard/channels')
  } catch (error) { console.error('Update channel logo error:', error) }
}

async function clearChannelLogoAction(formData: FormData) {
  'use server'
  const channelId = parseInt(formData.get('channelId') as string)
  if (!Number.isInteger(channelId)) return
  try {
    await prisma.channel.update({ where: { id: channelId }, data: { logoUrl: null } })
    revalidatePath('/dashboard/channels')
  } catch (error) { console.error('Clear channel logo error:', error) }
}

async function applyRecommendedLogoAction(formData: FormData) {
  'use server'
  const channelId = parseInt(formData.get('channelId') as string)
  const channelName = (formData.get('channelName') as string) || ''
  const logoUrl = PRELOADED_CHANNEL_LOGOS[normalizeChannelLogoKey(channelName)]
  if (!Number.isInteger(channelId) || !logoUrl) return
  try {
    await prisma.channel.update({ where: { id: channelId }, data: { logoUrl } })
    revalidatePath('/dashboard/channels')
  } catch (error) { console.error('Apply recommended channel logo error:', error) }
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

  const playlists = await prisma.playlist.findMany({ orderBy: { name: 'asc' } })
  const globalPlaylist = playlists.find((playlist) => playlist.isGlobal)
  const selectedPlaylistId = filterPlaylistId || globalPlaylist?.id || playlists[0]?.id

  const channelWhere = selectedPlaylistId ? {
    playlistId: selectedPlaylistId,
    name: searchQuery ? { contains: searchQuery } : undefined,
  } : undefined

  const totalMatchingChannels = channelWhere ? await prisma.channel.count({ where: channelWhere }) : 0
  const totalPages = Math.max(1, Math.ceil(totalMatchingChannels / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)

  const channels = selectedPlaylistId
    ? await prisma.channel.findMany({
        where: channelWhere,
        include: { category: true, playlist: true },
        orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
        skip: (safePage - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      })
    : []

  const groupedChannels: { [categoryName: string]: typeof channels } = {}
  channels.forEach((c) => {
    const groupName = c.category?.name || 'Uncategorized'
    if (!groupedChannels[groupName]) groupedChannels[groupName] = []
    groupedChannels[groupName].push(c)
  })

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Channel & Category Manager"
        description="Browse, search, and manage channels extracted from your playlists. Disable offline/broken streams instantly."
      />

      {/* Filter Bar */}
      <div className="card p-4 rounded-2xl">
        <form method="GET" action="/dashboard/channels" className="flex flex-col md:flex-row gap-4 items-center w-full">
          <div className="flex flex-col w-full md:w-auto md:min-w-[200px]">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Select Playlist</span>
            <select name="playlistId" defaultValue={selectedPlaylistId || ''} className="field-input py-2">
              {playlists.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.totalChannels} channels)</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col flex-1 w-full">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Search Channels</span>
            <div className="relative">
              <input type="text" name="search" defaultValue={searchQuery} placeholder="Search channel name..." className="field-input pl-9" />
              <svg className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-sm py-2 md:self-end cursor-pointer">Apply Filters</button>
        </form>
      </div>

      {/* Pagination */}
      {totalMatchingChannels > PAGE_SIZE && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-muted-foreground">
          <span>Showing {channels.length} of {totalMatchingChannels} channels, page {safePage} of {totalPages}</span>
          <div className="flex gap-2">
            <a
              href={`/dashboard/channels?playlistId=${selectedPlaylistId || ''}&search=${encodeURIComponent(searchQuery)}&page=${Math.max(1, safePage - 1)}`}
              className={`btn btn-xs btn-ghost ${safePage <= 1 ? 'pointer-events-none opacity-30' : ''}`}
            >Previous</a>
            <a
              href={`/dashboard/channels?playlistId=${selectedPlaylistId || ''}&search=${encodeURIComponent(searchQuery)}&page=${Math.min(totalPages, safePage + 1)}`}
              className={`btn btn-xs btn-ghost ${safePage >= totalPages ? 'pointer-events-none opacity-30' : ''}`}
            >Next</a>
          </div>
        </div>
      )}

      {/* Channels Grid */}
      {Object.keys(groupedChannels).length === 0 ? (
        <EmptyState
          title={searchQuery ? 'No Matching Channels' : 'No Channels Found'}
          description={searchQuery ? 'No channels matched your search query.' : 'Select a playlist from the filter options or upload one in the Playlists section.'}
        />
      ) : (
        Object.keys(groupedChannels).map((catName) => (
          <div key={catName} className="space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <h3 className="font-semibold text-foreground text-sm">{catName}</h3>
              <span className="text-[10px] text-muted-foreground font-semibold px-2 py-0.5 rounded-md border border-border">
                {groupedChannels[catName].length} Channels
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {groupedChannels[catName].map((c) => {
                const recommendedLogoUrl = PRELOADED_CHANNEL_LOGOS[normalizeChannelLogoKey(c.name)]
                return (
                  <div
                    key={c.id}
                    className={`card p-4 rounded-xl space-y-4 transition-all duration-200 ${
                      c.isActive ? '' : 'border-rose-500/20 bg-rose-500/5 opacity-70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 overflow-hidden min-w-0">
                        <ChannelLogo logoUrl={c.logoUrl} name={c.name} />
                        <div className="overflow-hidden min-w-0">
                          <h4 className="font-semibold text-foreground text-xs truncate" title={c.name}>{c.name}</h4>
                          <p className="text-[10px] text-muted-foreground font-mono truncate mt-0.5" title={c.streamUrl}>{c.streamUrl}</p>
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-1.5">
                        <ChannelPreviewButton
                          name={c.name}
                          streamUrl={createPlayableStreamUrl({
                            origin: '',
                            streamUrl: c.playlist?.relayEnabled && isUdpStreamUrl(c.streamUrl) ? createUdpOnDemandHlsPath(c.id) : c.streamUrl,
                          })}
                          sourceLabel={c.playlist?.relayEnabled && isUdpStreamUrl(c.streamUrl) ? 'Relay Aktif' : 'Sumber Asli Playlist'}
                        />
                        <form action={toggleChannelAction}>
                          <input type="hidden" name="channelId" value={c.id} />
                          <input type="hidden" name="currentStatus" value={c.isActive ? 'true' : 'false'} />
                          <button type="submit" className={`btn btn-xs ${
                            c.isActive
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 hover:bg-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/15 hover:bg-rose-500/20'
                          }`}>
                            {c.isActive ? 'Active' : 'Disabled'}
                          </button>
                        </form>
                      </div>
                    </div>

                    <details className="group border-t border-border pt-2.5">
                      <summary className="cursor-pointer list-none text-[9px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 select-none">
                        <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                        Logo Channel
                      </summary>
                      <div className="mt-3 grid grid-cols-1 gap-3 animate-fade-in">
                        <form action={updateChannelLogoAction} className="grid gap-2">
                          <input type="hidden" name="channelId" value={c.id} />
                          <input type="hidden" name="channelName" value={c.name} />
                          <input type="url" name="logoUrl" defaultValue={c.logoUrl || ''} placeholder="Path logo / URL..." className="field-input text-xs py-1.5" />
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input type="file" name="logoFile" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="file-input" />
                            <button type="submit" className="btn btn-primary btn-xs py-1.5">Simpan Logo</button>
                          </div>
                        </form>
                        <div className="flex justify-between items-center border-t border-border pt-2">
                          <form action={clearChannelLogoAction}>
                            <input type="hidden" name="channelId" value={c.id} />
                            <button type="submit" className="text-[10px] font-semibold text-muted-foreground hover:text-rose-400 transition-colors cursor-pointer bg-transparent border-0 p-0">
                              Hapus logo channel
                            </button>
                          </form>
                          {recommendedLogoUrl && recommendedLogoUrl !== c.logoUrl && (
                            <form action={applyRecommendedLogoAction}>
                              <input type="hidden" name="channelId" value={c.id} />
                              <input type="hidden" name="channelName" value={c.name} />
                              <button type="submit" className="text-[10px] font-semibold text-amber-300 hover:text-amber-200 transition-colors cursor-pointer bg-transparent border-0 p-0">
                                Pakai logo rekomendasi
                              </button>
                            </form>
                          )}
                        </div>
                      </div>
                    </details>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
