import type { DeviceGroup } from '@/lib/deviceGroups'

type AssignTarget = {
  id: string
  name: string
  isAssigned: boolean
  currentProfileName?: string | null
}

export default function AssignPanel({
  title,
  description,
  targets,
  profileId,
  assignAction,
  idFieldName = 'groupId',
}: {
  title: string
  description: string
  targets: AssignTarget[]
  profileId: string
  assignAction: (fd: FormData) => Promise<void>
  idFieldName?: string
}) {
  return (
    <div className="card rounded-2xl overflow-hidden border border-border bg-card">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-[10px] text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div className={`divide-y divide-border/50 ${idFieldName === 'deviceId' ? 'max-h-96 overflow-y-auto' : ''}`}>
        {targets.length === 0 ? (
          <div className="px-5 py-6 text-center text-xs text-muted-foreground">Belum ada data.</div>
        ) : (
          targets.map((target) => (
            <div key={target.id} className="flex items-center justify-between gap-3 px-5 py-3 text-xs">
              <span className="font-semibold text-foreground">
                {target.name}
                {target.currentProfileName && (
                  <span className="text-muted-foreground font-normal"> (aktif: {target.currentProfileName})</span>
                )}
              </span>
              <form action={assignAction}>
                <input type="hidden" name="profileId" value={profileId} />
                <input type="hidden" name={idFieldName} value={target.id} />
                <input type="hidden" name="action" value={target.isAssigned ? 'remove' : 'assign'} />
                <button type="submit" className={`btn btn-xs ${target.isAssigned ? 'btn-danger' : 'btn-primary'}`}>
                  {target.isAssigned ? 'Remove' : 'Assign'}
                </button>
              </form>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
