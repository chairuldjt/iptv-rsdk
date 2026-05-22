import prisma from '@/lib/db'
import { parseAndSavePlaylist } from '@/lib/m3uParser'
import { revalidatePath } from 'next/cache'
import ConfirmForm from '@/components/ConfirmForm'

export const revalidate = 0 // Disable cache for live playlists list

// Server Action for adding and parsing a playlist
async function uploadPlaylistAction(formData: FormData) {
  'use server'

  const name = formData.get('name') as string
  const sourceUrl = formData.get('sourceUrl') as string
  const m3uFile = formData.get('m3uFile') as File

  if (!name) return

  let m3uContent = ''

  try {
    if (m3uFile && m3uFile.size > 0) {
      // 1. Read uploaded file content
      m3uContent = await m3uFile.text()
    } else if (sourceUrl) {
      // 2. Fetch external M3U content if URL provided
      const response = await fetch(sourceUrl)
      if (response.ok) {
        m3uContent = await response.text()
      } else {
        throw new Error('Failed to fetch M3U playlist from URL')
      }
    }

    if (!m3uContent) return

    // 3. Save playlist record in DB
    const playlist = await prisma.playlist.create({
      data: {
        name,
        sourceUrl: sourceUrl || null,
      },
    })

    // 4. Parse M3U and insert channels/categories
    await parseAndSavePlaylist(playlist.id, m3uContent)

    revalidatePath('/dashboard/playlists')
    revalidatePath('/dashboard')
  } catch (error) {
    console.error('Playlist upload error:', error)
  }
}

// Server Action for deleting a playlist
async function deletePlaylistAction(formData: FormData) {
  'use server'
  
  const id = parseInt(formData.get('playlistId') as string)
  if (!id) return

  try {
    await prisma.playlist.delete({
      where: { id },
    })

    revalidatePath('/dashboard/playlists')
    revalidatePath('/dashboard')
  } catch (error) {
    console.error('Playlist deletion error:', error)
  }
}

// Server Action to set a playlist as the global active one
async function setGlobalPlaylistAction(formData: FormData) {
  'use server'
  const id = parseInt(formData.get('playlistId') as string)
  if (!id) return

  try {
    // 1. Unset any existing global playlist
    await prisma.playlist.updateMany({
      where: { isGlobal: true },
      data: { isGlobal: false },
    })

    // 2. Set the new global playlist
    await prisma.playlist.update({
      where: { id },
      data: { isGlobal: true },
    })

    revalidatePath('/dashboard/playlists')
    revalidatePath('/dashboard')
  } catch (error) {
    console.error('Set global playlist error:', error)
  }
}

export default async function PlaylistsPage() {
  // Fetch existing playlists
  const playlists = await prisma.playlist.findMany({
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white">Playlists Manager</h2>
        <p className="text-slate-400 mt-1 text-sm">Upload local M3U files or sync with external IPTV server URLs to populate channels.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload Form Card */}
        <div className="lg:col-span-1 glass-card p-6 rounded-2xl border border-border h-fit">
          <h3 className="font-bold text-white text-lg mb-4">Add Playlist</h3>
          
          <form action={uploadPlaylistAction} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Playlist Name</label>
              <input
                type="text"
                name="name"
                required
                placeholder="e.g. National Premium TV"
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">M3U File Upload</label>
              <input
                type="file"
                name="m3uFile"
                accept=".m3u,.m3u8"
                className="w-full text-slate-400 text-xs file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-indigo-400 file:hover:bg-slate-700/50 cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-2 py-1">
              <div className="h-px flex-1 bg-border/60"></div>
              <span className="text-[10px] text-slate-500 font-bold uppercase">OR</span>
              <div className="h-px flex-1 bg-border/60"></div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">External M3U URL</label>
              <input
                type="url"
                name="sourceUrl"
                placeholder="http://example.com/playlist.m3u8"
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-3 rounded-xl bg-primary hover:bg-indigo-500 font-bold text-white text-sm transition-all duration-200 cursor-pointer text-center glow-indigo"
            >
              Parse & Save Playlist
            </button>
          </form>
        </div>

        {/* Playlists Table/List Card */}
        <div className="lg:col-span-2 glass-card rounded-2xl border border-border overflow-hidden">
          <div className="px-6 py-5 border-b border-border">
            <h3 className="font-bold text-white text-lg">Parsed Playlists ({playlists.length})</h3>
          </div>

          <div className="divide-y divide-border/60">
            {playlists.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm">
                No playlists parsed yet. Fill the upload form on the left to add your first playlist!
              </div>
            ) : (
              playlists.map((p) => (
                <div key={p.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-800/10 transition-all">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-white text-base">{p.name}</h4>
                      {p.isGlobal && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                          Global Active
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                      <span>Channels: <strong className="text-violet-400">{p.totalChannels} channels</strong></span>
                      <span>•</span>
                      <span>Uploaded: {new Date(p.createdAt).toLocaleDateString()}</span>
                    </div>
                    {p.sourceUrl && (
                      <p className="text-[10px] text-slate-500 break-all font-mono">URL: {p.sourceUrl}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 self-end md:self-center">
                    {!p.isGlobal && (
                      <form action={setGlobalPlaylistAction}>
                        <input type="hidden" name="playlistId" value={p.id} />
                        <button
                          type="submit"
                          className="px-4 py-2 text-xs font-bold text-emerald-400 hover:text-white border border-emerald-500/20 hover:bg-emerald-500/15 rounded-xl transition-all cursor-pointer"
                        >
                          Set as Global
                        </button>
                      </form>
                    )}

                    {/* Delete Form */}
                    <ConfirmForm
                      action={deletePlaylistAction}
                      message="Are you sure you want to delete this playlist? This will instantly delete all categories and channels tied to it."
                    >
                      <input type="hidden" name="playlistId" value={p.id} />
                      <button
                        type="submit"
                        className="px-4 py-2 text-xs font-semibold text-rose-400 hover:text-white border border-rose-500/20 hover:bg-rose-500/15 rounded-xl transition-all cursor-pointer"
                      >
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
