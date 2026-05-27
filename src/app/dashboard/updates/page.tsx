import prisma from '@/lib/db'
import ConfirmForm from '@/components/ConfirmForm'
import UploadApkForm from '@/components/UploadApkForm'
import PageHeader from '@/components/PageHeader'
import CopyDownloadLinkButton from '@/components/CopyDownloadLinkButton'
import { deployUpdateAction, deleteUpdateAction } from './actions'
import { headers } from 'next/headers'
import { resolvePublicOriginFromHeaders } from '@/lib/publicOrigin'

export const revalidate = 0

export default async function UpdatesPage() {
  const updates = await prisma.appUpdate.findMany({ orderBy: { versionCode: 'desc' } })
  const deployedUpdate = updates.find(u => u.isDeployed)
  const requestHeaders = await headers()
  const latestApkUrl = createLatestApkUrl(await resolvePublicOriginFromHeaders(requestHeaders))

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Version Control"
        description="Upload APK Android client baru, tulis changelog, dan deploy update OTA ke perangkat STB."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <UploadApkForm />

        <div className="lg:col-span-2 space-y-6">
          {deployedUpdate && (
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-4">
              <div className="p-5 rounded-2xl bg-primary/10 border border-primary/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <span className="badge badge-success">Active OTA Version</span>
                  <h4 className="font-bold text-foreground text-lg mt-2">v{deployedUpdate.versionName} <span className="text-primary font-mono text-xs">({deployedUpdate.versionCode})</span></h4>
                  <p className="text-muted-foreground text-[0.625rem] mt-1 font-mono">File: {deployedUpdate.apkFileName}</p>
                  {deployedUpdate.changelog && (
                    <div className="mt-3 bg-background/60 p-3 rounded-xl border border-border max-w-lg">
                      <span className="text-[0.5625rem] uppercase font-semibold text-muted-foreground">Changelog:</span>
                      <p className="text-foreground/80 text-xs whitespace-pre-line mt-1 font-medium">{deployedUpdate.changelog}</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-3 self-end md:self-center shrink-0">
                  <div className="text-[0.625rem] text-right font-semibold text-muted-foreground font-mono">
                    Deploy: {new Date(deployedUpdate.updatedAt).toLocaleDateString('id-ID')}
                  </div>
                  <a href={createApkDownloadUrl(deployedUpdate.apkFileName)} download={deployedUpdate.apkFileName}
                    className="btn btn-xs text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/10 rounded-lg">
                    Download APK
                  </a>
                </div>
              </div>

              <div className="section-card-section border-sky-500/20 bg-sky-500/5 p-5 rounded-2xl border">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="badge badge-primary">Short Link</span>
                    <h4 className="font-semibold text-foreground text-sm mt-2">Selalu ke APK terbaru</h4>
                    <p className="text-[0.6875rem] text-muted-foreground mt-1">Link ini otomatis mengunduh versi deployed terbaru.</p>
                  </div>
                  <CopyDownloadLinkButton url={latestApkUrl} />
                </div>
                <a
                  href="/iptv.apk"
                  className="mt-4 block rounded-xl border border-border bg-background/70 px-3 py-3 text-[0.6875rem] font-mono text-sky-300 break-all hover:border-sky-500/30 hover:bg-sky-500/5 transition-colors"
                >
                  {latestApkUrl}
                </a>
              </div>
            </div>
          )}

          <div className="section-card">
            <div className="section-card-header">
              <h3 className="font-semibold text-sm text-foreground">Riwayat Upload ({updates.length})</h3>
            </div>
            <div className={updates.length > 0 ? 'divide-y divide-border/50' : ''}>
              {updates.length === 0 ? (
                <div className="section-card-body flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                  </div>
                  <p className="text-xs font-semibold text-foreground">Belum ada update</p>
                  <p className="text-[0.6875rem] text-muted-foreground mt-1">Upload APK pertama Anda melalui form di samping.</p>
                </div>
              ) : (
                updates.map((u) => (
                  <div key={u.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-2">
                        <h4 className="font-semibold text-foreground text-xs">v{u.versionName} <span className="text-primary font-mono text-[0.625rem]">(Code {u.versionCode})</span></h4>
                        {u.isDeployed ? <span className="badge badge-primary">Active</span> : <span className="badge badge-muted">Draft</span>}
                        {u.isMandatory && <span className="badge badge-destructive">Mandatory</span>}
                      </div>
                      <p className="text-[0.625rem] text-muted-foreground font-mono truncate">File: {u.apkFileName}</p>
                      {u.changelog && <p className="text-xs text-muted-foreground line-clamp-1 italic">Changelog: {u.changelog}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center flex-wrap">
                      <a href={createApkDownloadUrl(u.apkFileName)} download={u.apkFileName}
                        className="btn btn-xs text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/10 rounded-lg">Download</a>
                      {!u.isDeployed && (
                        <form action={deployUpdateAction}>
                          <input type="hidden" name="updateId" value={u.id} />
                          <button type="submit" className="btn btn-xs text-primary border border-primary/20 hover:bg-primary/10 rounded-lg">Deploy</button>
                        </form>
                      )}
                      <ConfirmForm
                        action={deleteUpdateAction}
                        title="Hapus Versi"
                        description="File APK akan dihapus permanen dari server."
                        message={`Hapus versi ${u.versionName}? File binary akan dihapus permanen.`}
                        confirmLabel="Hapus"
                      >
                        <input type="hidden" name="updateId" value={u.id} />
                        <button type="submit" className="btn btn-xs text-rose-400 border border-rose-500/20 hover:bg-rose-500/10 rounded-lg">Hapus</button>
                      </ConfirmForm>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function createApkDownloadUrl(fileName: string) {
  return `/uploads/apk/${encodeURIComponent(fileName)}`
}

function createLatestApkUrl(appPublicOrigin: string) {
  return appPublicOrigin ? `${appPublicOrigin}/iptv.apk` : '/iptv.apk'
}
