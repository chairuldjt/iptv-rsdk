'use client'

import React, { useState } from 'react'
import { addVideoAction, editVideoAction } from '@/app/dashboard/videos/actions'

interface VideoRepoFormProps {
  editingVideo?: {
    id: number
    title: string
    videoUrl: string
  } | null
}

export default function VideoRepoForm({ editingVideo }: VideoRepoFormProps) {
  const [sourceType, setSourceType] = useState<'url' | 'file'>(
    editingVideo?.videoUrl?.startsWith('/uploads/videos/') ? 'file' : 'url'
  )
  const [title, setTitle] = useState(editingVideo?.title || '')
  const [videoUrl, setVideoUrl] = useState(editingVideo?.videoUrl || '')
  const [message, setMessage] = useState<{ success: boolean; text: string } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isEdit = !!editingVideo

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage(null)

    const formData = new FormData(e.currentTarget)
    try {
      let result
      if (isEdit) {
        // Redirect will happen, but handle client errors if any
        await editVideoAction(formData)
        result = { success: true, message: 'Video berhasil diperbarui!' }
      } else {
        result = await addVideoAction(formData)
      }

      if (result) {
        setMessage({ success: result.success, text: result.message || '' })
        if (result.success && !isEdit) {
          setTitle('')
          setVideoUrl('')
          // Reset file input if exists
          const fileInput = document.getElementById('videoFile') as HTMLInputElement
          if (fileInput) fileInput.value = ''
        }
      }
    } catch {
      setMessage({ success: false, text: 'Terjadi kesalahan sistem.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="glass-card p-6 rounded-2xl border border-border h-fit">
      <h3 className="font-bold text-white text-lg mb-4">
        {isEdit ? `Edit Video: ${editingVideo.title}` : 'Add Video to Repository'}
      </h3>

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

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Video Title
          </label>
          <input
            type="text"
            name="title"
            value={title || ''}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="e.g. Edukasi Pencegahan Stunting"
            className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Source Type
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSourceType('url')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${
                sourceType === 'url'
                  ? 'bg-indigo-500/20 text-white border-indigo-500/40 shadow-[0_0_10px_rgba(99,102,241,0.15)]'
                  : 'text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              Direct Video Link (URL)
            </button>
            <button
              type="button"
              onClick={() => setSourceType('file')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${
                sourceType === 'file'
                  ? 'bg-indigo-500/20 text-white border-indigo-500/40 shadow-[0_0_10px_rgba(99,102,241,0.15)]'
                  : 'text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              Upload Local MP4
            </button>
          </div>
        </div>

        {sourceType === 'url' ? (
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Video URL / Stream Path
            </label>
            <input
              key="video-url-input"
              type="url"
              name="videoUrl"
              value={videoUrl || ''}
              onChange={(e) => setVideoUrl(e.target.value)}
              required={sourceType === 'url'}
              placeholder="http://your-server.com/video.mp4"
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-primary transition-colors font-mono"
            />
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Select Video File
            </label>
            <input
              key="video-file-input"
              type="file"
              id="videoFile"
              name="videoFile"
              accept="video/*"
              required={sourceType === 'file' && !isEdit}
              className="w-full text-slate-400 text-xs file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-indigo-400 file:hover:bg-slate-700/50 cursor-pointer"
            />
            {isEdit && existingVideoHasLocalFile(editingVideo?.videoUrl) && (
              <p className="text-[10px] text-slate-500 mt-1 italic">
                * Ada file tersimpan. Unggah file baru untuk menggantinya.
              </p>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-2 py-3 rounded-xl bg-primary hover:bg-indigo-500 font-bold text-white text-sm transition-all duration-200 cursor-pointer text-center glow-indigo disabled:opacity-50"
        >
          {isSubmitting 
            ? 'Processing...' 
            : isEdit 
              ? 'Update Video' 
              : 'Save Video to Repository'}
        </button>

        {isEdit && (
          <a
            href="/dashboard/videos"
            className="block text-center text-xs font-semibold text-slate-500 hover:text-white mt-2 transition-colors"
          >
            Cancel Edit
          </a>
        )}
      </form>
    </div>
  )
}

function existingVideoHasLocalFile(url?: string): boolean {
  return !!url?.startsWith('/uploads/videos/')
}
