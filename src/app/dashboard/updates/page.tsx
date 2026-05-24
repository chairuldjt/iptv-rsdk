import prisma from '@/lib/db'
import ConfirmForm from '@/components/ConfirmForm'
import UploadApkForm from '@/components/UploadApkForm'
import { deployUpdateAction, deleteUpdateAction } from './actions'

export const revalidate = 0 // Disable cache for live updates list

export default async function UpdatesPage() {
  const updates = await prisma.appUpdate.findMany({
    orderBy: { versionCode: 'desc' }
  })

  const deployedUpdate = updates.find(u => u.isDeployed)

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white">App Version Control</h2>
        <p className="text-slate-400 mt-1 text-sm">Upload new Android client APK binaries, write release notes, and deploy OTA updates to connected STB devices.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload APK Card */}
        <UploadApkForm />

        {/* History & Active Deployment Card */}
        <div className="lg:col-span-2 space-y-6">
          {deployedUpdate && (
            <div className="p-5 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold uppercase tracking-wider shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                  Active OTA Version
                </span>
                <h4 className="font-extrabold text-white text-xl mt-2">v{deployedUpdate.versionName} <span className="text-indigo-400 font-mono text-sm">({deployedUpdate.versionCode})</span></h4>
                <p className="text-slate-400 text-xs mt-1">File: <span className="font-mono text-[11px] text-slate-300">{deployedUpdate.apkFileName}</span></p>
                {deployedUpdate.changelog && (
                  <div className="mt-2 bg-slate-950/40 p-3 rounded-xl border border-border/40 max-w-lg">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Changelog:</span>
                    <p className="text-slate-300 text-xs whitespace-pre-line mt-1">{deployedUpdate.changelog}</p>
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-3 self-end md:self-center">
                <div className="text-xs text-right font-semibold text-slate-400">
                  Deployed: {new Date(deployedUpdate.updatedAt).toLocaleDateString()}
                </div>
                <a
                  href={createApkDownloadUrl(deployedUpdate.apkFileName)}
                  download={deployedUpdate.apkFileName}
                  className="px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 hover:text-emerald-300 text-xs font-bold transition-all"
                >
                  Download APK
                </a>
              </div>
            </div>
          )}

          <div className="glass-card rounded-2xl border border-border overflow-hidden">
            <div className="px-6 py-5 border-b border-border">
              <h3 className="font-bold text-white text-lg">Upload History ({updates.length})</h3>
            </div>

            <div className="divide-y divide-border/60">
              {updates.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-sm">
                  No app updates uploaded yet. Fill the upload form on the left to push your first APK release!
                </div>
              ) : (
                updates.map((u) => (
                  <div key={u.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-800/10 transition-all">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-white text-base">v{u.versionName} <span className="text-indigo-400 font-mono text-xs">(Code {u.versionCode})</span></h4>
                        {u.isDeployed ? (
                          <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 text-[9px] font-bold uppercase tracking-wider">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[9px] font-bold uppercase tracking-wider border border-slate-700/60">
                            Draft
                          </span>
                        )}
                        {u.isMandatory && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[9px] font-bold uppercase tracking-wider">
                            Mandatory
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono leading-relaxed">Filename: {u.apkFileName}</p>
                      {u.changelog && (
                        <p className="text-xs text-slate-500 line-clamp-1 italic">Notes: {u.changelog}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 self-end md:self-center">
                      <a
                        href={createApkDownloadUrl(u.apkFileName)}
                        download={u.apkFileName}
                        className="px-4 py-2 text-xs font-bold text-emerald-400 hover:text-white border border-emerald-500/20 hover:bg-emerald-500/15 rounded-xl transition-all"
                      >
                        Download
                      </a>

                      {!u.isDeployed && (
                        <form action={deployUpdateAction}>
                          <input type="hidden" name="updateId" value={u.id} />
                          <button
                            type="submit"
                            className="px-4 py-2 text-xs font-bold text-indigo-400 hover:text-white border border-indigo-500/20 hover:bg-indigo-500/15 rounded-xl transition-all cursor-pointer"
                          >
                            Deploy Version
                          </button>
                        </form>
                      )}

                      {/* Delete Form */}
                      <ConfirmForm
                        action={deleteUpdateAction}
                        message="Are you sure you want to delete this version? This will permanently delete the binary file from server disk."
                      >
                        <input type="hidden" name="updateId" value={u.id} />
                        <button
                          type="submit"
                          className="px-4 py-2 text-xs font-semibold text-rose-400 hover:text-white border border-rose-500/20 hover:bg-rose-500/15 rounded-xl transition-all cursor-pointer"
                        >
                          Delete
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
    </div>
  )
}

function createApkDownloadUrl(fileName: string) {
  return `/uploads/apk/${encodeURIComponent(fileName)}`
}
