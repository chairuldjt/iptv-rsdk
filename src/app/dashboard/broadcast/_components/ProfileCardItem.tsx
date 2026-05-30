'use client'

import { useState } from 'react'
import ConfirmForm from '@/components/ConfirmForm'
import AssignModal from '@/components/AssignModal'
import type { AssignTarget } from '@/components/AssignModal'

export default function ProfileCardItem({
  profile,
  isGlobal,
  editHref,
  deleteAction,
  setGlobalAction,
  cloneAction,
  exportAction,
  toggleLockAction,
  toggleEnabledAction,
  unsetGlobalAction,
  assignedGroupCount,
  assignedDeviceCount,
  groups,
  devices,
  onAssignGroup,
  onAssignDevice,
}: {
  profile: { id: string; name: string; description?: string; locked?: boolean; enabled?: boolean }
  isGlobal: boolean
  editHref: string
  deleteAction: (fd: FormData) => Promise<void>
  setGlobalAction: (fd: FormData) => Promise<void>
  cloneAction: (fd: FormData) => Promise<void>
  exportAction: (fd: FormData) => Promise<void>
  toggleLockAction: (fd: FormData) => Promise<void>
  toggleEnabledAction: (fd: FormData) => Promise<void>
  unsetGlobalAction: (fd: FormData) => Promise<void>
  assignedGroupCount?: number
  assignedDeviceCount?: number
  groups: AssignTarget[]
  devices: AssignTarget[]
  onAssignGroup: (profileId: string, groupId: string, assign: boolean) => Promise<unknown>
  onAssignDevice: (profileId: string, deviceId: string, assign: boolean) => Promise<unknown>
}) {
  const [assignModalOpen, setAssignModalOpen] = useState(false)

  return (
    <>
      <div className={`card rounded-2xl overflow-hidden border border-border bg-card p-4 flex items-center justify-between gap-3 transition-all ${
        isGlobal ? 'ring-2 ring-primary/30' : ''
      }`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm ${
            profile.enabled === false
              ? 'bg-muted border border-border text-muted-foreground opacity-50'
              : isGlobal ? 'bg-primary/15 border border-primary/20 text-primary' : 'bg-accent/30 border border-border text-muted-foreground'
          }`}>
            {isGlobal ? '🌐' : '📋'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-semibold text-foreground truncate ${profile.enabled === false ? 'opacity-50' : ''}`}>{profile.name}</span>
              {isGlobal && <span className="badge badge-primary text-[9px]">Global Base</span>}
              {profile.locked && <span className="badge badge-warning text-[9px]">Locked</span>}
              {profile.enabled === false && <span className="badge badge-secondary text-[9px]">Disabled</span>}
            </div>
            {profile.description && (
              <p className="text-[10px] text-muted-foreground truncate mt-0.5">{profile.description}</p>
            )}
            {(assignedGroupCount !== undefined || assignedDeviceCount !== undefined) && (
              <div className="flex items-center gap-2 mt-1">
                {assignedGroupCount !== undefined && assignedGroupCount > 0 && (
                  <span className="text-[9px] text-muted-foreground bg-accent/30 px-1.5 py-0.5 rounded-md">
                    {assignedGroupCount} grup
                  </span>
                )}
                {assignedDeviceCount !== undefined && assignedDeviceCount > 0 && (
                  <span className="text-[9px] text-muted-foreground bg-accent/30 px-1.5 py-0.5 rounded-md">
                    {assignedDeviceCount} device
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Clone */}
          <ConfirmForm
            action={cloneAction}
            title="Clone Profile"
            message={`Buat salinan dari "${profile.name}"?`}
            confirmLabel="Clone"
          >
            <input type="hidden" name="profileId" value={profile.id} />
            <button type="submit" className="p-1.5 text-blue-400 hover:text-blue-300 border border-blue-500/10 hover:bg-blue-500/10 rounded-lg transition-all" title="Clone">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
              </svg>
            </button>
          </ConfirmForm>

          {/* Export */}
          <ConfirmForm
            action={exportAction}
            title="Export Profile"
            message={`Export config dari "${profile.name}" ke file JSON?`}
            confirmLabel="Export"
          >
            <input type="hidden" name="profileId" value={profile.id} />
            <button type="submit" className="p-1.5 text-emerald-400 hover:text-emerald-300 border border-emerald-500/10 hover:bg-emerald-500/10 rounded-lg transition-all" title="Export">
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
            message={profile.locked ? `Unlock "${profile.name}"?` : `Lock "${profile.name}"? Profile ini tidak akan bisa diedit atau dihapus.`}
            confirmLabel={profile.locked ? 'Unlock' : 'Lock'}
          >
            <input type="hidden" name="profileId" value={profile.id} />
            <button type="submit" className={`p-1.5 rounded-lg transition-all border ${
              profile.locked
                ? 'text-amber-400 hover:text-amber-300 border-amber-500/10 hover:bg-amber-500/10'
                : 'text-muted-foreground hover:text-foreground border-border hover:bg-accent/50'
            }`} title={profile.locked ? 'Unlock' : 'Lock'}>
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

          {/* Assign Modal Trigger */}
          <button
            onClick={() => setAssignModalOpen(true)}
            className="btn btn-xs border border-border text-muted-foreground hover:text-foreground hover:bg-accent/50"
          >
            Assign
          </button>

          <a href={editHref} className="btn btn-xs border border-primary/20 text-primary hover:bg-primary/10">
            Edit Config
          </a>

          {/* Delete */}
          <ConfirmForm
            action={deleteAction}
            title="Konfirmasi Hapus Profile"
            message={`Hapus profile "${profile.name}"? Semua mapping yang menggunakan profile ini akan dibersihkan.`}
            confirmLabel="Hapus Profile"
          >
            <input type="hidden" name="profileId" value={profile.id} />
            <button type="submit" className="p-1.5 text-rose-450 hover:text-rose-350 border border-rose-500/10 hover:bg-rose-500/10 rounded-lg transition-all">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          </ConfirmForm>

          {/* Set/Unset Global */}
          {!isGlobal && (
            <ConfirmForm
              action={setGlobalAction}
              title="Set Global Profile"
              message={`Jadikan "${profile.name}" sebagai Global Base profile? Semua device yang tidak punya group/device override akan menggunakan profile ini.`}
              confirmLabel="Set Global"
            >
              <input type="hidden" name="profileId" value={profile.id} />
              <button type="submit" className="btn btn-xs border border-border text-muted-foreground hover:text-foreground">
                Set Global
              </button>
            </ConfirmForm>
          )}
          {isGlobal && (
            <ConfirmForm
              action={unsetGlobalAction}
              title="Unset Global Profile"
              message={`Hapus "${profile.name}" dari Global Base? Semua device akan kembali ke fallback config.`}
              confirmLabel="Unset"
            >
              <button type="submit" className="btn btn-xs border border-amber-500/20 text-amber-400 hover:bg-amber-500/10">
                Unset Global
              </button>
            </ConfirmForm>
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
    </>
  )
}
