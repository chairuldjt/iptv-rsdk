import prisma from '@/lib/db'
import ConfirmForm from '@/components/ConfirmForm'
import EntertainmentItemForm from '@/components/EntertainmentItemForm'
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

  const [items, videos, channels, appPublicOrigin, hlsRelayBaseUrl] = await Promise.all([
    prisma.entertainmentItem.findMany({
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    }),
    prisma.educationVideo.findMany({
      orderBy: [{ folder: { name: 'asc' } }, { title: 'asc' }],
      include: { folder: true },
    }),
    prisma.channel.findMany({
      where: { isActive: true },
      orderBy: [{ playlistId: 'asc' }, { sortOrder: 'asc' }],
      include: {
        playlist: { select: { name: true, isGlobal: true } },
        category: { select: { name: true } },
      },
    }),
    getAppPublicOrigin(),
    getHlsRelayBaseUrl(),
  ])
  const editingItem = editId ? items.find((item) => item.id === editId) ?? null : null
  const publicOrigin = appPublicOrigin || ''
  const videoOptions = videos.map((video) => ({
    id: video.id,
    title: video.title,
    folderName: video.folder?.name || null,
    videoUrl: video.videoUrl,
    thumbnailUrl: video.thumbnailUrl,
  }))
  const channelOptions = channels.map((channel) => ({
    id: channel.id,
    name: channel.name,
    playlistName: channel.playlist.name,
    categoryName: channel.category?.name || 'Uncategorized',
    streamUrl: channel.streamUrl,
    apiUrl: channel.streamUrl,
    relayUrl: createChannelRelayUrl({
      channelId: channel.id,
      origin: publicOrigin,
      name: channel.name,
      streamUrl: channel.streamUrl,
      hlsRelayBaseUrl,
    }),
  }))

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-amber-300">Entertainment Library</p>
        <h2 className="text-3xl font-extrabold tracking-tight text-white mt-1">Konten Hiburan</h2>
        <p className="text-slate-400 mt-1 text-sm font-medium max-w-2xl">
          Atur item menu Hiburan Android. Item disembunyikan otomatis bila nonaktif atau URL kosong.
        </p>
      </div>

      {showSaved && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold">
          Konten hiburan berhasil disimpan.
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start">
        <section className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
          {items.length === 0 ? (
            <div className="md:col-span-2 min-h-[320px] rounded-2xl border border-dashed border-slate-700 bg-slate-900/30 flex items-center justify-center text-center px-8">
              <div>
                <h4 className="text-white font-bold">Belum ada konten hiburan</h4>
                <p className="text-sm text-slate-500 mt-1">Tambahkan item pertama dari form di sebelah kanan.</p>
              </div>
            </div>
          ) : (
            items.map((item) => {
              const hidden = !item.isActive || !item.url?.trim()
              return (
                <article key={item.id} className="rounded-2xl overflow-hidden bg-slate-900/70 border border-slate-800 hover:border-amber-500/40 transition-all">
                  <div className="relative aspect-video bg-slate-950">
                    {item.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full bg-[radial-gradient(circle_at_30%_20%,rgba(245,158,11,0.28),transparent_35%),linear-gradient(135deg,#111827,#020617)] flex items-center justify-center">
                        <span className="text-white text-2xl font-black">▶</span>
                      </div>
                    )}
                    <span className={`absolute left-3 top-3 px-2 py-1 rounded-lg text-[10px] font-bold border ${
                      hidden ? 'bg-slate-950/70 text-slate-400 border-slate-700' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20'
                    }`}>
                      {hidden ? 'Hidden' : 'Live'}
                    </span>
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-white font-extrabold truncate">{item.title}</h3>
                        <p className="text-xs text-slate-400 truncate">{item.subtitle || '-'}</p>
                      </div>
                      <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border text-amber-300 border-amber-500/20 bg-amber-500/10">
                        {contentTypeLabel(item.contentType)}
                      </span>
                    </div>
                    <p className="mt-3 text-[11px] text-slate-500 font-mono truncate" title={item.url || ''}>
                      {item.url || 'URL kosong'}
                    </p>
                    <div className="mt-4 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-500">Urutan {item.sortOrder}</span>
                      <div className="flex gap-2">
                        <a
                          href={`/dashboard/entertainment?edit=${item.id}`}
                          className="px-3 py-1.5 rounded-lg border border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/10 text-xs font-bold"
                        >
                          Edit
                        </a>
                        <ConfirmForm action={deleteEntertainmentItemAction} message={`Hapus konten "${item.title}"?`}>
                          <input type="hidden" name="itemId" value={item.id} />
                          <button className="px-3 py-1.5 rounded-lg border border-rose-500/20 text-rose-300 hover:bg-rose-500/10 text-xs font-bold cursor-pointer">
                            Hapus
                          </button>
                        </ConfirmForm>
                      </div>
                    </div>
                  </div>
                </article>
              )
            })
          )}
        </section>

        <EntertainmentItemForm
          key={editingItem?.id ?? 'new'}
          editingItem={editingItem}
          videoOptions={videoOptions}
          channelOptions={channelOptions}
        />
      </div>
    </div>
  )
}

function contentTypeLabel(type: string): string {
  if (type === 'media_player') return 'Media'
  if (type === 'm3u_player') return 'M3U'
  return 'WebView'
}

function createChannelRelayUrl({
  channelId,
  origin,
  name,
  streamUrl,
  hlsRelayBaseUrl,
}: {
  channelId: number
  origin: string
  name: string
  streamUrl: string
  hlsRelayBaseUrl: string
}) {
  if (isUdpStreamUrl(streamUrl)) {
    return origin ? new URL(createUdpOnDemandHlsPath(channelId), origin).toString() : createUdpOnDemandHlsPath(channelId)
  }

  return createPlayableStreamUrl({
    origin,
    name,
    streamUrl,
    hlsRelayBaseUrl,
  })
}
