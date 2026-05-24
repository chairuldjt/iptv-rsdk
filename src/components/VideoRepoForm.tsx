'use client'

import React, { useState } from 'react'
import { addVideoAction, editVideoAction } from '@/app/dashboard/videos/actions'

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

export default function VideoRepoForm({ folders, selectedFolderId, editingVideo }: VideoRepoFormProps) {
  const [sourceType, setSourceType] = useState<'url' | 'file'>(
    editingVideo?.videoUrl?.startsWith('/uploads/videos/') ? 'file' : 'url'
  )
  const [title, setTitle] = useState(editingVideo?.title || '')
  const [videoUrl, setVideoUrl] = useState(editingVideo?.videoUrl || '')
  const [thumbnailUrl, setThumbnailUrl] = useState(editingVideo?.thumbnailUrl || '')
  const [message, setMessage] = useState<{ success: boolean; text: string } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isEdit = !!editingVideo

  const sourceLabel = sourceType === 'url' ? 'URL eksternal' : 'File upload lokal'

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage(null)

    const formData = new FormData(e.currentTarget)
    try {
      const result = isEdit ? await editVideoAction(formData) : await addVideoAction(formData)

      if (result) {
        setMessage({ success: result.success, text: result.message || '' })
        if (result.success && !isEdit) {
          setTitle('')
          setVideoUrl('')
          setThumbnailUrl('')
          resetFileInput('videoFile')
          resetFileInput('thumbnailFile')
        }
      }
    } catch {
      setMessage({ success: false, text: 'Terjadi kesalahan sistem.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 h-fit xl:sticky xl:top-20">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Video Detail</p>
          <h3 className="font-bold text-foreground text-lg mt-1">
            {isEdit ? 'Edit Video' : 'Tambah Video'}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {isEdit ? 'Perbarui metadata atau ganti sumber media.' : 'Masukkan URL video atau upload file lokal.'}
          </p>
        </div>
        {isEdit && (
          <span className="badge badge-primary shrink-0">Edit</span>
        )}
      </div>

      {message && (
        <div className={`p-3 mb-4 rounded-xl text-xs font-bold border ${
          message.success
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" encType="multipart/form-data">
        {isEdit && <input type="hidden" name="videoId" value={editingVideo.id} />}

        <Field label="Judul Video">
          <input
            type="text"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Edukasi pencegahan infeksi"
            className="field-input"
          />
        </Field>

        <Field label="Folder">
          <select
            name="folderId"
            defaultValue={editingVideo?.folderId ?? selectedFolderId ?? ''}
            className="field-input"
          >
            <option value="">Tanpa Folder</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>{folder.name}</option>
            ))}
          </select>
        </Field>

        <div>
          <span className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Sumber Video
          </span>
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-background/50 border border-border p-1">
            <button
              type="button"
              onClick={() => setSourceType('url')}
              className={`py-2.5 text-xs font-bold rounded-lg transition-all ${
                sourceType === 'url'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              }`}
            >
              URL
            </button>
            <button
              type="button"
              onClick={() => setSourceType('file')}
              className={`py-2.5 text-xs font-bold rounded-lg transition-all ${
                sourceType === 'file'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              }`}
            >
              Upload
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">{sourceLabel}</p>
        </div>

        {sourceType === 'url' ? (
          <Field label="Video URL">
            <input
              type="url"
              name="videoUrl"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              required={sourceType === 'url'}
              placeholder="https://server/video.mp4"
              className="field-input font-mono"
            />
          </Field>
        ) : (
          <UploadField label="File Video" helper={isEdit ? 'Kosongkan jika tidak ingin mengganti file video.' : 'Pilih file video dari komputer.'}>
            <input
              type="file"
              id="videoFile"
              name="videoFile"
              accept="video/*"
              required={sourceType === 'file' && !isEdit}
              className="file-input"
            />
          </UploadField>
        )}

        <Field label="Thumbnail URL">
          <input
            type="url"
            name="thumbnailUrl"
            value={thumbnailUrl}
            onChange={(e) => setThumbnailUrl(e.target.value)}
            placeholder="Opsional, bisa diganti dengan upload"
            className="field-input font-mono"
          />
        </Field>

        <UploadField label="Upload Thumbnail" helper="Opsional. File upload akan menggantikan thumbnail URL.">
          <input
            type="file"
            id="thumbnailFile"
            name="thumbnailFile"
            accept="image/*"
            className="file-input"
          />
        </UploadField>

        {isEdit && editingVideo.thumbnailUrl && (
          <label className="flex items-center gap-2 text-xs text-muted-foreground rounded-xl border border-border bg-background/40 px-3 py-2">
            <input type="checkbox" name="removeThumbnail" className="accent-primary" />
            Hapus thumbnail saat disimpan
          </label>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 rounded-xl bg-primary hover:bg-indigo-500 font-bold text-white text-sm transition-all duration-200 cursor-pointer disabled:opacity-50"
        >
          {isSubmitting ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Tambah ke Galeri'}
        </button>

        {isEdit && (
          <a
            href="/dashboard/videos"
            className="block text-center text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            Batal edit
          </a>
        )}
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label>
      <span className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
        {label}
      </span>
      {children}
    </label>
  )
}

function UploadField({ label, helper, children }: { label: string; helper: string; children: React.ReactNode }) {
  return (
    <label className="block rounded-xl border border-border bg-background/40 p-3">
      <span className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        {label}
      </span>
      {children}
      <span className="block text-[10px] text-muted-foreground mt-2 leading-relaxed">{helper}</span>
    </label>
  )
}

function resetFileInput(id: string) {
  const fileInput = document.getElementById(id) as HTMLInputElement | null
  if (fileInput) fileInput.value = ''
}
