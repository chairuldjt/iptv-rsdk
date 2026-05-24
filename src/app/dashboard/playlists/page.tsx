import prisma from '@/lib/db'
import { parseAndSavePlaylist } from '@/lib/m3uParser'
import { revalidatePath } from 'next/cache'
import ConfirmForm from '@/components/ConfirmForm'
import PageHeader from '@/components/PageHeader'

export const revalidate = 0

async function uploadPlaylistAction(formData: FormData) {
  'use server'
  const name = formData.get('name') as string
  const sourceUrl = formData.get('sourceUrl') as string
  const m3uFile = formData.get('m3uFile') as File
  if (!name) return
  let m3uContent = ''
  try {
    if (m3uFile && m3uFile.size > 0) {
      m3uContent = await m3uFile.text()
    } else if (sourceUrl) {
      const response = await fetch(sourceUrl)
      if (response.ok) m3uContent = await response.text()
      else throw new Error('Failed to fetch M3U playlist from URL')
    }
    if (!m3uContent) return
    const playlist = await prisma.playlist.create({ data: { name, sourceUrl: sourceUrl || null } })
    await parseAndSavePlaylist(playlist.id, m3uContent)
    revalidatePath('/dashboard/playlists')
    revalidatePath('/dashboard')
  } catch (error) {
    console.error('Playlist upload error:', error)
  }
}

async function deletePlaylistAction(formData: FormData) {
  'use server'
  const id = parseInt(formData.get('playlistId') as string)
  if (!id) return
  try {
    await prisma.playlist.delete({ where: { id } })
    revalidatePath('/dashboard/playlists')
    revalidatePath('/dashboard')
  } catch (error) {
    console.error('Playlist deletion error:', error)
  }
}

async function setGlobalPlaylistAction(formData: FormData) {
  'use server'
  const id = parseInt(formData.get('playlistId') as string)
  if (!id) return
  try {
    await prisma.playlist.updateMany({ where: { isGlobal: true }, data: { isGlobal: false } })
    await prisma.playlist.update({ where: { id }, data: { isGlobal: true } })
    revalidatePath('/dashboard/playlists')
    revalidatePath('/dashboard')
  } catch (error) {
    console.error('Set global playlist error:', error)
  }
}

export default async function PlaylistsPage() {
  const playlists = await prisma.playlist.findMany({ orderBy: { createdAt: 'desc' } })

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Playlists Manager"
        description="Upload local M3U files or sync with external IPTV server URLs to populate channels."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Form */}
        <div className="lg:col-span-1 card p-5 rounded-2xl h-fit space-y-4">
          <h3 className="font-semibold text-foreground text-sm">Add Playlist</h3>
          <form action={uploadPlaylistAction} className="space-y-4">
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Playlist Name</label>
              <input type="text" name="name" required placeholder="e.g. National Premium TV" className="field-input" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">M3U File Upload</label>
              <input type="file" name="m3uFile" accept=".m3u,.m3u8" className="file-input" />
            </div>
            <div className="flex items-center gap-2 py-1">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">OR</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">External M3U URL</label>
              <input type="url" name="sourceUrl" placeholder="http://example.com/playlist.m3u8" className="field-input" />
            </div>
            <button type="submit" className="w-full btn btn-primary py-2.5">
              Parse & Save Playlist
            </button>
          </form>
        </div>

        {/* Playlists List */}
        <div className="lg:col-span-2 card rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-semibold text-foreground text-sm">Parsed Playlists ({playlists.length})</h3>
          </div>
          <div className="divide-y divide-border/50">
            {playlists.length === 0 ? (
              <div className="px-5 py-16 text-center text-xs text-muted-foreground">
                No playlists parsed yet. Fill the upload form on the left to add your first playlist!
              </div>
            ) : (
              playlists.map((p) => (
                <div key={p.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-accent/30 transition-colors">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-2">
                      <h4 className="font-semibold text-foreground text-sm truncate">{p.name}</h4>
                      {p.isGlobal && <span className="badge badge-success">Global Active</span>}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span>Channels: <strong className="text-violet-400 font-semibold">{p.totalChannels} channels</strong></span>
                      <span className="text-border">·</span>
                      <span>Uploaded: {new Date(p.createdAt).toLocaleDateString()}</span>
                    </div>
                    {p.sourceUrl && (
                      <p className="text-[10px] text-muted-foreground break-all font-mono">URL: {p.sourceUrl}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                    {!p.isGlobal && (
                      <form action={setGlobalPlaylistAction}>
                        <input type="hidden" name="playlistId" value={p.id} />
                        <button type="submit" className="btn btn-xs text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/10">
                          Set as Global
                        </button>
                      </form>
                    )}
                    <ConfirmForm
                      action={deletePlaylistAction}
                      message="Are you sure you want to delete this playlist? This will instantly delete all categories and channels tied to it."
                    >
                      <input type="hidden" name="playlistId" value={p.id} />
                      <button type="submit" className="btn btn-xs text-rose-400 hover:text-rose-300 border border-rose-500/20 hover:bg-rose-500/10">
                        Delete Playlist
                      </button>
                    </ConfirmForm>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
