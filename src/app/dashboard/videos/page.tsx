import prisma from '@/lib/db'
import ConfirmForm from '@/components/ConfirmForm'
import VideoRepoForm from '@/components/VideoRepoForm'
import PageHeader from '@/components/PageHeader'
import {
  createFolderAction,
  deleteFolderAction,
  deleteVideoAction,
  renameFolderAction,
} from './actions'

export const revalidate = 0

type FolderFilter = number | 'unfiled' | null

export default async function VideosPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; saved?: string; folder?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const editId = resolvedSearchParams.edit ? parseInt(resolvedSearchParams.edit, 10) : null
  const selectedFolder = parseFolderFilter(resolvedSearchParams.folder)
  const showSaved = resolvedSearchParams.saved === '1'

  const [folders, videos] = await Promise.all([
    prisma.educationFolder.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { videos: true } } },
    }),
    prisma.educationVideo.findMany({
      where: selectedFolder === 'unfiled'
        ? { folderId: null }
        : typeof selectedFolder === 'number'
          ? { folderId: selectedFolder }
          : undefined,
      orderBy: [{ folder: { name: 'asc' } }, { createdAt: 'desc' }],
      include: { folder: true },
    }),
  ])

  const editingVideo = editId ? videos.find((video) => video.id === editId) ?? null : null
  const allVideoCount = await prisma.educationVideo.count()
  const unfiledCount = await prisma.educationVideo.count({ where: { folderId: null } })
  const selectedFolderEntity = typeof selectedFolder === 'number'
    ? folders.find((folder) => folder.id === selectedFolder) ?? null
    : null

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-5">
        <PageHeader
          badge="Education Media Library"
          title="Video Repository"
          description="Kelola folder, thumbnail, dan video edukasi. STB mode Web Repository otomatis memakai daftar terbaru dari galeri ini."
        />
        <form action={createFolderAction} className="card p-2.5 rounded-xl flex gap-2 w-full xl:w-auto">
          <input type="text" name="folderName" required placeholder="Nama folder baru" className="field-input py-1.5" />
          <button type="submit" className="btn btn-primary btn-sm py-1.5">Buat Folder</button>
        </form>
      </div>

      {showSaved && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          Perubahan galeri berhasil disimpan. Client akan menyesuaikan saat sync berikutnya.
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[240px_minmax(0,1fr)_340px] gap-6 items-start">
        {/* Sidebar */}
        <aside className="card p-3 rounded-2xl xl:sticky xl:top-20">
          <div className="px-2 py-1.5 mb-2">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Folders</p>
          </div>
          <div className="space-y-1">
            <FolderLink href="/dashboard/videos" active={selectedFolder === null} label="Semua Video" count={allVideoCount} />
            <FolderLink href="/dashboard/videos?folder=unfiled" active={selectedFolder === 'unfiled'} label="Tanpa Folder" count={unfiledCount} />
            {folders.map((folder) => (
              <FolderLink key={folder.id} href={`/dashboard/videos?folder=${folder.id}`} active={selectedFolder === folder.id} label={folder.name} count={folder._count.videos} />
            ))}
          </div>
          {selectedFolderEntity && (
            <div className="mt-4 border-t border-border pt-4 space-y-3">
              <form action={renameFolderAction} className="space-y-2">
                <input type="hidden" name="folderId" value={selectedFolderEntity.id} />
                <input type="text" name="folderName" defaultValue={selectedFolderEntity.name} required className="field-input text-xs py-1.5" />
                <button className="w-full py-1.5 rounded-lg border border-primary/20 text-primary hover:bg-primary/10 text-xs font-semibold cursor-pointer bg-transparent">Rename Folder</button>
              </form>
              <ConfirmForm action={deleteFolderAction} message={`Hapus folder "${selectedFolderEntity.name}"? Video di dalamnya tidak ikut dihapus, hanya dipindah ke Tanpa Folder.`}>
                <input type="hidden" name="folderId" value={selectedFolderEntity.id} />
                <button className="w-full py-1.5 rounded-lg border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 text-xs font-semibold cursor-pointer bg-transparent">Hapus Folder</button>
              </ConfirmForm>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <section className="min-w-0">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-foreground font-semibold text-sm">
                {selectedFolderEntity?.name || (selectedFolder === 'unfiled' ? 'Tanpa Folder' : 'Semua Video')}
              </h3>
              <p className="text-[11px] text-muted-foreground">{videos.length} video tampil di galeri ini</p>
            </div>
          </div>

          {videos.length === 0 ? (
            <div className="min-h-[300px] rounded-2xl border border-dashed border-border flex items-center justify-center text-center px-8">
              <div>
                <div className="mx-auto mb-3 w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-lg">+</div>
                <h4 className="text-foreground font-semibold text-xs">Belum ada video</h4>
                <p className="text-[11px] text-muted-foreground mt-1">Upload video atau tambahkan URL dari inspector di sebelah kanan.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
              {videos.map((video) => (
                <article key={video.id} className="group rounded-xl overflow-hidden bg-card border border-border hover:border-primary/30 transition-all duration-200">
                  <div className="relative aspect-video bg-background overflow-hidden">
                    {video.thumbnailUrl ? (
                      <img src={video.thumbnailUrl} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-transparent">
                        <span className="w-10 h-10 rounded-full bg-foreground/10 border border-foreground/10 flex items-center justify-center text-foreground/60 text-xs">▶</span>
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-background/95 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 justify-end">
                      <a href={`/dashboard/videos?edit=${video.id}${selectedFolder ? `&folder=${selectedFolder}` : ''}`} className="btn btn-xs bg-background/80 border border-border">Edit</a>
                      <ConfirmForm action={deleteVideoAction} message={`Hapus video "${video.title}" dari repository? File upload dan thumbnail lokal juga akan dihapus.`}>
                        <input type="hidden" name="videoId" value={video.id} />
                        {typeof selectedFolder === 'number' && <input type="hidden" name="folderId" value={selectedFolder} />}
                        <button className="btn btn-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 cursor-pointer">Hapus</button>
                      </ConfirmForm>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="text-xs font-semibold text-foreground leading-snug line-clamp-2" title={video.title}>{video.title}</h4>
                      <span className={`shrink-0 badge ${video.videoUrl.startsWith('/uploads/videos/') ? 'badge-primary' : 'badge-warning'}`}>
                        {video.videoUrl.startsWith('/uploads/videos/') ? 'Upload' : 'URL'}
                      </span>
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-2 truncate font-mono" title={video.videoUrl}>{video.videoUrl}</p>
                    <div className="mt-3 flex items-center justify-between text-[9px] text-muted-foreground font-medium">
                      <span>{video.folder?.name || 'Tanpa Folder'}</span>
                      <span className="font-mono">{new Date(video.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </article>
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

function FolderLink({ href, active, label, count }: { href: string; active: boolean; label: string; count: number }) {
  return (
    <a
      href={href}
      className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-xs transition-all duration-200 ${
        active
          ? 'bg-accent text-foreground font-semibold border border-border'
          : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground border border-transparent'
      }`}
    >
      <span className="truncate">{label}</span>
      <span className="text-[10px] font-bold text-muted-foreground font-mono">{count}</span>
    </a>
  )
}

function parseFolderFilter(value?: string): FolderFilter {
  if (!value) return null
  if (value === 'unfiled') return 'unfiled'
  const parsed = parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}
