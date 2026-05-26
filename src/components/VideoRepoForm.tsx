'use client'

import React, { useState } from 'react'
import { addVideoAction, editVideoAction } from '@/app/dashboard/videos/actions'
import { useToast } from '@/components/Toast'

type FolderOption = {
  id: number
  name: string
}

interface VideoRepoFormProps {
  folders: FolderOption[]
  selectedFolderId: number | null
  editingVideo?: {
    id: number
    title: string
    videoUrl: string
    thumbnailUrl: string | null
    folderId: number | null
  } | null
}

type FormErrors = {
  title?: string
  videoUrl?: string
  folderName?: string
}

export default function VideoRepoForm({ folders, selectedFolderId, editingVideo }: VideoRepoFormProps) {
  const [sourceType, setSourceType] = useState<'url' | 'file'>(
    editingVideo?.videoUrl?.startsWith('/uploads/videos/') ? 'file' : 'url'
  )
  const [title, setTitle] = useState(editingVideo?.title || '')
  const [videoUrl, setVideoUrl] = useState(editingVideo?.videoUrl || '')
  const [thumbnailUrl, setThumbnailUrl] = useState(editingVideo?.thumbnailUrl || '')
  const [videoFileName, setVideoFileName] = useState('')
  const [thumbnailFileName, setThumbnailFileName] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { showToast } = useToast()

  const isEdit = !!editingVideo
  const hasFileUpload = sourceType === 'file'
  const submitLabel = isSubmitting
    ? hasFileUpload
      ? 'Mengupload video...'
      : 'Menyimpan video...'
    : isEdit
      ? 'Simpan Perubahan'
      : 'Tambah ke Galeri'

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const nextErrors = validateForm({
      title,
      sourceType,
      videoUrl,
      isEdit,
      videoFileName,
    })

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      showToast('error', 'Periksa kembali field yang wajib diisi.')
      return
    }

    setIsSubmitting(true)
    const formData = new FormData(e.currentTarget)

    try {
      const result = isEdit ? await editVideoAction(formData) : await addVideoAction(formData)

      if (result?.success) {
        showToast('success', result.message || 'Video berhasil disimpan.')
      } else if (result && !result.success) {
        showToast('error', result.message || 'Gagal menyimpan video.')
      }

      if (result?.success && !isEdit) {
        setTitle('')
        setVideoUrl('')
        setThumbnailUrl('')
        setVideoFileName('')
        setThumbnailFileName('')
        setErrors({})
        resetFileInput('videoFile')
        resetFileInput('thumbnailFile')
      }
    } catch (error) {
      if (isRedirectError(error)) {
        throw error
      }
      showToast('error', 'Terjadi kesalahan sistem.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="card p-5 rounded-2xl flex-1 min-h-0 overflow-y-auto">
      <div className="mb-5">
        <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-white">
          {isEdit ? 'PERBARUI VIDEO' : 'TAMBAH VIDEO'}
        </h3>
        <p className="mt-1 text-xs text-slate-400">
          Masukkan URL video atau upload file lokal.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" encType="multipart/form-data">
        {isEdit && <input type="hidden" name="videoId" value={editingVideo.id} />}
        {/* Hidden input for videoUrl so that it submits the synchronized value regardless of URL/File type */}
        <input type="hidden" name="videoUrl" value={videoUrl} />

        {/* Judul Video */}
        <div>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Judul Video
          </label>
          <input
            type="text"
            name="title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              setErrors((current) => ({ ...current, title: undefined }))
            }}
            required
            placeholder="Edukasi pencegahan infeksi"
            className={`w-full rounded-xl border ${
              errors.title ? 'border-rose-500/40 focus:border-rose-500 focus:ring-rose-500/10' : 'border-white/8 focus:border-primary/50 focus:ring-primary/20'
            } bg-slate-950/45 px-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none transition-all focus:ring-1`}
          />
          {errors.title && (
            <span className="mt-1 block text-[10px] text-rose-400">{errors.title}</span>
          )}
        </div>

        {/* Folder Select */}
        <div>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Folder
          </label>
          <div className="relative">
            <select
              name="folderId"
              defaultValue={editingVideo?.folderId ?? selectedFolderId ?? ''}
              className="w-full rounded-xl border border-white/8 bg-slate-950/45 px-3 py-2 text-xs text-white outline-none appearance-none transition-all focus:border-primary/50 focus:ring-1 focus:ring-primary/20 cursor-pointer"
            >
              <option value="" className="bg-slate-950 text-white">Tanpa Folder</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id} className="bg-slate-950 text-white">
                  {folder.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
              <svg className="h-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </div>
          </div>
        </div>

        {/* Sumber Video */}
        <div>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Sumber Video
          </label>
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/8 bg-white/[0.02] p-1">
            <button
              type="button"
              onClick={() => setSourceType('url')}
              className={`rounded-lg py-1.5 text-xs font-bold text-center transition-all cursor-pointer ${
                sourceType === 'url'
                  ? 'bg-indigo-600 text-white shadow-[0_4px_12px_rgba(99,102,241,0.25)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              URL
            </button>
            <button
              type="button"
              onClick={() => setSourceType('file')}
              className={`rounded-lg py-1.5 text-xs font-bold text-center transition-all cursor-pointer ${
                sourceType === 'file'
                  ? 'bg-indigo-600 text-white shadow-[0_4px_12px_rgba(99,102,241,0.25)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Upload
            </button>
          </div>
        </div>

        {/* Dynamic Source Input */}
        {sourceType === 'url' ? (
          <div className="space-y-4 animate-fade-in">
            {/* URL Eksternal Input */}
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                URL Eksternal
              </label>
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => {
                  setVideoUrl(e.target.value)
                  setErrors((current) => ({ ...current, videoUrl: undefined }))
                }}
                placeholder="https://server/video.mp4"
                className={`w-full rounded-xl border ${
                  errors.videoUrl ? 'border-rose-500/40 focus:border-rose-500 focus:ring-rose-500/10' : 'border-white/8 focus:border-primary/50 focus:ring-primary/20'
                } bg-slate-950/45 px-3 py-2 text-xs text-white placeholder:text-slate-500 font-mono outline-none transition-all focus:ring-1`}
              />
            </div>

            {/* Video URL Input */}
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Video URL
              </label>
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => {
                  setVideoUrl(e.target.value)
                  setErrors((current) => ({ ...current, videoUrl: undefined }))
                }}
                placeholder="https://server/video.mp4"
                className={`w-full rounded-xl border ${
                  errors.videoUrl ? 'border-rose-500/40 focus:border-rose-500 focus:ring-rose-500/10' : 'border-white/8 focus:border-primary/50 focus:ring-primary/20'
                } bg-slate-950/45 px-3 py-2 text-xs text-white placeholder:text-slate-500 font-mono outline-none transition-all focus:ring-1`}
              />
              {errors.videoUrl && (
                <span className="mt-1 block text-[10px] text-rose-400">{errors.videoUrl}</span>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-1.5 animate-fade-in">
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              File Video
            </label>
            <div className="relative flex items-center justify-between border border-dashed border-white/8 bg-white/[0.02] hover:bg-white/[0.04] p-3 rounded-xl transition-colors cursor-pointer">
              <input
                type="file"
                id="videoFile"
                name="videoFile"
                accept="video/*"
                required={sourceType === 'file' && !isEdit}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={(e) => {
                  setVideoFileName(e.target.files?.[0]?.name || '')
                  setErrors((current) => ({ ...current, videoUrl: undefined }))
                }}
              />
              <span className="text-xs text-slate-400 truncate max-w-[80%] font-medium">
                {videoFileName || (isEdit ? 'Ganti file video (Opsional)' : 'Choose File')}
              </span>
              <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            {videoFileName && (
              <span className="inline-block mt-1 text-[10px] text-indigo-400 font-medium truncate max-w-full">
                Terpilih: {videoFileName}
              </span>
            )}
            {errors.videoUrl && (
              <span className="mt-1 block text-[10px] text-rose-400">{errors.videoUrl}</span>
            )}
          </div>
        )}

        {/* Thumbnail URL Input */}
        <div>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Thumbnail URL <span className="text-slate-500 font-normal">(Opsional)</span>
          </label>
          <input
            type="url"
            name="thumbnailUrl"
            value={thumbnailUrl}
            onChange={(e) => setThumbnailUrl(e.target.value)}
            placeholder="Opsional, bisa diganti dengan upload"
            className="w-full rounded-xl border border-white/8 bg-slate-950/45 px-3 py-2 text-xs text-white placeholder:text-slate-500 font-mono outline-none transition-all focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
          />
          <p className="mt-1 text-[9px] leading-relaxed text-slate-500">
            Jika dikosongkan, server akan membuat thumbnail otomatis dari video atau menyimpannya.
          </p>
        </div>

        {/* Upload Thumbnail Input */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Upload Thumbnail <span className="text-slate-500 font-normal">(Opsional)</span>
          </label>
          <div className="relative flex items-center justify-between border border-dashed border-white/8 bg-white/[0.02] hover:bg-white/[0.04] p-3 rounded-xl transition-colors cursor-pointer">
            <input
              type="file"
              id="thumbnailFile"
              name="thumbnailFile"
              accept="image/*"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={(e) => setThumbnailFileName(e.target.files?.[0]?.name || '')}
            />
            <span className="text-xs text-slate-400 truncate max-w-[80%] font-medium">
              {thumbnailFileName || 'Choose File'}
            </span>
            <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V3.75m0 0l-3.75 3.75M12 3.75l3.75 3.75M3.75 15.75v2.25A2.25 2.25 0 006 20.25h12A2.25 2.25 0 0020.25 18v-2.25" />
            </svg>
          </div>
          <p className="text-[9px] leading-relaxed text-slate-500">
            Opsional. File upload akan menggantikan thumbnail URL yang diisi.
          </p>
          {thumbnailFileName && (
            <span className="inline-block mt-1 text-[10px] text-indigo-400 font-medium truncate max-w-full">
              Terpilih: {thumbnailFileName}
            </span>
          )}
        </div>

        {/* Remove Thumbnail checkbox (if editing) */}
        {isEdit && editingVideo.thumbnailUrl && (
          <label className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2 text-xs text-slate-400 select-none hover:bg-white/[0.04] cursor-pointer">
            <input type="checkbox" name="removeThumbnail" className="accent-indigo-600 rounded cursor-pointer" />
            Hapus thumbnail saat disimpan
          </label>
        )}

        {/* Submitting progress bar */}
        {isSubmitting && (
          <div className="rounded-xl border border-primary/20 bg-primary/10 p-3 animate-pulse">
            <div className="flex items-center justify-between text-[10px] font-bold text-primary">
              <span>{hasFileUpload ? 'Upload sedang berjalan' : 'Menyimpan perubahan video'}</span>
              <span>Processing...</span>
            </div>
            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-900/60">
              <div className="h-full w-2/3 rounded-full bg-primary animate-pulse" />
            </div>
          </div>
        )}

        {/* Submit Buttons */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-white text-xs transition-all shadow-[0_4px_12px_rgba(99,102,241,0.25)] cursor-pointer disabled:opacity-40 flex items-center justify-center gap-1.5"
          >
            {!isEdit && (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {submitLabel}
          </button>

          {isEdit && (
            <a
              href="/dashboard/videos"
              className="mt-3 block text-center text-xs font-semibold text-slate-500 hover:text-white transition-colors"
            >
              Batal edit
            </a>
          )}
        </div>
      </form>
    </div>
  )
}

function validateForm({
  title,
  sourceType,
  videoUrl,
  isEdit,
  videoFileName,
}: {
  title: string
  sourceType: 'url' | 'file'
  videoUrl: string
  isEdit: boolean
  videoFileName: string
}) {
  const nextErrors: FormErrors = {}

  if (!title.trim()) {
    nextErrors.title = 'Judul video wajib diisi.'
  }

  if (sourceType === 'url') {
    if (!videoUrl.trim()) {
      nextErrors.videoUrl = 'URL video wajib diisi.'
    } else if (!isValidUrl(videoUrl.trim())) {
      nextErrors.videoUrl = 'Masukkan URL video yang valid.'
    }
  }

  if (sourceType === 'file' && !isEdit && !videoFileName) {
    nextErrors.videoUrl = 'Pilih file video untuk diupload.'
  }

  return nextErrors
}

function isValidUrl(value: string) {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function isRedirectError(error: unknown) {
  return error instanceof Error && (
    error.message.includes('NEXT_REDIRECT') ||
    ('digest' in error && String((error as { digest?: string }).digest).includes('NEXT_REDIRECT'))
  )
}

function resetFileInput(id: string) {
  const fileInput = document.getElementById(id) as HTMLInputElement | null
  if (fileInput) fileInput.value = ''
}
