'use client'

import React, { useState } from 'react'
import { saveEntertainmentItemAction } from '@/app/dashboard/entertainment/actions'

type EntertainmentItemFormProps = {
  editingItem?: {
    id: number
    title: string
    subtitle: string
    url: string | null
    contentType: string
    thumbnailUrl: string | null
    isActive: boolean
    sortOrder: number
  } | null
}

export default function EntertainmentItemForm({ editingItem }: EntertainmentItemFormProps) {
  const [message, setMessage] = useState<{ success: boolean; text: string } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setMessage(null)

    try {
      const result = await saveEntertainmentItemAction(new FormData(event.currentTarget))
      if (result) setMessage({ success: result.success, text: result.message || '' })
    } catch {
      setMessage({ success: false, text: 'Terjadi kesalahan saat menyimpan.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="glass-panel border border-border rounded-2xl p-5 h-fit sticky top-6">
      <div className="mb-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">Entertainment Item</p>
        <h3 className="font-bold text-white text-lg mt-1">{editingItem ? 'Edit Konten' : 'Tambah Konten'}</h3>
      </div>

      {message && (
        <div className={`p-3 mb-4 rounded-xl text-xs font-bold border ${
          message.success ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" encType="multipart/form-data">
        {editingItem && <input type="hidden" name="itemId" value={editingItem.id} />}

        <Field label="Judul">
          <input name="title" required defaultValue={editingItem?.title || ''} className="field-input" />
        </Field>

        <Field label="Sub Teks">
          <input name="subtitle" defaultValue={editingItem?.subtitle || ''} className="field-input" />
        </Field>

        <Field label="URL Konten">
          <input
            name="url"
            type="url"
            defaultValue={editingItem?.url || ''}
            placeholder="https://..."
            className="field-input font-mono"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipe">
            <select name="contentType" defaultValue={editingItem?.contentType || 'webview'} className="field-input">
              <option value="webview">WebView</option>
              <option value="media_player">Media Player</option>
              <option value="m3u_player">M3U Player</option>
            </select>
          </Field>

          <Field label="Urutan">
            <input name="sortOrder" type="number" defaultValue={editingItem?.sortOrder ?? 0} className="field-input" />
          </Field>
        </div>

        <Field label="Thumbnail URL">
          <input
            name="thumbnailUrl"
            type="text"
            defaultValue={editingItem?.thumbnailUrl || ''}
            placeholder="/uploads/entertainment-thumbnails/..."
            className="field-input font-mono"
          />
        </Field>

        <Field label="Upload Thumbnail">
          <input name="thumbnailFile" type="file" accept="image/*" className="file-input" />
        </Field>

        <label className="flex items-center gap-2 text-xs text-slate-300">
          <input name="isActive" type="checkbox" defaultChecked={editingItem?.isActive ?? true} className="accent-primary" />
          Tampilkan di aplikasi jika URL tersedia
        </label>

        {editingItem?.thumbnailUrl && (
          <label className="flex items-center gap-2 text-xs text-slate-400">
            <input name="removeThumbnail" type="checkbox" className="accent-primary" />
            Hapus thumbnail saat disimpan
          </label>
        )}

        <button
          disabled={isSubmitting}
          className="w-full py-3 rounded-xl bg-primary hover:bg-indigo-500 font-bold text-white text-sm transition-all cursor-pointer disabled:opacity-50"
        >
          {isSubmitting ? 'Menyimpan...' : 'Simpan Konten'}
        </button>

        {editingItem && (
          <a href="/dashboard/entertainment" className="block text-center text-xs font-semibold text-slate-500 hover:text-white transition-colors">
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
      <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</span>
      {children}
    </label>
  )
}
