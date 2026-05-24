'use client'

import React, { useMemo, useState } from 'react'
import { saveEntertainmentItemAction } from '@/app/dashboard/entertainment/actions'

type VideoOption = {
  id: number
  title: string
  folderName: string | null
  videoUrl: string
  thumbnailUrl: string | null
}

type ChannelOption = {
  id: number
  name: string
  playlistName: string
  categoryName: string
  streamUrl: string
  apiUrl: string
  relayUrl: string
}

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
  videoOptions: VideoOption[]
  channelOptions: ChannelOption[]
}

type ContentType = 'webview' | 'media_player' | 'm3u_player'
type M3uSource = 'manual' | 'api' | 'relay'

export default function EntertainmentItemForm({
  editingItem,
  videoOptions,
  channelOptions,
}: EntertainmentItemFormProps) {
  const [message, setMessage] = useState<{ success: boolean; text: string } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [contentType, setContentType] = useState<ContentType>((editingItem?.contentType as ContentType) || 'webview')
  const [m3uSource, setM3uSource] = useState<M3uSource>('manual')
  const [selectedVideoId, setSelectedVideoId] = useState('')
  const [selectedChannelId, setSelectedChannelId] = useState('')
  const [title, setTitle] = useState(editingItem?.title || '')
  const [subtitle, setSubtitle] = useState(editingItem?.subtitle || '')
  const [url, setUrl] = useState(editingItem?.url || '')
  const [thumbnailUrl, setThumbnailUrl] = useState(editingItem?.thumbnailUrl || '')

  const selectedVideo = useMemo(
    () => videoOptions.find((video) => String(video.id) === selectedVideoId) || null,
    [selectedVideoId, videoOptions]
  )
  const selectedChannel = useMemo(
    () => channelOptions.find((channel) => String(channel.id) === selectedChannelId) || null,
    [selectedChannelId, channelOptions]
  )

  const applyVideo = (videoId: string) => {
    setSelectedVideoId(videoId)
    const video = videoOptions.find((item) => String(item.id) === videoId)
    if (!video) return

    setTitle((current) => current || video.title)
    setSubtitle((current) => current || (video.folderName ? `Video Repository - ${video.folderName}` : 'Video Repository'))
    setUrl(video.videoUrl)
    if (video.thumbnailUrl) setThumbnailUrl((current) => current || video.thumbnailUrl || '')
  }

  const applyChannel = (channelId: string, source: M3uSource = m3uSource) => {
    setSelectedChannelId(channelId)
    const channel = channelOptions.find((item) => String(item.id) === channelId)
    if (!channel || source === 'manual') return

    setTitle((current) => current || channel.name)
    setSubtitle((current) => current || `${source === 'relay' ? 'Relay' : 'API Server'} - ${channel.categoryName}`)
    setUrl(source === 'relay' ? channel.relayUrl : channel.apiUrl)
  }

  const changeContentType = (nextType: ContentType) => {
    setContentType(nextType)
    if (nextType === 'media_player') {
      setM3uSource('manual')
      if (selectedVideo) setUrl(selectedVideo.videoUrl)
    }
    if (nextType === 'm3u_player' && selectedChannel && m3uSource !== 'manual') {
      setUrl(m3uSource === 'relay' ? selectedChannel.relayUrl : selectedChannel.apiUrl)
    }
  }

  const changeM3uSource = (source: M3uSource) => {
    setM3uSource(source)
    if (source !== 'manual' && selectedChannel) {
      setUrl(source === 'relay' ? selectedChannel.relayUrl : selectedChannel.apiUrl)
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setMessage(null)

    if (contentType === 'media_player' && !url.trim()) {
      setMessage({ success: false, text: 'Pilih video dari Video Repository terlebih dahulu.' })
      setIsSubmitting(false)
      return
    }

    if (contentType === 'm3u_player' && m3uSource !== 'manual' && !url.trim()) {
      setMessage({ success: false, text: 'Pilih channel dari API Server atau Relay terlebih dahulu.' })
      setIsSubmitting(false)
      return
    }

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

      <form onSubmit={handleSubmit} className="space-y-5" encType="multipart/form-data">
        {editingItem && <input type="hidden" name="itemId" value={editingItem.id} />}
        <input type="hidden" name="contentType" value={contentType} />

        <div>
          <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Mode Konten</span>
          <div className="grid grid-cols-3 gap-2">
            <ModeButton active={contentType === 'webview'} label="WebView" onClick={() => changeContentType('webview')} />
            <ModeButton active={contentType === 'media_player'} label="Media" onClick={() => changeContentType('media_player')} />
            <ModeButton active={contentType === 'm3u_player'} label="M3U" onClick={() => changeContentType('m3u_player')} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/35 p-4 space-y-4">
          {contentType === 'media_player' && (
            <>
              <Field label="Pilih dari Video Repository">
                <select
                  value={selectedVideoId}
                  onChange={(event) => applyVideo(event.target.value)}
                  className="field-input"
                >
                  <option value="">Pilih video...</option>
                  {videoOptions.map((video) => (
                    <option key={video.id} value={video.id}>
                      {video.folderName ? `${video.folderName} / ` : ''}{video.title}
                    </option>
                  ))}
                </select>
              </Field>
              {videoOptions.length === 0 && (
                <p className="text-xs text-amber-200/80 rounded-xl bg-amber-500/10 border border-amber-500/15 px-3 py-2">
                  Video Repository masih kosong. Tambahkan video dari menu Video Repository dulu.
                </p>
              )}
            </>
          )}

          {contentType === 'm3u_player' && (
            <>
              <div>
                <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Sumber M3U / Stream</span>
                <div className="grid grid-cols-3 gap-2">
                  <ModeButton active={m3uSource === 'manual'} label="URL" onClick={() => changeM3uSource('manual')} />
                  <ModeButton active={m3uSource === 'api'} label="API" onClick={() => changeM3uSource('api')} />
                  <ModeButton active={m3uSource === 'relay'} label="Relay" onClick={() => changeM3uSource('relay')} />
                </div>
              </div>

              {m3uSource !== 'manual' && (
                <>
                  <Field label="Pilih Channel">
                    <select
                      value={selectedChannelId}
                      onChange={(event) => applyChannel(event.target.value, m3uSource)}
                      className="field-input"
                    >
                      <option value="">Pilih channel...</option>
                      {channelOptions.map((channel) => (
                        <option key={channel.id} value={channel.id}>
                          {channel.playlistName} / {channel.categoryName} / {channel.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {channelOptions.length === 0 && (
                    <p className="text-xs text-amber-200/80 rounded-xl bg-amber-500/10 border border-amber-500/15 px-3 py-2">
                      Belum ada channel aktif dari playlist/API Server.
                    </p>
                  )}
                </>
              )}
            </>
          )}

          {(contentType === 'webview' || contentType === 'm3u_player') && (
            <Field label={contentType === 'webview' ? 'URL WebView' : 'URL M3U / Stream'}>
              <input
                name="url"
                type="text"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder={contentType === 'webview' ? 'https://...' : 'https://... atau udp://...'}
                className="field-input font-mono"
              />
            </Field>
          )}

          {contentType === 'media_player' && (
            <input type="hidden" name="url" value={url} />
          )}

          {url && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/45 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">URL Terpilih</p>
              <p className="mt-1 text-[11px] font-mono text-slate-300 break-all">{url}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Judul">
            <input name="title" required value={title} onChange={(event) => setTitle(event.target.value)} className="field-input" />
          </Field>

          <Field label="Urutan">
            <input name="sortOrder" type="number" defaultValue={editingItem?.sortOrder ?? 0} className="field-input" />
          </Field>
        </div>

        <Field label="Sub Teks">
          <input name="subtitle" value={subtitle} onChange={(event) => setSubtitle(event.target.value)} className="field-input" />
        </Field>

        <Field label="Thumbnail URL">
          <input
            name="thumbnailUrl"
            type="text"
            value={thumbnailUrl}
            onChange={(event) => setThumbnailUrl(event.target.value)}
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

function ModeButton({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`py-2 rounded-xl border text-xs font-bold transition-all ${
        active
          ? 'bg-amber-500/20 text-white border-amber-500/40'
          : 'text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800/60'
      }`}
    >
      {label}
    </button>
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
