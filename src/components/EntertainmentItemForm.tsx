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

type PlaylistOption = {
  id: number
  name: string
  totalChannels: number
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
  playlistOptions: PlaylistOption[]
  publicOrigin: string
}

type ContentType = 'webview' | 'media_player' | 'm3u_player' | 'm3u_playlist'

export default function EntertainmentItemForm({
  editingItem,
  videoOptions,
  channelOptions,
  playlistOptions,
  publicOrigin,
}: EntertainmentItemFormProps) {
  const [message, setMessage] = useState<{ success: boolean; text: string } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [contentType, setContentType] = useState<ContentType>((editingItem?.contentType as ContentType) || 'webview')
  
  const initialVideoId = useMemo(() => {
    if (!editingItem || editingItem.contentType !== 'media_player') return ''
    const match = videoOptions.find((video) => video.videoUrl === editingItem.url)
    return match ? String(match.id) : ''
  }, [editingItem, videoOptions])

  const initialChannelId = useMemo(() => {
    if (!editingItem || editingItem.contentType !== 'm3u_player') return ''
    const match = channelOptions.find((ch) => ch.streamUrl === editingItem.url || ch.relayUrl === editingItem.url)
    return match ? String(match.id) : ''
  }, [editingItem, channelOptions])

  const initialPlaylistId = useMemo(() => {
    if (!editingItem || editingItem.contentType !== 'm3u_playlist') return ''
    const match = playlistOptions.find((pl) => {
      const expectedUrl = `${publicOrigin}/api/playlist/export/${pl.id}`
      return editingItem.url === expectedUrl
    })
    return match ? String(match.id) : ''
  }, [editingItem, playlistOptions, publicOrigin])

  const [selectedVideoId, setSelectedVideoId] = useState(initialVideoId)
  const [selectedChannelId, setSelectedChannelId] = useState(initialChannelId)
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(initialPlaylistId)
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
  const selectedPlaylist = useMemo(
    () => playlistOptions.find((playlist) => String(playlist.id) === selectedPlaylistId) || null,
    [selectedPlaylistId, playlistOptions]
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

  const applyChannel = (channelId: string) => {
    setSelectedChannelId(channelId)
    const channel = channelOptions.find((item) => String(item.id) === channelId)
    if (!channel) return

    setTitle((current) => current || channel.name)
    setSubtitle((current) => current || `Channel - ${channel.categoryName}`)
    
    // Use relay URL if it is a UDP stream, otherwise use direct stream URL
    const isUdp = channel.streamUrl.trim().toLowerCase().startsWith('udp://')
    setUrl(isUdp ? channel.relayUrl : channel.streamUrl)
  }

  const applyPlaylist = (playlistId: string) => {
    setSelectedPlaylistId(playlistId)
    const playlist = playlistOptions.find((item) => String(item.id) === playlistId)
    if (!playlist) return

    setTitle((current) => current || playlist.name)
    setSubtitle((current) => current || `Playlist - ${playlist.totalChannels} Channels`)
    setUrl(`${publicOrigin}/api/playlist/export/${playlist.id}`)
  }

  const changeContentType = (nextType: ContentType) => {
    setContentType(nextType)
    if (nextType === 'media_player') {
      if (selectedVideo) setUrl(selectedVideo.videoUrl)
      else setUrl('')
    } else if (nextType === 'm3u_player') {
      if (selectedChannel) {
        const isUdp = selectedChannel.streamUrl.trim().toLowerCase().startsWith('udp://')
        setUrl(isUdp ? selectedChannel.relayUrl : selectedChannel.streamUrl)
      } else {
        setUrl('')
      }
    } else if (nextType === 'm3u_playlist') {
      if (selectedPlaylist) {
        setUrl(`${publicOrigin}/api/playlist/export/${selectedPlaylist.id}`)
      } else {
        setUrl('')
      }
    } else {
      setUrl('')
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

    if (contentType === 'm3u_player' && !url.trim()) {
      setMessage({ success: false, text: 'Pilih channel terlebih dahulu.' })
      setIsSubmitting(false)
      return
    }

    if (contentType === 'm3u_playlist' && !url.trim()) {
      setMessage({ success: false, text: 'Pilih playlist terlebih dahulu.' })
      setIsSubmitting(false)
      return
    }

    try {
      const result = await saveEntertainmentItemAction(new FormData(event.currentTarget))
      if (result) setMessage({ success: result.success, text: result.message || '' })
    } catch (err: unknown) {
      const isRedirect =
        err instanceof Error && (err.message.includes('NEXT_REDIRECT') || 'digest' in err && String((err as { digest?: string }).digest).includes('NEXT_REDIRECT'))
      if (isRedirect) {
        // Redirection error is thrown by Next.js redirect() to initiate page navigation.
        // We catch it and silently ignore to let Next.js handle the redirection.
        return
      }
      console.error('Save entertainment item error:', err)
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
          <div className="grid grid-cols-2 gap-2">
            <ModeButton active={contentType === 'webview'} label="WebView" onClick={() => changeContentType('webview')} />
            <ModeButton active={contentType === 'media_player'} label="Media" onClick={() => changeContentType('media_player')} />
            <ModeButton active={contentType === 'm3u_player'} label="M3U Channel" onClick={() => changeContentType('m3u_player')} />
            <ModeButton active={contentType === 'm3u_playlist'} label="M3U Playlist" onClick={() => changeContentType('m3u_playlist')} />
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
              <Field label="Pilih Channel">
                <select
                  value={selectedChannelId}
                  onChange={(event) => applyChannel(event.target.value)}
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

          {contentType === 'm3u_playlist' && (
            <>
              <Field label="Pilih Playlist">
                <select
                  value={selectedPlaylistId}
                  onChange={(event) => applyPlaylist(event.target.value)}
                  className="field-input"
                >
                  <option value="">Pilih playlist...</option>
                  {playlistOptions.map((playlist) => (
                    <option key={playlist.id} value={playlist.id}>
                      {playlist.name} ({playlist.totalChannels} Channels)
                    </option>
                  ))}
                </select>
              </Field>
              {playlistOptions.length === 0 && (
                <p className="text-xs text-amber-200/80 rounded-xl bg-amber-500/10 border border-amber-500/15 px-3 py-2">
                  Playlist repository masih kosong. Tambahkan playlist dari menu Playlist Repository dulu.
                </p>
              )}
            </>
          )}

          {contentType === 'webview' && (
            <Field label="URL WebView">
              <input
                name="url"
                type="text"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://..."
                className="field-input font-mono"
              />
            </Field>
          )}

          {(contentType === 'media_player' || contentType === 'm3u_player' || contentType === 'm3u_playlist') && (
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
