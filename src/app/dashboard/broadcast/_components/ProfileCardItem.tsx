import ConfirmForm from '@/components/ConfirmForm'

export default function ProfileCardItem({
  profile,
  isGlobal,
  editHref,
  assignHref,
  deleteAction,
  setGlobalAction,
  assignedGroupCount,
  assignedDeviceCount,
}: {
  profile: { id: string; name: string; description?: string }
  isGlobal: boolean
  editHref: string
  assignHref: string
  deleteAction: (fd: FormData) => Promise<void>
  setGlobalAction: (fd: FormData) => Promise<void>
  assignedGroupCount?: number
  assignedDeviceCount?: number
}) {
  return (
    <div className={`card rounded-2xl overflow-hidden border border-border bg-card p-4 flex items-center justify-between gap-3 transition-all ${
      isGlobal ? 'ring-2 ring-primary/30' : ''
    }`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm ${
          isGlobal ? 'bg-primary/15 border border-primary/20 text-primary' : 'bg-accent/30 border border-border text-muted-foreground'
        }`}>
          {isGlobal ? '🌐' : '📋'}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground truncate">{profile.name}</span>
            {isGlobal && <span className="badge badge-primary text-[9px]">Global Base</span>}
          </div>
          {profile.description && (
            <p className="text-[10px] text-muted-foreground truncate mt-0.5">{profile.description}</p>
          )}
          {/* Assignment counts indicator */}
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
        <a href={assignHref} className="btn btn-xs border border-border text-muted-foreground hover:text-foreground hover:bg-accent/50">
          Assign
        </a>
        <a href={editHref} className="btn btn-xs border border-primary/20 text-primary hover:bg-primary/10">
          Edit Config
        </a>
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
      </div>
    </div>
  )
}
