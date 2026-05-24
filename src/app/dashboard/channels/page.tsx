import prisma from '@/lib/db'
import path from 'path'
import { mkdir, writeFile } from 'fs/promises'
import { revalidatePath } from 'next/cache'
import ChannelLogo from '@/components/ChannelLogo'
import ChannelPreviewButton from '@/components/ChannelPreviewButton'
import { createPlayableStreamUrl, createUdpOnDemandHlsPath, isUdpStreamUrl } from '@/lib/playableStreams'
import { getHlsRelayBaseUrl } from '@/lib/settings'

export const revalidate = 0 // Disable cache for live channel lists
const PAGE_SIZE = 200
const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024
const ALLOWED_LOGO_TYPES = new Map([
  ['image/png', 'png'],
  ['image/jpeg', 'jpg'],
  ['image/webp', 'webp'],
  ['image/svg+xml', 'svg'],
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
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'channel-logo'
}

function normalizeChannelLogoKey(value: string) {
  return value.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
}

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

async function updateChannelLogoAction(formData: FormData) {
  'use server'
  const channelId = parseInt(formData.get('channelId') as string)
  const channelName = (formData.get('channelName') as string) || 'channel'
  const logoUrl = ((formData.get('logoUrl') as string) || '').trim()
  const logoFile = formData.get('logoFile') as File | null

  if (!Number.isInteger(channelId)) return

  try {
    let nextLogoUrl = logoUrl || null

    if (logoFile && logoFile.size > 0) {
      const extension = ALLOWED_LOGO_TYPES.get(logoFile.type)
      if (!extension) {
        throw new Error(`Unsupported logo type: ${logoFile.type || 'unknown'}`)
      }
      if (logoFile.size > MAX_LOGO_SIZE_BYTES) {
        throw new Error('Logo file is larger than 2MB')
      }

      const buffer = Buffer.from(await logoFile.arrayBuffer())
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'channel-logos', 'custom')
      await mkdir(uploadDir, { recursive: true })

      const safeName = sanitizeLogoFileName(channelName)
      const fileName = `${channelId}-${safeName}-${Date.now()}.${extension}`
      await writeFile(path.join(uploadDir, fileName), buffer)
      nextLogoUrl = `/uploads/channel-logos/custom/${fileName}`
    }

    await prisma.channel.update({
      where: { id: channelId },
      data: { logoUrl: nextLogoUrl },
    })
    revalidatePath('/dashboard/channels')
  } catch (error) {
    console.error('Update channel logo error:', error)
  }
}

async function clearChannelLogoAction(formData: FormData) {
  'use server'
  const channelId = parseInt(formData.get('channelId') as string)
  if (!Number.isInteger(channelId)) return

  try {
    await prisma.channel.update({
      where: { id: channelId },
      data: { logoUrl: null },
    })
    revalidatePath('/dashboard/channels')
  } catch (error) {
    console.error('Clear channel logo error:', error)
  }
}

async function applyRecommendedLogoAction(formData: FormData) {
  'use server'
  const channelId = parseInt(formData.get('channelId') as string)
  const channelName = (formData.get('channelName') as string) || ''
  const logoUrl = PRELOADED_CHANNEL_LOGOS[normalizeChannelLogoKey(channelName)]

  if (!Number.isInteger(channelId) || !logoUrl) return

  try {
    await prisma.channel.update({
      where: { id: channelId },
      data: { logoUrl },
    })
    revalidatePath('/dashboard/channels')
  } catch (error) {
    console.error('Apply recommended channel logo error:', error)
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
  const hlsRelayBaseUrl = await getHlsRelayBaseUrl()

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
                (() => {
                  const recommendedLogoUrl = PRELOADED_CHANNEL_LOGOS[normalizeChannelLogoKey(c.name)]

                  return (
                <div
                  key={c.id}
                  className={`glass-card p-5 rounded-2xl border space-y-4 ${
                    c.isActive ? 'border-border/60' : 'border-rose-500/20 bg-rose-500/5 opacity-70'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
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
                        relayUrl={createPlayableStreamUrl({
                          origin: '',
                          name: c.name,
                          streamUrl: isUdpStreamUrl(c.streamUrl) ? createUdpOnDemandHlsPath(c.id) : c.streamUrl,
                          hlsRelayBaseUrl,
                        })}
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

                  <details className="group border-t border-slate-800/80 pt-3">
                    <summary className="cursor-pointer list-none text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-white transition-colors">
                      Logo channel
                    </summary>
                    <div className="mt-3 grid grid-cols-1 gap-3">
                      <form action={updateChannelLogoAction} className="grid gap-2">
                        <input type="hidden" name="channelId" value={c.id} />
                        <input type="hidden" name="channelName" value={c.name} />
                        <input
                          type="url"
                          name="logoUrl"
                          defaultValue={c.logoUrl || ''}
                          placeholder="/uploads/channel-logos/preloaded/inews.png atau https://..."
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-[11px] focus:outline-none focus:border-primary"
                        />
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="file"
                            name="logoFile"
                            accept="image/png,image/jpeg,image/webp,image/svg+xml"
                            className="flex-1 text-slate-400 text-[11px] file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-slate-800 file:text-slate-200 file:hover:bg-slate-700/70 cursor-pointer"
                          />
                          <button
                            type="submit"
                            className="px-3 py-2 rounded-xl bg-primary hover:bg-indigo-500 text-white text-[11px] font-bold transition-all cursor-pointer"
                          >
                            Simpan Logo
                          </button>
                        </div>
                      </form>
                      <form action={clearChannelLogoAction}>
                        <input type="hidden" name="channelId" value={c.id} />
                        <button
                          type="submit"
                          className="text-[11px] font-semibold text-slate-500 hover:text-rose-300 transition-colors cursor-pointer"
                        >
                          Hapus logo channel
                        </button>
                      </form>
                      {recommendedLogoUrl && recommendedLogoUrl !== c.logoUrl && (
                        <form action={applyRecommendedLogoAction}>
                          <input type="hidden" name="channelId" value={c.id} />
                          <input type="hidden" name="channelName" value={c.name} />
                          <button
                            type="submit"
                            className="text-[11px] font-semibold text-amber-200 hover:text-white transition-colors cursor-pointer"
                          >
                            Pakai logo rekomendasi
                          </button>
                        </form>
                      )}
                    </div>
                  </details>
                </div>
                  )
                })()
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
