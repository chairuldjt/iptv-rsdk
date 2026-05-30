'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import ConfirmForm from '@/components/ConfirmForm'
import AssignModal from '@/components/AssignModal'
import type { AssignTarget } from '@/components/AssignModal'
import type { HomeExperienceProfile } from '@/lib/homeExperience'

export default function ExperienceProfileCard({
  profile,
  isGlobal,
  assignedGroups,
  assignedDeviceCount,
  deleteProfileAction,
  setGlobalAction,
  cloneProfileAction,
  renameProfileAction,
  exportProfileAction,
  toggleLockAction,
  toggleEnabledAction,
  unsetGlobalAction,
  groups,
  devices,
  onAssignGroup,
  onAssignDevice,
}: {
  profile: HomeExperienceProfile
  isGlobal: boolean
  assignedGroups: Array<{ id: string; name: string; color: string }>
  assignedDeviceCount: number
  deleteProfileAction: (fd: FormData) => Promise<void>
  setGlobalAction: (fd: FormData) => Promise<void>
  cloneProfileAction: (fd: FormData) => Promise<void>
  renameProfileAction: (fd: FormData) => Promise<void>
  exportProfileAction: (fd: FormData) => Promise<void>
  toggleLockAction: (fd: FormData) => Promise<void>
  toggleEnabledAction: (fd: FormData) => Promise<void>
  unsetGlobalAction: (fd: FormData) => Promise<void>
  groups: AssignTarget[]
  devices: AssignTarget[]
  onAssignGroup: (profileId: string, groupId: string, assign: boolean) => Promise<unknown>
  onAssignDevice: (profileId: string, deviceId: string, assign: boolean) => Promise<unknown>
}) {
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)

  return (
    <>
      <div className={`card rounded-2xl overflow-hidden ${isGlobal ? 'ring-2 ring-primary/30' : ''}`}>
        <div className="px-5 py-4 flex items-center justify-between gap-3 border-b border-border">
          <div className="flex items-center gap-3 min-w-0">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm ${
            profile.enabled === false
              ? 'bg-muted border border-border text-muted-foreground opacity-50'
              : isGlobal ? 'bg-primary/15 border border-primary/20 text-primary' : 'bg-accent/30 border border-border text-muted-foreground'
          }`}>
            {isGlobal ? '🌐' : '📋'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-sm font-semibold text-foreground truncate ${profile.enabled === false ? 'opacity-50' : ''}`}>{profile.name}</span>
              {isGlobal && <span className="badge badge-primary shrink-0">Global Base</span>}
              {profile.locked && (
                <span className="badge badge-warning shrink-0 text-[9px]">Locked</span>
              )}
              {profile.enabled === false && <span className="badge badge-secondary shrink-0 text-[9px]">Disabled</span>}
            </div>
              {profile.description && (
                <p className="text-[10px] text-muted-foreground truncate">{profile.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Assign Modal Trigger */}
            <button
              onClick={() => setAssignModalOpen(true)}
              className="btn btn-xs border border-border text-muted-foreground hover:text-foreground hover:bg-accent/50"
            >
              Assign
            </button>

            <a
              href={`/dashboard/experience?edit=${encodeURIComponent(profile.id)}`}
              className="btn btn-xs border border-primary/20 text-primary hover:bg-primary/10"
            >
              Edit Config
            </a>

            {/* Rename */}
            <button
              onClick={() => setRenameOpen(true)}
              className="p-1.5 text-sky-400 hover:text-sky-300 border border-sky-500/10 hover:bg-sky-500/10 rounded-lg transition-all"
              title="Rename Profile"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
            </button>

            {/* Clone */}
            <ConfirmForm
              action={cloneProfileAction}
              title="Clone Profile"
              message={`Buat salinan dari "${profile.name}"?`}
              confirmLabel="Clone"
            >
              <input type="hidden" name="profileId" value={profile.id} />
              <button
                type="submit"
                className="p-1.5 text-blue-400 hover:text-blue-300 border border-blue-500/10 hover:bg-blue-500/10 rounded-lg transition-all"
                title="Clone Profile"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                </svg>
              </button>
            </ConfirmForm>

            {/* Export */}
            <ConfirmForm
              action={exportProfileAction}
              title="Export Profile"
              message={`Export config dari "${profile.name}" ke file JSON?`}
              confirmLabel="Export"
              variant="info"
            >
              <input type="hidden" name="profileId" value={profile.id} />
              <button
                type="submit"
                className="p-1.5 text-emerald-400 hover:text-emerald-300 border border-emerald-500/10 hover:bg-emerald-500/10 rounded-lg transition-all"
                title="Export Profile"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
              </button>
            </ConfirmForm>

            {/* Enable/Disable Toggle */}
            <ConfirmForm
              action={toggleEnabledAction}
              title={profile.enabled === false ? 'Enable Profile' : 'Disable Profile'}
              message={profile.enabled === false ? `Aktifkan "${profile.name}"? Profile ini akan digunakan oleh device yang ter-assign.` : `Nonaktifkan "${profile.name}"? Profile ini tetap ter-assign tapi device akan fallback ke config sebelumnya.`}
              confirmLabel={profile.enabled === false ? 'Enable' : 'Disable'}
            >
              <input type="hidden" name="profileId" value={profile.id} />
              <button
                type="submit"
                className={`p-1.5 rounded-lg transition-all border ${
                  profile.enabled === false
                    ? 'text-slate-500 hover:text-slate-400 border-border hover:bg-accent/50'
                    : 'text-emerald-400 hover:text-emerald-300 border-emerald-500/10 hover:bg-emerald-500/10'
                }`}
                title={profile.enabled === false ? 'Enable' : 'Disable'}
              >
                {profile.enabled === false ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </button>
            </ConfirmForm>

            {/* Lock/Unlock */}
            <ConfirmForm
              action={toggleLockAction}
              title={profile.locked ? 'Unlock Profile' : 'Lock Profile'}
              message={profile.locked ? `Unlock "${profile.name}"? Profile ini akan bisa diedit.` : `Lock "${profile.name}"? Profile ini tidak akan bisa diedit atau dihapus.`}
              confirmLabel={profile.locked ? 'Unlock' : 'Lock'}
            >
              <input type="hidden" name="profileId" value={profile.id} />
              <button
                type="submit"
                className={`p-1.5 rounded-lg transition-all border ${
                  profile.locked
                    ? 'text-amber-400 hover:text-amber-300 border-amber-500/10 hover:bg-amber-500/10'
                    : 'text-muted-foreground hover:text-foreground border-border hover:bg-accent/50'
                }`}
                title={profile.locked ? 'Unlock Profile' : 'Lock Profile'}
              >
                {profile.locked ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                )}
              </button>
            </ConfirmForm>

            {/* Delete */}
            <ConfirmForm
              action={deleteProfileAction}
              message={`Hapus profile "${profile.name}"? Semua assignment grup/device yang menggunakan profile ini akan dihapus.`}
            >
              <input type="hidden" name="profileId" value={profile.id} />
              <button
                type="submit"
                className="p-1.5 text-rose-400 hover:text-rose-300 border border-rose-500/10 hover:bg-rose-500/10 rounded-lg transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </button>
            </ConfirmForm>
          </div>
        </div>

        <div className="px-5 py-3 flex flex-wrap items-center gap-4 text-[11px]">
          {/* Assignment Info */}
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
            {assignedGroups.length > 0 ? (
              <span className="flex items-center gap-1.5 flex-wrap">
                Grup:{' '}
                {assignedGroups.map((g) => (
                  <span key={g.id} className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: g.color }} />
                    <span className="font-medium text-foreground">{g.name}</span>
                  </span>
                ))}
              </span>
            ) : (
              <span>Belum di-assign ke grup</span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-muted-foreground">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
            </svg>
            {assignedDeviceCount > 0
              ? <span>{assignedDeviceCount} device override langsung</span>
              : <span>Tidak ada device override langsung</span>
            }
          </div>

          {/* Set as Global / Unset Global */}
          {!isGlobal && (
            <form action={setGlobalAction} className="ml-auto">
              <input type="hidden" name="profileId" value={profile.id} />
              <button
                type="submit"
                className="rounded-lg border border-border px-2.5 py-1.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all"
              >
                Set as Global
              </button>
            </form>
          )}
          {isGlobal && (
            <form action={unsetGlobalAction} className="ml-auto">
              <button
                type="submit"
                className="rounded-lg border border-amber-500/20 px-2.5 py-1.5 text-[10px] font-semibold text-amber-400 hover:bg-amber-500/10 transition-all"
              >
                Unset Global
              </button>
            </form>
          )}
        </div>
      </div>

      <AssignModal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        profileId={profile.id}
        profileName={profile.name}
        groups={groups}
        devices={devices}
        onAssignGroup={onAssignGroup}
        onAssignDevice={onAssignDevice}
      />

      {renameOpen && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/78 p-4 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(25,28,45,0.98),rgba(11,15,27,0.98))] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.55)] animate-slide-up">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-500/20 bg-sky-500/10 text-sky-300">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
            </div>

            <div className="mt-5 text-center">
              <h3 className="text-lg font-semibold text-white">Rename Profile</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                Ubah nama profile menjadi:
              </p>
            </div>

            <form action={renameProfileAction} className="mt-5 space-y-4">
              <input type="hidden" name="profileId" value={profile.id} />
              <input
                type="text"
                name="profileName"
                defaultValue={profile.name}
                className="field-input w-full text-sm"
                placeholder="Nama baru"
                required
                autoFocus
              />
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setRenameOpen(false)}
                  className="btn btn-secondary flex-1 py-2.5"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1 py-2.5"
                >
                  Rename
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
