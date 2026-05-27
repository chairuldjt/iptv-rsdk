'use client'

import { useState } from 'react'
import ConfirmForm from '@/components/ConfirmForm'
import AutoVideoThumbnail from '@/components/AutoVideoThumbnail'
import VideoPlayerModal from '@/components/VideoPlayerModal'

type FolderFilter = number | 'unfiled' | null

type VideoCardProps = {
  video: {
    id: number
    title: string
    videoUrl: string
    thumbnailUrl: string | null
    isPublished: boolean
    updatedAt: string
    folder: { name: string; isPublished: boolean } | null
  }
  selectedFolder: FolderFilter
  editHref: string
  onTogglePublished: (formData: FormData) => void | Promise<void>
  onDelete: (formData: FormData) => void | Promise<void>
}

export default function VideoLibraryCard({
  video,
  selectedFolder,
  editHref,
  onTogglePublished,
  onDelete,
}: VideoCardProps) {
  const [playerOpen, setPlayerOpen] = useState(false)
  const isUpload = video.videoUrl.startsWith('/uploads/videos/')
  const linked = video.isPublished && (!video.folder || video.folder.isPublished)
  const updatedAtLabel = new Date(video.updatedAt).toLocaleDateString('id-ID')
  const statusLabel = linked ? 'Linked' : video.isPublished ? 'Not Linked' : 'Aktif Off'

  return (
    <>
      <article className="group shrink-0 overflow-hidden rounded-[24px] border border-white/8 bg-slate-900/40 backdrop-blur-xl transition-all duration-300 hover:border-primary/30 hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col md:flex-row">
        {/* Left Side: Aspect Video Thumbnail */}
        <div className="relative aspect-video w-full md:w-[240px] shrink-0 bg-black/40 overflow-hidden">
          <AutoVideoThumbnail
            key={`${video.id}-${video.videoUrl}-${video.thumbnailUrl || 'auto'}`}
            videoUrl={video.videoUrl}
            thumbnailUrl={video.thumbnailUrl}
            alt={video.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/20" />
          
          {/* Overlays at top */}
          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3 z-10">
            <span className={`badge text-[9px] ${isUpload ? 'badge-primary' : 'badge-warning'}`}>
              {isUpload ? 'Upload' : 'URL'}
            </span>
            <span className={`badge text-[9px] ${linked ? 'badge-success' : video.isPublished ? 'badge-warning' : 'badge-muted'}`}>
              {statusLabel}
            </span>
          </div>

          {/* Play button bottom left */}
          <div className="absolute left-3 bottom-3 z-10">
            <button
              type="button"
              onClick={() => setPlayerOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 hover:bg-primary text-white border border-white/12 hover:border-primary backdrop-blur-md transition-all cursor-pointer focus-visible:outline-none"
            >
              <svg className="h-3.5 w-3.5 translate-x-[1px]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5.14v13.72a.75.75 0 0 0 1.13.65l10.56-6.86a.75.75 0 0 0 0-1.3L9.13 4.49A.75.75 0 0 0 8 5.14Z" />
              </svg>
            </button>
          </div>

          {/* Mock duration bottom right */}
          <div className="absolute right-3 bottom-3 z-10">
            <span className="rounded bg-black/60 px-1.5 py-0.5 font-mono text-[9px] text-white/90">
              12:45
            </span>
          </div>
        </div>

        {/* Right Side: Details & Actions */}
        <div className="flex-1 min-w-0 p-4 md:p-5 flex flex-col justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 className="text-lg font-bold text-white tracking-tight leading-snug truncate" title={video.title}>
                {video.title}
              </h4>
              <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-400 shrink-0">
                <span className="flex items-center gap-1 text-sky-400">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13.5H9m4.06-7.19l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                  </svg>
                  {video.folder?.name?.toUpperCase() || 'TANPA FOLDER'}
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                  {updatedAtLabel}
                </span>
              </div>
            </div>
            
            {/* File Path / URL */}
            <div className="font-mono text-xs text-slate-500 break-all select-all selection:bg-primary/30">
              {video.videoUrl}
            </div>
          </div>

          {/* Sync status row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-white/6 bg-white/[0.02] px-4 py-3">
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">Link ke Edukasi</p>
              <p className="mt-0.5 text-xs font-medium text-slate-300">
                {linked ? 'Masuk ke galeri yang akan disinkronkan.' : 'Belum masuk ke galeri yang akan disinkronkan.'}
              </p>
            </div>
            <form action={onTogglePublished} className="shrink-0 flex items-center">
              <input type="hidden" name="videoId" value={video.id} />
              <input type="hidden" name="currentStatus" value={video.isPublished ? 'true' : 'false'} />
              {typeof selectedFolder === 'number' && <input type="hidden" name="folderId" value={selectedFolder} />}
              <button
                className={`cursor-pointer rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                  video.isPublished
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                    : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
                }`}
              >
                {video.isPublished ? 'Aktif' : 'Nonaktif'}
              </button>
            </form>
          </div>

          {/* Video action row */}
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-white/6 pt-4">
            <button
              type="button"
              onClick={() => setPlayerOpen(true)}
              className="btn bg-indigo-600/90 text-white border border-indigo-500/20 hover:bg-indigo-500 hover:border-indigo-400 py-1.5 px-3.5 text-xs rounded-xl inline-flex items-center gap-1.5 transition-all shadow-[0_4px_12px_rgba(99,102,241,0.2)] cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Preview
            </button>
            <a
              href={editHref}
              className="btn bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10 hover:text-white py-1.5 px-3.5 text-xs rounded-xl inline-flex items-center gap-1.5 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
              </svg>
              Edit
            </a>
            <ConfirmForm
              action={onDelete}
              title="Hapus Video?"
              description="Video ini akan dihapus dari repository. Tindakan ini tidak dapat dibatalkan."
              message={`Judul video: ${video.title}`}
              confirmLabel="Hapus"
              successToast="Video berhasil dihapus dari repository."
            >
              <input type="hidden" name="videoId" value={video.id} />
              {typeof selectedFolder === 'number' && <input type="hidden" name="folderId" value={selectedFolder} />}
              <button className="btn bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 hover:text-rose-300 py-1.5 px-3.5 text-xs rounded-xl inline-flex items-center gap-1.5 transition-all cursor-pointer">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                Hapus
              </button>
            </ConfirmForm>
          </div>
        </div>
      </article>

      {playerOpen && (
        <VideoPlayerModal
          onClose={() => setPlayerOpen(false)}
          title={video.title}
          videoUrl={video.videoUrl}
          folderName={video.folder?.name || null}
          updatedAtLabel={updatedAtLabel}
        />
      )}
    </>
  )
}
