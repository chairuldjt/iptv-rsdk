import prisma from '@/lib/db'
import ConfirmForm from '@/components/ConfirmForm'
import VideoRepoForm from '@/components/VideoRepoForm'
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
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-indigo-300">Education Media Library</p>
          <h2 className="text-3xl font-extrabold tracking-tight text-white mt-1">Video Repository</h2>
          <p className="text-slate-400 mt-1 text-sm font-medium max-w-2xl">
            Kelola folder, thumbnail, dan video edukasi. STB mode Web Repository otomatis memakai daftar terbaru dari galeri ini.
          </p>
        </div>

        <form action={createFolderAction} className="glass-panel border border-border rounded-2xl p-3 flex gap-2 w-full xl:w-auto">
          <input
            type="text"
            name="folderName"
            required
            placeholder="Nama folder baru"
            className="min-w-0 flex-1 xl:w-64 px-4 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-primary"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-primary hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer"
          >
            Buat Folder
          </button>
        </form>
      </div>

      {showSaved && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold">
          Perubahan galeri berhasil disimpan. Client akan menyesuaikan saat sync berikutnya.
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[260px_minmax(0,1fr)_360px] gap-6 items-start">
        <aside className="glass-panel border border-border rounded-2xl p-3 xl:sticky xl:top-6">
          <div className="px-2 py-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Folder</p>
          </div>

          <div className="space-y-1">
            <FolderLink href="/dashboard/videos" active={selectedFolder === null} label="Semua Video" count={allVideoCount} />
            <FolderLink href="/dashboard/videos?folder=unfiled" active={selectedFolder === 'unfiled'} label="Tanpa Folder" count={unfiledCount} />
            {folders.map((folder) => (
              <FolderLink
                key={folder.id}
                href={`/dashboard/videos?folder=${folder.id}`}
                active={selectedFolder === folder.id}
                label={folder.name}
                count={folder._count.videos}
              />
            ))}
          </div>

          {selectedFolderEntity && (
            <div className="mt-4 border-t border-border/70 pt-4 space-y-3">
              <form action={renameFolderAction} className="space-y-2">
                <input type="hidden" name="folderId" value={selectedFolderEntity.id} />
                <input
                  type="text"
                  name="folderName"
                  defaultValue={selectedFolderEntity.name}
                  required
                  className="w-full px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-primary"
                />
                <button className="w-full py-2 rounded-xl border border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/10 text-xs font-bold cursor-pointer">
                  Rename Folder
                </button>
              </form>

              <ConfirmForm
                action={deleteFolderAction}
                message={`Hapus folder "${selectedFolderEntity.name}"? Video di dalamnya tidak ikut dihapus, hanya dipindah ke Tanpa Folder.`}
              >
                <input type="hidden" name="folderId" value={selectedFolderEntity.id} />
                <button className="w-full py-2 rounded-xl border border-rose-500/20 text-rose-300 hover:bg-rose-500/10 text-xs font-bold cursor-pointer">
                  Hapus Folder
                </button>
              </ConfirmForm>
            </div>
          )}
        </aside>

        <section className="min-w-0">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-white font-bold text-lg">
                {selectedFolderEntity?.name || (selectedFolder === 'unfiled' ? 'Tanpa Folder' : 'Semua Video')}
              </h3>
              <p className="text-xs text-slate-500">{videos.length} video tampil di galeri ini</p>
            </div>
          </div>

          {videos.length === 0 ? (
            <div className="min-h-[360px] rounded-2xl border border-dashed border-slate-700 bg-slate-900/30 flex items-center justify-center text-center px-8">
              <div>
                <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-300 font-black">
                  +
                </div>
                <h4 className="text-white font-bold">Belum ada video</h4>
                <p className="text-sm text-slate-500 mt-1">Upload video atau tambahkan URL dari inspector di sebelah kanan.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
              {videos.map((video) => (
                <article key={video.id} className="group rounded-2xl overflow-hidden bg-slate-900/70 border border-slate-800 hover:border-indigo-500/50 transition-all">
                  <div className="relative aspect-video bg-slate-950 overflow-hidden">
                    {video.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={video.thumbnailUrl}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.28),transparent_35%),linear-gradient(135deg,#0f172a,#111827)]">
                        <span className="h-12 w-12 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white text-lg">▶</span>
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-slate-950/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex gap-2 justify-end">
                        <a
                          href={`/dashboard/videos?edit=${video.id}${selectedFolder ? `&folder=${selectedFolder}` : ''}`}
                          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold backdrop-blur"
                        >
                          Edit
                        </a>
                        <ConfirmForm
                          action={deleteVideoAction}
                          message={`Hapus video "${video.title}" dari repository? File upload dan thumbnail lokal juga akan dihapus.`}
                        >
                          <input type="hidden" name="videoId" value={video.id} />
                          {typeof selectedFolder === 'number' && <input type="hidden" name="folderId" value={selectedFolder} />}
                          <button className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/35 text-rose-100 text-xs font-bold backdrop-blur cursor-pointer">
                            Hapus
                          </button>
                        </ConfirmForm>
                      </div>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="text-sm font-extrabold text-white leading-snug line-clamp-2" title={video.title}>
                        {video.title}
                      </h4>
                      <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        video.videoUrl.startsWith('/uploads/videos/')
                          ? 'text-violet-300 border-violet-500/20 bg-violet-500/10'
                          : 'text-amber-300 border-amber-500/20 bg-amber-500/10'
                      }`}>
                        {video.videoUrl.startsWith('/uploads/videos/') ? 'Upload' : 'URL'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2 truncate font-mono" title={video.videoUrl}>
                      {video.videoUrl}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                      <span>{video.folder?.name || 'Tanpa Folder'}</span>
                      <span>{new Date(video.updatedAt).toLocaleDateString()}</span>
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

function FolderLink({
  href,
  active,
  label,
  count,
}: {
  href: string
  active: boolean
  label: string
  count: number
}) {
  return (
    <a
      href={href}
      className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
        active ? 'bg-indigo-500/15 text-white' : 'text-slate-400 hover:bg-slate-800/70 hover:text-white'
      }`}
    >
      <span className="truncate font-semibold">{label}</span>
      <span className="text-[10px] font-bold text-slate-500">{count}</span>
    </a>
  )
}

function parseFolderFilter(value?: string): FolderFilter {
  if (!value) return null
  if (value === 'unfiled') return 'unfiled'
  const parsed = parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}
