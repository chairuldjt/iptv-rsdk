import prisma from '@/lib/db'
import ConfirmForm from '@/components/ConfirmForm'
import EntertainmentItemForm from '@/components/EntertainmentItemForm'
import PageHeader from '@/components/PageHeader'
import { deleteEntertainmentItemAction } from './actions'
import { createPlayableStreamUrl, createUdpOnDemandHlsPath, isUdpStreamUrl } from '@/lib/playableStreams'
import { getAppPublicOrigin, getHlsRelayBaseUrl } from '@/lib/settings'

export const revalidate = 0

export default async function EntertainmentPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; saved?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const editId = resolvedSearchParams.edit ? parseInt(resolvedSearchParams.edit, 10) : null
  const showSaved = resolvedSearchParams.saved === '1'

  const [items, videos, channels, playlists, appPublicOrigin, hlsRelayBaseUrl] = await Promise.all([
    prisma.entertainmentItem.findMany({ orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }] }),
    prisma.educationVideo.findMany({ orderBy: [{ folder: { name: 'asc' } }, { title: 'asc' }], include: { folder: true } }),
    prisma.channel.findMany({ where: { isActive: true }, orderBy: [{ playlistId: 'asc' }, { sortOrder: 'asc' }], include: { playlist: { select: { name: true, isGlobal: true } }, category: { select: { name: true } } } }),
    prisma.playlist.findMany({ orderBy: { name: 'asc' } }),
    getAppPublicOrigin(),
    getHlsRelayBaseUrl(),
  ])
  const editingItem = editId ? items.find((item) => item.id === editId) ?? null : null
  const publicOrigin = appPublicOrigin || ''
  const videoOptions = videos.map((video) => ({ id: video.id, title: video.title, folderName: video.folder?.name || null, videoUrl: video.videoUrl, thumbnailUrl: video.thumbnailUrl }))
  const channelOptions = channels.map((channel) => ({
    id: channel.id, name: channel.name, playlistName: channel.playlist.name,
    categoryName: channel.category?.name || 'Uncategorized', streamUrl: channel.streamUrl, apiUrl: channel.streamUrl,
    relayUrl: createChannelRelayUrl({ channelId: channel.id, origin: publicOrigin, name: channel.name, streamUrl: channel.streamUrl, hlsRelayBaseUrl }),
  }))
  const playlistOptions = playlists.map((playlist) => ({
    id: playlist.id,
    name: playlist.name,
    totalChannels: playlist.totalChannels,
  }))

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        badge="Entertainment Library"
        title="Konten Hiburan"
        description="Atur item menu Hiburan Android. Item disembunyikan otomatis bila nonaktif atau URL kosong."
      />

      {showSaved && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          Konten hiburan berhasil disimpan.
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
        <section className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
          {items.length === 0 ? (
            <div className="md:col-span-2 min-h-[300px] rounded-2xl border border-dashed border-border flex items-center justify-center text-center px-8">
              <div>
                <h4 className="text-foreground font-semibold text-xs">Belum ada konten hiburan</h4>
                <p className="text-[11px] text-muted-foreground mt-1">Tambahkan item pertama dari form di sebelah kanan.</p>
              </div>
            </div>
          ) : (
            items.map((item) => {
              const hidden = !item.isActive || !item.url?.trim()
              return (
                <article key={item.id} className="rounded-xl overflow-hidden bg-card border border-border hover:border-amber-500/30 transition-all duration-200">
                  <div className="relative aspect-video bg-background">
                    {item.thumbnailUrl ? (
                      <img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-amber-500/5 to-transparent flex items-center justify-center">
                        <span className="text-foreground/60 text-lg">▶</span>
                      </div>
                    )}
                    <span className={`absolute left-3 top-3 badge ${hidden ? 'badge-muted' : 'badge-success'}`}>
                      {hidden ? 'Hidden' : 'Live'}
                    </span>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-xs font-semibold text-foreground truncate" title={item.title}>{item.title}</h3>
                        <p className="text-[10px] text-muted-foreground truncate">{item.subtitle || '-'}</p>
                      </div>
                      <span className="badge badge-warning">{contentTypeLabel(item.contentType)}</span>
                    </div>
                    <p className="mt-3 text-[9px] text-muted-foreground font-mono truncate" title={item.url || ''}>{item.url || 'URL kosong'}</p>
                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
                      <span className="text-[10px] text-muted-foreground font-semibold">Urutan {item.sortOrder}</span>
                      <div className="flex gap-2">
                        <a href={`/dashboard/entertainment?edit=${item.id}`} className="btn btn-xs text-primary border border-primary/20 hover:bg-primary/10">Edit</a>
                        <ConfirmForm action={deleteEntertainmentItemAction} message={`Hapus konten "${item.title}"?`}>
                          <input type="hidden" name="itemId" value={item.id} />
                          <button className="btn btn-xs text-rose-400 border border-rose-500/20 hover:bg-rose-500/10 cursor-pointer">Hapus</button>
                        </ConfirmForm>
                      </div>
                    </div>
                  </div>
                </article>
              )
            })
          )}
        </section>
        <EntertainmentItemForm key={editingItem?.id ?? 'new'} editingItem={editingItem} videoOptions={videoOptions} channelOptions={channelOptions} playlistOptions={playlistOptions} publicOrigin={publicOrigin} />
      </div>
    </div>
  )
}

function contentTypeLabel(type: string): string {
  if (type === 'media_player') return 'Media'
  if (type === 'm3u_player') return 'M3U Channel'
  if (type === 'm3u_playlist') return 'M3U Playlist'
  return 'WebView'
}

function createChannelRelayUrl({ channelId, origin, name, streamUrl, hlsRelayBaseUrl }: {
  channelId: number; origin: string; name: string; streamUrl: string; hlsRelayBaseUrl: string
}) {
  if (isUdpStreamUrl(streamUrl)) {
    return origin ? new URL(createUdpOnDemandHlsPath(channelId), origin).toString() : createUdpOnDemandHlsPath(channelId)
  }
  return createPlayableStreamUrl({ origin, name, streamUrl, hlsRelayBaseUrl })
}
