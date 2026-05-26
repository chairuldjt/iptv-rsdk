import prisma from '@/lib/db'
import { parseAndSavePlaylist } from '@/lib/m3uParser'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import ConfirmForm from '@/components/ConfirmForm'
import PageHeader from '@/components/PageHeader'
import PlaylistRelaySettingsModal from '@/components/PlaylistRelaySettingsModal'
import { getOnDemandHlsRelayConfig } from '@/lib/settings'
import {
  getPlaylistRelaySettingsFromValue,
  playlistRelayConfigFromFormData,
  serializePlaylistRelayConfig,
} from '@/lib/playlistRelay'

export const revalidate = 0

async function uploadPlaylistAction(formData: FormData) {
  'use server'
  const name = formData.get('name') as string
  const sourceUrl = formData.get('sourceUrl') as string
  const m3uFile = formData.get('m3uFile') as File
  const relayEnabled = formData.get('relayEnabled') === 'on'
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
    const playlist = await prisma.playlist.create({
      data: {
        name,
        sourceUrl: sourceUrl || null,
        relayEnabled,
      },
    })
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

async function togglePlaylistRelayAction(formData: FormData) {
  'use server'
  const playlistId = Number.parseInt(formData.get('playlistId') as string, 10)
  const nextEnabled = formData.get('nextEnabled') === 'true'
  if (!Number.isInteger(playlistId) || playlistId <= 0) return

  await prisma.playlist.update({
    where: { id: playlistId },
    data: {
      relayEnabled: nextEnabled,
    },
  })

  revalidatePath('/dashboard/playlists')
  redirect('/dashboard/playlists?relayToggled=1')
}

async function savePlaylistRelaySettingsAction(formData: FormData) {
  'use server'
  const playlistId = Number.parseInt(formData.get('playlistId') as string, 10)
  if (!Number.isInteger(playlistId) || playlistId <= 0) return

  const relaySettings = playlistRelayConfigFromFormData(formData)

  await prisma.playlist.update({
    where: { id: playlistId },
    data: {
      relayEnabled: relaySettings.enabled,
      relayConfig: serializePlaylistRelayConfig(relaySettings.config),
    },
  })

  revalidatePath('/dashboard/playlists')
  redirect('/dashboard/playlists?relaySaved=1')
}

export default async function PlaylistsPage({
  searchParams,
}: {
  searchParams: Promise<{ relay?: string; relaySaved?: string; relayToggled?: string }>
}) {
  const playlists = await prisma.playlist.findMany({ orderBy: { createdAt: 'desc' } })
  const relayGlobalConfig = await getOnDemandHlsRelayConfig()
  const resolvedSearchParams = await searchParams
  const editingRelayId = resolvedSearchParams.relay ? Number.parseInt(resolvedSearchParams.relay, 10) : null
  const editingPlaylist = editingRelayId ? playlists.find((playlist) => playlist.id === editingRelayId) ?? null : null
  const showRelaySaved = resolvedSearchParams.relaySaved === '1'
  const showRelayToggled = resolvedSearchParams.relayToggled === '1'

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Playlists Manager"
        description="Upload local M3U files or sync with external IPTV server URLs to populate channels."
      />

      {showRelaySaved && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          Playlist relay settings berhasil disimpan.
        </div>
      )}
      {showRelayToggled && (
        <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
          Status relay playlist berhasil diperbarui.
        </div>
      )}

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
            <label className="flex items-center gap-3 cursor-pointer p-3 bg-accent/30 border border-border rounded-xl hover:bg-accent/50 transition-colors">
              <input type="checkbox" name="relayEnabled" className="w-4 h-4 rounded accent-primary" />
              <span>
                <span className="text-xs font-semibold text-foreground block">Enable On-Demand Relay</span>
                <span className="text-[10px] text-muted-foreground">Playlist ini langsung siap memakai relay UDP on-demand dengan fallback ke setting global.</span>
              </span>
            </label>
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
              playlists.map((p) => {
                const relaySettings = getPlaylistRelaySettingsFromValue(p.relayEnabled, p.relayConfig)

                return (
                  <div key={p.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-accent/30 transition-colors">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-2">
                        <h4 className="font-semibold text-foreground text-sm truncate">{p.name}</h4>
                        {p.isGlobal && <span className="badge badge-success">Global Active</span>}
                        {relaySettings.enabled && <span className="badge badge-warning">Relay Enabled</span>}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        <span>Channels: <strong className="text-violet-400 font-semibold">{p.totalChannels} channels</strong></span>
                        <span className="text-border">·</span>
                        <span>Uploaded: {new Date(p.createdAt).toLocaleDateString()}</span>
                      </div>
                      {p.sourceUrl && (
                        <p className="text-[10px] text-muted-foreground break-all font-mono">URL: {p.sourceUrl}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground">
                        Relay override:
                        {' '}
                        {Object.keys(relaySettings.config).length > 0 ? `${Object.keys(relaySettings.config).length} field custom` : 'ikut global default'}
                      </p>
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
                      <form action={togglePlaylistRelayAction}>
                        <input type="hidden" name="playlistId" value={p.id} />
                        <input type="hidden" name="nextEnabled" value={relaySettings.enabled ? 'false' : 'true'} />
                        <button type="submit" className={`btn btn-xs border ${relaySettings.enabled ? 'text-amber-300 border-amber-500/20 hover:bg-amber-500/10' : 'text-sky-300 border-sky-500/20 hover:bg-sky-500/10'}`}>
                          {relaySettings.enabled ? 'Disable Relay' : 'Enable Relay'}
                        </button>
                      </form>
                      <a href={`/dashboard/playlists?relay=${p.id}`} className="btn btn-xs text-primary border border-primary/20 hover:bg-primary/10">
                        Relay Settings
                      </a>
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
                )
              })
            )}
          </div>
        </div>
      </div>

      {editingPlaylist && (
        <PlaylistRelaySettingsModal
          playlist={{
            id: editingPlaylist.id,
            name: editingPlaylist.name,
          }}
          settings={getPlaylistRelaySettingsFromValue(editingPlaylist.relayEnabled, editingPlaylist.relayConfig)}
          globalConfig={relayGlobalConfig}
          showSuccess={showRelaySaved}
          savePlaylistRelaySettingsAction={savePlaylistRelaySettingsAction}
        />
      )}
    </div>
  )
}
