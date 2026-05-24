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
    <div className="glass-panel border border-border rounded-2xl p-5 h-fit sticky top-6">
      <div className="mb-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300">Inspector</p>
        <h3 className="font-bold text-white text-lg mt-1">
          {isEdit ? 'Edit Video' : 'Upload Video'}
        </h3>
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
          <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Sumber Video
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSourceType('url')}
              className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                sourceType === 'url'
                  ? 'bg-indigo-500/20 text-white border-indigo-500/40'
                  : 'text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              URL
            </button>
            <button
              type="button"
              onClick={() => setSourceType('file')}
              className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                sourceType === 'file'
                  ? 'bg-indigo-500/20 text-white border-indigo-500/40'
                  : 'text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              Upload
            </button>
          </div>
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
          <Field label="File Video">
            <input
              type="file"
              id="videoFile"
              name="videoFile"
              accept="video/*"
              required={sourceType === 'file' && !isEdit}
              className="file-input"
            />
          </Field>
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

        <Field label="Upload Thumbnail">
          <input
            type="file"
            id="thumbnailFile"
            name="thumbnailFile"
            accept="image/*"
            className="file-input"
          />
        </Field>

        {isEdit && editingVideo.thumbnailUrl && (
          <label className="flex items-center gap-2 text-xs text-slate-400">
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
            className="block text-center text-xs font-semibold text-slate-500 hover:text-white transition-colors"
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
      <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
        {label}
      </span>
      {children}
    </label>
  )
}

function resetFileInput(id: string) {
  const fileInput = document.getElementById(id) as HTMLInputElement | null
  if (fileInput) fileInput.value = ''
}
