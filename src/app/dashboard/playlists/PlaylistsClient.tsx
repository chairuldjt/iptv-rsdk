'use client'

import React, { useState } from 'react'
import Button from '@/components/Button'
import AddPlaylistModal from '@/components/AddPlaylistModal'

interface PlaylistsClientProps {
  uploadPlaylistAction: (formData: FormData) => Promise<void>
}

export default function PlaylistsClient({ uploadPlaylistAction }: PlaylistsClientProps) {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Tambah Playlist
      </Button>
      <AddPlaylistModal
        open={showModal}
        onOpenChange={setShowModal}
        uploadPlaylistAction={uploadPlaylistAction}
      />
    </>
  )
}
