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
        title="App Version Control"
        description="Upload new Android client APK binaries, write release notes, and deploy OTA updates to connected STB devices."
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
                  <p className="text-muted-foreground text-[10px] mt-1 font-mono">File: {deployedUpdate.apkFileName}</p>
                  {deployedUpdate.changelog && (
                    <div className="mt-3 bg-background/60 p-3 rounded-xl border border-border max-w-lg">
                      <span className="text-[9px] uppercase font-semibold text-muted-foreground">Changelog:</span>
                      <p className="text-foreground/80 text-xs whitespace-pre-line mt-1 font-medium">{deployedUpdate.changelog}</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-3 self-end md:self-center shrink-0">
                  <div className="text-[10px] text-right font-semibold text-muted-foreground font-mono">
                    Deployed: {new Date(deployedUpdate.updatedAt).toLocaleDateString()}
                  </div>
                  <a href={createApkDownloadUrl(deployedUpdate.apkFileName)} download={deployedUpdate.apkFileName}
                    className="btn btn-xs text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/10">
                    Download APK
                  </a>
                </div>
              </div>

              <div className="card rounded-2xl p-5 border border-sky-500/20 bg-sky-500/5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="badge badge-primary">Short Download Link</span>
                    <h4 className="font-semibold text-foreground text-sm mt-2">Selalu ke APK terbaru</h4>
                    <p className="text-[11px] text-muted-foreground mt-1">Link ini otomatis mengunduh versi deployed terbaru.</p>
                  </div>
                  <CopyDownloadLinkButton url={latestApkUrl} />
                </div>
                <a
                  href="/iptv.apk"
                  className="mt-4 block rounded-xl border border-border bg-background/70 px-3 py-3 text-[11px] font-mono text-sky-300 break-all hover:border-sky-500/30 hover:bg-sky-500/5 transition-colors"
                >
                  {latestApkUrl}
                </a>
              </div>
            </div>
          )}

          <div className="card rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground text-sm">Upload History ({updates.length})</h3>
            </div>
            <div className="divide-y divide-border/50">
              {updates.length === 0 ? (
                <div className="px-5 py-16 text-center text-xs text-muted-foreground">
                  No app updates uploaded yet. Fill the upload form on the left to push your first APK release!
                </div>
              ) : (
                updates.map((u) => (
                  <div key={u.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-accent/30 transition-colors">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-2">
                        <h4 className="font-semibold text-foreground text-xs">v{u.versionName} <span className="text-primary font-mono text-[10px]">(Code {u.versionCode})</span></h4>
                        {u.isDeployed ? <span className="badge badge-primary">Active</span> : <span className="badge badge-muted">Draft</span>}
                        {u.isMandatory && <span className="badge badge-destructive">Mandatory</span>}
                      </div>
                      <p className="text-[10px] text-muted-foreground font-mono leading-relaxed truncate">Filename: {u.apkFileName}</p>
                      {u.changelog && <p className="text-xs text-muted-foreground line-clamp-1 italic">Notes: {u.changelog}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      <a href={createApkDownloadUrl(u.apkFileName)} download={u.apkFileName}
                        className="btn btn-xs text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/10">Download</a>
                      {!u.isDeployed && (
                        <form action={deployUpdateAction}>
                          <input type="hidden" name="updateId" value={u.id} />
                          <button type="submit" className="btn btn-xs text-primary border border-primary/20 hover:bg-primary/10">Deploy Version</button>
                        </form>
                      )}
                      <ConfirmForm action={deleteUpdateAction} message="Are you sure you want to delete this version? This will permanently delete the binary file from server disk.">
                        <input type="hidden" name="updateId" value={u.id} />
                        <button type="submit" className="btn btn-xs text-rose-400 border border-rose-500/20 hover:bg-rose-500/10">Delete</button>
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
