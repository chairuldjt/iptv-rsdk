import prisma from '@/lib/db'
import ConfirmForm from '@/components/ConfirmForm'
import VideoRepoForm from '@/components/VideoRepoForm'
import PageHeader from '@/components/PageHeader'
import {
  createFolderAction,
  deleteFolderAction,
  deleteVideoAction,
  renameFolderAction,
  toggleFolderPublishedAction,
  toggleVideoPublishedAction,
} from './actions'

export const revalidate = 0

type FolderFilter = number | 'unfiled' | null
type SourceFilter = 'all' | 'upload' | 'url'

export default async function VideosPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; saved?: string; folder?: string; q?: string; source?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const editId = resolvedSearchParams.edit ? parseInt(resolvedSearchParams.edit, 10) : null
  const selectedFolder = parseFolderFilter(resolvedSearchParams.folder)
  const sourceFilter = parseSourceFilter(resolvedSearchParams.source)
  const searchQuery = (resolvedSearchParams.q || '').trim()
  const showSaved = resolvedSearchParams.saved === '1'

  const [folders, videos, allVideoCount, unfiledCount, allPublishedCount, unfiledPublishedCount] = await Promise.all([
    prisma.educationFolder.findMany({
      orderBy: { name: 'asc' },
      include: {
        videos: { select: { isPublished: true } },
        _count: { select: { videos: true } },
      },
    }),
    prisma.educationVideo.findMany({
      where: selectedFolder === 'unfiled'
        ? { folderId: null }
        : typeof selectedFolder === 'number'
          ? { folderId: selectedFolder }
          : undefined,
      orderBy: [{ folder: { name: 'asc' } }, { updatedAt: 'desc' }],
      include: { folder: true },
    }),
    prisma.educationVideo.count(),
    prisma.educationVideo.count({ where: { folderId: null } }),
    prisma.educationVideo.count({
      where: {
        isPublished: true,
        OR: [
          { folderId: null },
          { folder: { isPublished: true } },
        ],
      },
    }),
    prisma.educationVideo.count({ where: { folderId: null, isPublished: true } }),
  ])

  const selectedFolderEntity = typeof selectedFolder === 'number'
    ? folders.find((folder) => folder.id === selectedFolder) ?? null
    : null

  const visibleVideos = videos.filter((video) => {
    const matchesSearch = !searchQuery || [
      video.title,
      video.videoUrl,
      video.folder?.name || 'Tanpa Folder',
    ].some((value) => value.toLowerCase().includes(searchQuery.toLowerCase()))
    const isUpload = video.videoUrl.startsWith('/uploads/videos/')
    const matchesSource =
      sourceFilter === 'all' ||
      (sourceFilter === 'upload' && isUpload) ||
      (sourceFilter === 'url' && !isUpload)

    return matchesSearch && matchesSource
  })

  const editingVideo = editId
    ? videos.find((video) => video.id === editId) ?? visibleVideos.find((video) => video.id === editId) ?? null
    : null

  const uploadCount = videos.filter((video) => video.videoUrl.startsWith('/uploads/videos/')).length
  const urlCount = videos.length - uploadCount
  const publishedCount = videos.filter((video) => isVideoLinkedToEducation(video)).length
  const currentFolderLabel = selectedFolderEntity?.name || (selectedFolder === 'unfiled' ? 'Tanpa Folder' : 'Semua Video')
  const folderParam = getFolderParam(selectedFolder)
  const hasFilters = Boolean(searchQuery) || sourceFilter !== 'all'

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
        <PageHeader
          badge="Education Media Library"
          title="Video Repository"
          description="Kelola video edukasi untuk STB mode Web Repository. Gunakan folder, pencarian, dan sumber media untuk menjaga galeri tetap rapi."
        />
        <form action={createFolderAction} className="w-full xl:w-[360px] rounded-2xl border border-border bg-card p-3">
          <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Folder Baru
          </label>
          <div className="flex gap-2">
            <input type="text" name="folderName" required placeholder="Contoh: Edukasi Pasien" className="field-input py-2 text-xs" />
            <button type="submit" className="btn btn-primary btn-sm px-3 py-2">Buat</button>
          </div>
        </form>
      </div>

      {showSaved && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          Perubahan galeri berhasil disimpan. Client akan menyesuaikan saat sync berikutnya.
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[260px_minmax(0,1fr)_380px] gap-6 items-start">
        <aside className="rounded-2xl border border-border bg-card p-3 xl:sticky xl:top-20">
          <div className="px-2 py-1.5 mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Folders</p>
              <p className="text-[11px] text-muted-foreground/70 mt-0.5">{folders.length} folder tersedia</p>
            </div>
            <span className="text-[10px] font-bold font-mono text-muted-foreground">{allVideoCount}</span>
          </div>

          <div className="space-y-1">
            <FolderLink href={buildVideosHref({ folder: null, q: searchQuery, source: sourceFilter })} active={selectedFolder === null} label="Semua Video" count={allVideoCount} publishedCount={allPublishedCount} published />
            <FolderLink href={buildVideosHref({ folder: 'unfiled', q: searchQuery, source: sourceFilter })} active={selectedFolder === 'unfiled'} label="Tanpa Folder" count={unfiledCount} publishedCount={unfiledPublishedCount} published />
            {folders.map((folder) => (
              <FolderLink
                key={folder.id}
                href={buildVideosHref({ folder: folder.id, q: searchQuery, source: sourceFilter })}
                active={selectedFolder === folder.id}
                label={folder.name}
                count={folder._count.videos}
                publishedCount={folder.videos.filter((video) => video.isPublished).length}
                published={folder.isPublished}
              />
            ))}
          </div>

          {selectedFolderEntity && (
            <div className="mt-4 border-t border-border pt-4 space-y-3">
              <form action={toggleFolderPublishedAction} className="rounded-xl border border-border bg-background/40 p-3">
                <input type="hidden" name="folderId" value={selectedFolderEntity.id} />
                <input type="hidden" name="currentStatus" value={selectedFolderEntity.isPublished ? 'true' : 'false'} />
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Link ke Edukasi</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {selectedFolderEntity.isPublished ? 'Folder dikirim ke STB.' : 'Folder disembunyikan dari STB.'}
                    </p>
                  </div>
                  <button className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                    selectedFolderEntity.isPublished
                      ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/15'
                      : 'text-muted-foreground border-border hover:text-foreground hover:bg-accent/50'
                  }`}>
                    {selectedFolderEntity.isPublished ? 'Aktif' : 'Nonaktif'}
                  </button>
                </div>
              </form>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Kelola Folder</p>
                <form action={renameFolderAction} className="space-y-2">
                  <input type="hidden" name="folderId" value={selectedFolderEntity.id} />
                  <input type="text" name="folderName" defaultValue={selectedFolderEntity.name} required className="field-input text-xs py-2" />
                  <button className="w-full py-2 rounded-lg border border-primary/20 text-primary hover:bg-primary/10 text-xs font-semibold cursor-pointer bg-transparent transition-colors">Rename</button>
                </form>
              </div>
              <ConfirmForm action={deleteFolderAction} message={`Hapus folder "${selectedFolderEntity.name}"? Video di dalamnya tidak ikut dihapus, hanya dipindah ke Tanpa Folder.`}>
                <input type="hidden" name="folderId" value={selectedFolderEntity.id} />
                <button className="w-full py-2 rounded-lg border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 text-xs font-semibold cursor-pointer bg-transparent transition-colors">Hapus Folder</button>
              </ConfirmForm>
            </div>
          )}
        </aside>

        <section className="min-w-0 space-y-4">
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="p-4 border-b border-border flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-foreground font-semibold text-base truncate">{currentFolderLabel}</h3>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {visibleVideos.length} dari {videos.length} video ditampilkan
                </p>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center min-w-full sm:min-w-[380px]">
                <Stat label="Total" value={videos.length} />
                <Stat label="Linked" value={publishedCount} />
                <Stat label="Upload" value={uploadCount} />
                <Stat label="URL" value={urlCount} />
              </div>
            </div>

            <div className="p-4 flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
              <form action="/dashboard/videos" className="flex-1 flex flex-col sm:flex-row gap-2">
                {folderParam && <input type="hidden" name="folder" value={folderParam} />}
                {sourceFilter !== 'all' && <input type="hidden" name="source" value={sourceFilter} />}
                <div className="relative flex-1">
                  <svg className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                  <input
                    type="search"
                    name="q"
                    defaultValue={searchQuery}
                    placeholder="Cari judul, folder, atau URL..."
                    className="field-input pl-9 py-2 text-xs"
                  />
                </div>
                <button className="btn btn-secondary btn-sm py-2">Cari</button>
              </form>

              <div className="flex items-center gap-2 overflow-x-auto">
                <SourceLink label="Semua" active={sourceFilter === 'all'} href={buildVideosHref({ folder: selectedFolder, q: searchQuery, source: 'all' })} />
                <SourceLink label="Upload" active={sourceFilter === 'upload'} href={buildVideosHref({ folder: selectedFolder, q: searchQuery, source: 'upload' })} />
                <SourceLink label="URL" active={sourceFilter === 'url'} href={buildVideosHref({ folder: selectedFolder, q: searchQuery, source: 'url' })} />
                {hasFilters && (
                  <a href={buildVideosHref({ folder: selectedFolder, q: '', source: 'all' })} className="px-3 py-2 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors whitespace-nowrap">
                    Reset
                  </a>
                )}
              </div>
            </div>
          </div>

          {visibleVideos.length === 0 ? (
            <div className="min-h-[340px] rounded-2xl border border-dashed border-border flex items-center justify-center text-center px-8 bg-card/40">
              <div className="max-w-sm">
                <div className="mx-auto mb-3 w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-lg">+</div>
                <h4 className="text-foreground font-semibold text-sm">{hasFilters ? 'Tidak ada hasil' : 'Belum ada video'}</h4>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  {hasFilters
                    ? 'Coba ubah kata kunci atau filter sumber media.'
                    : 'Tambahkan URL atau upload file dari panel di sebelah kanan.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
              {visibleVideos.map((video) => (
                <VideoCard key={video.id} video={video} selectedFolder={selectedFolder} />
              ))}
            </div>
          )}
        </section>

        <VideoRepoForm
          key={editingVideo?.id ?? `new-${selectedFolder || 'all'}`}
          folders={folders.map((folder) => ({ id: folder.id, name: folder.name }))}
          selectedFolderId={typeof selectedFolder === 'number' ? selectedFolder : null}
          editingVideo={editingVideo}
        />
      </div>
    </div>
  )
}

function VideoCard({
  video,
  selectedFolder,
}: {
  video: {
    id: number
    title: string
    videoUrl: string
    thumbnailUrl: string | null
    isPublished: boolean
    updatedAt: Date
    folder: { name: string; isPublished: boolean } | null
  }
  selectedFolder: FolderFilter
}) {
  const isUpload = video.videoUrl.startsWith('/uploads/videos/')
  const folderSuffix = selectedFolder ? `&folder=${selectedFolder}` : ''
  const linked = isVideoLinkedToEducation(video)

  return (
    <article className="group rounded-2xl overflow-hidden bg-card border border-border hover:border-primary/30 transition-all duration-200">
      <div className="relative aspect-video bg-background overflow-hidden">
        {video.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={video.thumbnailUrl} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-background">
            <span className="w-12 h-12 rounded-full bg-foreground/10 border border-foreground/10 flex items-center justify-center text-foreground/70 text-sm">▶</span>
          </div>
        )}
        <span className={`absolute left-3 top-3 badge ${isUpload ? 'badge-primary' : 'badge-warning'}`}>
          {isUpload ? 'Upload' : 'URL'}
        </span>
        <span className={`absolute right-3 top-3 badge ${linked ? 'badge-success' : 'badge-muted'}`}>
          {linked ? 'Linked' : 'Hidden'}
        </span>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <h4 className="text-sm font-semibold text-foreground leading-snug line-clamp-2" title={video.title}>{video.title}</h4>
          <p className="text-[10px] text-muted-foreground mt-1 truncate font-mono" title={video.videoUrl}>{video.videoUrl}</p>
        </div>

        <div className="flex items-center justify-between gap-3 text-[10px] text-muted-foreground font-medium">
          <span className="truncate">{video.folder?.name || 'Tanpa Folder'}</span>
          <span className="font-mono shrink-0">{new Date(video.updatedAt).toLocaleDateString('id-ID')}</span>
        </div>

        {video.folder && !video.folder.isPublished && (
          <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[10px] font-semibold text-amber-300">
            Folder nonaktif, video tidak terkirim walau video aktif.
          </p>
        )}

        <form action={toggleVideoPublishedAction} className="rounded-xl border border-border bg-background/40 p-2.5">
          <input type="hidden" name="videoId" value={video.id} />
          <input type="hidden" name="currentStatus" value={video.isPublished ? 'true' : 'false'} />
          {typeof selectedFolder === 'number' && <input type="hidden" name="folderId" value={selectedFolder} />}
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-semibold text-muted-foreground">Link ke Video Edukasi</span>
            <button className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
              video.isPublished
                ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/15'
                : 'text-muted-foreground border-border hover:text-foreground hover:bg-accent/50'
            }`}>
              {video.isPublished ? 'Aktif' : 'Nonaktif'}
            </button>
          </div>
        </form>

        <div className="flex items-center gap-2 pt-3 border-t border-border/70">
          <a href={`/dashboard/videos?edit=${video.id}${folderSuffix}`} className="btn btn-xs flex-1 bg-background/70 border border-border hover:border-primary/30">
            Edit
          </a>
          <ConfirmForm action={deleteVideoAction} message={`Hapus video "${video.title}" dari repository? File upload dan thumbnail lokal juga akan dihapus.`} className="flex-1">
            <input type="hidden" name="videoId" value={video.id} />
            {typeof selectedFolder === 'number' && <input type="hidden" name="folderId" value={selectedFolder} />}
            <button className="btn btn-xs w-full bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/15 cursor-pointer">
              Hapus
            </button>
          </ConfirmForm>
        </div>
      </div>
    </article>
  )
}

function FolderLink({
  href,
  active,
  label,
  count,
  publishedCount,
  published,
}: {
  href: string
  active: boolean
  label: string
  count: number
  publishedCount: number
  published: boolean
}) {
  return (
    <a
      href={href}
      className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-xs transition-all duration-200 border ${
        active
          ? 'bg-primary/10 text-primary font-semibold border-primary/20'
          : published
            ? 'text-muted-foreground hover:bg-accent/50 hover:text-foreground border-transparent'
            : 'text-muted-foreground/60 hover:bg-accent/40 hover:text-muted-foreground border-transparent'
      }`}
    >
      <span className="min-w-0">
        <span className="block truncate">{label}</span>
        <span className={`block text-[9px] font-semibold ${published ? 'text-muted-foreground/70' : 'text-amber-300/80'}`}>
          {published ? `${publishedCount} linked` : 'folder hidden'}
        </span>
      </span>
      <span className={`text-[10px] font-bold font-mono ${active ? 'text-primary' : 'text-muted-foreground'}`}>{count}</span>
    </a>
  )
}

function SourceLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <a
      href={href}
      className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap ${
        active
          ? 'bg-primary/15 text-primary border-primary/30'
          : 'text-muted-foreground border-border hover:text-foreground hover:bg-accent/50'
      }`}
    >
      {label}
    </a>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-background/40 px-3 py-2">
      <div className="text-sm font-bold text-foreground font-mono">{value}</div>
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
    </div>
  )
}

function parseFolderFilter(value?: string): FolderFilter {
  if (!value) return null
  if (value === 'unfiled') return 'unfiled'
  const parsed = parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function parseSourceFilter(value?: string): SourceFilter {
  if (value === 'upload' || value === 'url') return value
  return 'all'
}

function getFolderParam(folder: FolderFilter): string {
  if (folder === 'unfiled') return 'unfiled'
  if (typeof folder === 'number') return String(folder)
  return ''
}

function buildVideosHref({ folder, q, source }: { folder: FolderFilter; q: string; source: SourceFilter }) {
  const params = new URLSearchParams()
  const folderParam = getFolderParam(folder)
  if (folderParam) params.set('folder', folderParam)
  if (q) params.set('q', q)
  if (source !== 'all') params.set('source', source)

  const query = params.toString()
  return query ? `/dashboard/videos?${query}` : '/dashboard/videos'
}

function isVideoLinkedToEducation(video: { isPublished: boolean; folder: { isPublished: boolean } | null }) {
  return video.isPublished && (!video.folder || video.folder.isPublished)
}
