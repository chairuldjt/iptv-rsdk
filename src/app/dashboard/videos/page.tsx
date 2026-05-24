import prisma from '@/lib/db'
import ConfirmForm from '@/components/ConfirmForm'
import VideoRepoForm from '@/components/VideoRepoForm'
import { deleteVideoAction } from './actions'

export const revalidate = 0 // Disable cache for live repository list

export default async function VideosPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; saved?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const editId = resolvedSearchParams.edit ? parseInt(resolvedSearchParams.edit, 10) : null
  const showSaved = resolvedSearchParams.saved === '1'

  // Fetch all videos
  const videos = await prisma.educationVideo.findMany({
    orderBy: { createdAt: 'desc' },
  })

  // Find video being edited if parameter present
  const editingVideo = editId 
    ? videos.find((v) => v.id === editId) 
    : null

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white">Video Repository</h2>
        <p className="text-slate-400 mt-1 text-sm font-medium">
          Kelola database video edukasi terpusat. STB dengan mode &quot;Web Repository&quot; dapat mengambil daftar video ini secara otomatis.
        </p>
      </div>

      {showSaved && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold animate-fade-in">
          Perubahan video berhasil disimpan! STB akan menerima perubahan saat sync berikutnya.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Card */}
        <div className="lg:col-span-1">
          <VideoRepoForm key={editingVideo?.id ?? 'new'} editingVideo={editingVideo} />
        </div>

        {/* Video List Card */}
        <div className="lg:col-span-2 glass-card rounded-2xl border border-border overflow-hidden">
          <div className="px-6 py-5 border-b border-border flex justify-between items-center">
            <h3 className="font-bold text-white text-lg">Daftar Video ({videos.length})</h3>
          </div>

          <div className="divide-y divide-border/60">
            {videos.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm">
                Belum ada video di repository. Gunakan form di sebelah kiri untuk menambahkan video pertama Anda!
              </div>
            ) : (
              videos.map((v) => {
                const isLocalFile = v.videoUrl.startsWith('/uploads/videos/')
                return (
                  <div key={v.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-800/10 transition-all">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-extrabold text-white text-base truncate max-w-[300px]" title={v.title}>
                          {v.title}
                        </h4>
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${
                          isLocalFile 
                            ? 'bg-violet-500/10 text-violet-400 border-violet-500/20' 
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {isLocalFile ? 'Local File' : 'Stream Link'}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                        <span className="font-mono text-[10px] text-slate-500 truncate max-w-[280px]" title={v.videoUrl}>
                          Path/URL: {v.videoUrl}
                        </span>
                        <span className="text-slate-600">•</span>
                        <span>Ditambahkan: {new Date(v.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end md:self-center shrink-0">
                      <a
                        href={`/dashboard/videos?edit=${v.id}`}
                        className="px-3.5 py-2 text-xs font-bold text-indigo-400 hover:text-white border border-indigo-500/20 hover:bg-indigo-500/15 rounded-xl transition-all"
                      >
                        Edit
                      </a>

                      <ConfirmForm
                        action={deleteVideoAction}
                        message={`Apakah Anda yakin ingin menghapus video "${v.title}" dari repository? File terunggah di disk server juga akan dihapus.`}
                      >
                        <input type="hidden" name="videoId" value={v.id} />
                        <button
                          type="submit"
                          className="px-3.5 py-2 text-xs font-semibold text-rose-400 hover:text-white border border-rose-500/20 hover:bg-rose-500/15 rounded-xl transition-all cursor-pointer"
                        >
                          Hapus
                        </button>
                      </ConfirmForm>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
