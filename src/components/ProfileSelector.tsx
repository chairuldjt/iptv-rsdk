'use client'

import { useRouter } from 'next/navigation'

type ProfileSelectorProps = {
  profiles: Array<{ id: string; name: string }>
  activeProfileId: string
  activeTab: string
}

export default function ProfileSelector({
  profiles,
  activeProfileId,
  activeTab,
}: ProfileSelectorProps) {
  const router = useRouter()

  if (profiles.length === 0) {
    return (
      <div className="p-4 rounded-2xl border border-dashed border-border bg-accent/5 text-xs text-muted-foreground text-center">
        Belum ada profile Home Experience. Silakan buat profile terlebih dahulu di menu{' '}
        <a href="/dashboard/experience" className="text-primary hover:underline font-semibold">
          Home Experience
        </a>
        .
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl border border-border bg-accent/15">
      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider select-none">
        Target Profile Config:
      </label>
      <select
        value={activeProfileId}
        onChange={(e) => {
          router.push(`/dashboard/broadcast?tab=${activeTab}&profileId=${encodeURIComponent(e.target.value)}`)
        }}
        className="field-input py-2 text-xs max-w-xs cursor-pointer font-semibold text-foreground bg-slate-950/45 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all outline-none rounded-xl"
      >
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <span className="text-[10px] text-muted-foreground leading-normal ml-auto sm:ml-0">
        Perubahan pengaturan di bawah akan disimpan ke dalam profile ini.
      </span>
    </div>
  )
}
