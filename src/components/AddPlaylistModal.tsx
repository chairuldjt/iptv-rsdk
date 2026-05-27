'use client'

import React, { useTransition } from 'react'
import Modal from './Modal'
import Button from './Button'
import { useToast } from './Toast'

interface AddPlaylistModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  uploadPlaylistAction: (formData: FormData) => Promise<void>
}

export default function AddPlaylistModal({ open, onOpenChange, uploadPlaylistAction }: AddPlaylistModalProps) {
  const [isPending, startTransition] = useTransition()
  const { showToast } = useToast()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        await uploadPlaylistAction(fd)
        showToast('success', 'Playlist berhasil ditambahkan.')
        onOpenChange(false)
        e.currentTarget.reset()
      } catch {
        showToast('error', 'Gagal menambahkan playlist.')
      }
    })
  }

  return (
    <Modal open={open} onClose={() => onOpenChange(false)} title="Tambah Playlist" description="Upload file M3U lokal atau sinkron dengan URL eksternal." size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="form-group">
          <label>Nama Playlist</label>
          <input type="text" name="name" required placeholder="Misal: National Premium TV" className="field-input" />
        </div>

        <div className="form-group">
          <label>Upload File M3U</label>
          <input type="file" name="m3uFile" accept=".m3u,.m3u8" className="file-input" />
          <p className="form-hint">Mendukung file .m3u dan .m3u8</p>
        </div>

        <div className="flex items-center gap-3 py-1">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[0.5625rem] font-semibold text-muted-foreground uppercase tracking-wider">Atau</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="form-group">
          <label>URL M3U Eksternal</label>
          <input type="url" name="sourceUrl" placeholder="https://example.com/playlist.m3u8" className="field-input" />
        </div>

        <label className="flex items-center gap-3 cursor-pointer p-3 bg-accent/30 border border-border rounded-xl hover:bg-accent/50 transition-colors">
          <input type="checkbox" name="relayEnabled" className="w-4 h-4 rounded accent-primary" />
          <span>
            <span className="text-xs font-semibold text-foreground block">Aktifkan On-Demand Relay</span>
            <span className="text-[0.625rem] text-muted-foreground">Playlist ini langsung siap memakai relay UDP on-demand dengan fallback ke setting global.</span>
          </span>
        </label>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" disabled={isPending} onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button type="submit" variant="primary" loading={isPending}>
            Parse & Simpan
          </Button>
        </div>
      </form>
    </Modal>
  )
}
