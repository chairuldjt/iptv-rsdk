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
import PlaylistsClient from './PlaylistsClient'

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
        description="Upload file M3U lokal atau sinkron dengan URL server IPTV eksternal untuk mengisi channel."
        actions={
          <PlaylistsClient uploadPlaylistAction={uploadPlaylistAction} />
        }
      />

      {showRelaySaved && (
        <div className="alert-banner alert-banner-success">
          <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Pengaturan relay playlist berhasil disimpan.
        </div>
      )}
      {showRelayToggled && (
        <div className="alert-banner alert-banner-info">
          <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Status relay playlist berhasil diperbarui.
        </div>
      )}

      {/* Playlists List */}
      <div className="section-card">
        <div className="section-card-header flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm text-foreground">Daftar Playlist</h3>
            <p className="mt-0.5 text-[0.6875rem] text-muted-foreground">{playlists.length} playlist tersimpan</p>
          </div>
        </div>
        <div className={playlists.length > 0 ? 'divide-y divide-border/50' : ''}>
          {playlists.length === 0 ? (
            <div className="section-card-body flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
                </svg>
              </div>
              <p className="text-xs font-semibold text-foreground">Belum ada playlist</p>
              <p className="text-[0.6875rem] text-muted-foreground mt-1">Klik &quot;Tambah Playlist&quot; untuk menambahkan playlist pertama.</p>
            </div>
          ) : (
            playlists.map((p) => {
              const relaySettings = getPlaylistRelaySettingsFromValue(p.relayEnabled, p.relayConfig)

              return (
                <div key={p.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-accent/30 transition-colors">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-2">
                      <h4 className="font-semibold text-foreground text-sm truncate">{p.name}</h4>
                      {p.isGlobal && <span className="badge badge-success">Global</span>}
                      {relaySettings.enabled && <span className="badge badge-warning">Relay Aktif</span>}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span>Channel: <strong className="text-violet-400 font-semibold">{p.totalChannels} channel</strong></span>
                      <span className="text-border">·</span>
                      <span>Upload: {new Date(p.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                    {p.sourceUrl && (
                      <p className="text-[0.625rem] text-muted-foreground break-all font-mono">URL: {p.sourceUrl}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap self-end md:self-center">
                    {!p.isGlobal && (
                      <form action={setGlobalPlaylistAction}>
                        <input type="hidden" name="playlistId" value={p.id} />
                        <button type="submit" className="btn btn-xs text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/10 rounded-lg">
                          Set Global
                        </button>
                      </form>
                    )}
                    <form action={togglePlaylistRelayAction}>
                      <input type="hidden" name="playlistId" value={p.id} />
                      <input type="hidden" name="nextEnabled" value={relaySettings.enabled ? 'false' : 'true'} />
                      <button type="submit" className={`btn btn-xs rounded-lg border ${relaySettings.enabled ? 'text-amber-300 border-amber-500/20 hover:bg-amber-500/10' : 'text-sky-300 border-sky-500/20 hover:bg-sky-500/10'}`}>
                        {relaySettings.enabled ? 'Nonaktifkan Relay' : 'Aktifkan Relay'}
                      </button>
                    </form>
                    <a href={`/dashboard/playlists?relay=${p.id}`} className="btn btn-xs text-primary border border-primary/20 hover:bg-primary/10 rounded-lg">
                      Pengaturan Relay
                    </a>
                    <ConfirmForm
                      action={deletePlaylistAction}
                      message="Menghapus playlist akan menghapus semua kategori dan channel terkait. Data yang dihapus tidak dapat dikembalikan."
                      confirmLabel="Hapus"
                      successToast="Playlist berhasil dihapus."
                    >
                      <input type="hidden" name="playlistId" value={p.id} />
                      <button type="submit" className="btn btn-xs text-rose-400 hover:text-rose-300 border border-rose-500/20 hover:bg-rose-500/10 rounded-lg">
                        Hapus
                      </button>
                    </ConfirmForm>
                  </div>
                </div>
              )
            })
          )}
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
