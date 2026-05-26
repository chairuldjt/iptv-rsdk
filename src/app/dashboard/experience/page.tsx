import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import prisma from '@/lib/db'
import PageHeader from '@/components/PageHeader'
import HomeExperienceForm from '@/components/HomeExperienceForm'
import {
  FALLBACK_HOME_EXPERIENCE_CONFIG,
  clearScopedHomeExperience,
  getDeviceHomeExperience,
  getGlobalHomeExperience,
  getGroupHomeExperience,
  homeExperienceFromFormData,
  setDeviceHomeExperience,
  setGlobalHomeExperience,
  setGroupHomeExperience,
  type HomeExperienceConfig,
  type HomeExperienceScope,
} from '@/lib/homeExperience'
import { saveHomeExperienceAsset } from '@/lib/uploadedAssets'
import {
  assignDeviceToGroup,
  createDeviceGroup,
  deleteDeviceGroup,
  getDeviceGroupAssignments,
  getDeviceGroups,
} from '@/lib/deviceGroups'

export const revalidate = 0

async function saveHomeExperienceAction(formData: FormData) {
  'use server'
  const scope = (formData.get('scope') as HomeExperienceScope) || 'global'
  const targetId = (formData.get('targetId') as string) || ''
  const config = homeExperienceFromFormData(formData)

  config.logoUrl = await resolveUploadedAsset(formData, 'logoFile', 'logo', config.logoUrl)
  config.homeBackgroundUrl = await resolveUploadedAsset(formData, 'homeBackgroundFile', 'home-bg', config.homeBackgroundUrl)
  config.splash.backgroundUrl = await resolveUploadedAsset(formData, 'splashBackgroundFile', 'splash-bg', config.splash.backgroundUrl)
  config.splash.logoUrl = await resolveUploadedAsset(formData, 'splashLogoFile', 'splash-logo', config.splash.logoUrl)
  config.splash.soundUrl = await resolveUploadedAsset(formData, 'splashSoundFile', 'splash-sound', config.splash.soundUrl)
  config.sounds.selectionSoundUrl = await resolveUploadedAsset(formData, 'selectionSoundFile', 'selection-sound', config.sounds.selectionSoundUrl)
  config.forceVideo.videoUrl = await resolveUploadedAsset(formData, 'forceVideoFile', 'force-video', config.forceVideo.videoUrl)
  config.menus = await Promise.all(
    config.menus.map(async (menu) => ({
      ...menu,
      backgroundUrl: await resolveUploadedAsset(formData, `menuBackgroundFile__${menu.id}`, `menu-bg-${menu.id}`, menu.backgroundUrl),
    }))
  )

  if (scope === 'group' && targetId) {
    await setGroupHomeExperience(targetId, config)
  } else if (scope === 'device' && targetId) {
    await setDeviceHomeExperience(targetId, config)
  } else {
    await setGlobalHomeExperience(config)
  }

  revalidatePath('/dashboard/experience')
  revalidatePath('/dashboard/devices')
  redirect(`/dashboard/experience?scope=${scope}${targetId ? `&id=${encodeURIComponent(targetId)}` : ''}&saved=1`)
}

async function resetHomeExperienceAction(formData: FormData) {
  'use server'
  const scope = (formData.get('scope') as HomeExperienceScope) || 'global'
  const targetId = (formData.get('targetId') as string) || ''

  if (scope === 'global') {
    await setGlobalHomeExperience(FALLBACK_HOME_EXPERIENCE_CONFIG)
  } else {
    await clearScopedHomeExperience(scope, targetId)
  }

  revalidatePath('/dashboard/experience')
  redirect(`/dashboard/experience?scope=${scope}${targetId ? `&id=${encodeURIComponent(targetId)}` : ''}&reset=1`)
}

async function createGroupAction(formData: FormData) {
  'use server'
  const name = (formData.get('groupName') as string) || ''
  const description = (formData.get('groupDescription') as string) || ''
  const color = (formData.get('groupColor') as string) || '#2EE6C6'
  const group = await createDeviceGroup({ name, description, color })
  revalidatePath('/dashboard/experience')
  revalidatePath('/dashboard/devices')
  redirect(`/dashboard/experience?scope=group&id=${encodeURIComponent(group.id)}&groupSaved=1`)
}

async function deleteGroupAction(formData: FormData) {
  'use server'
  const groupId = (formData.get('groupId') as string) || ''
  if (groupId) {
    await deleteDeviceGroup(groupId)
  }
  revalidatePath('/dashboard/experience')
  revalidatePath('/dashboard/devices')
  redirect('/dashboard/experience?scope=global&groupDeleted=1')
}

async function assignGroupAction(formData: FormData) {
  'use server'
  const deviceId = (formData.get('deviceId') as string) || ''
  const groupId = ((formData.get('groupId') as string) || '').trim() || null
  if (deviceId) {
    await assignDeviceToGroup(deviceId, groupId)
  }
  revalidatePath('/dashboard/experience')
  revalidatePath('/dashboard/devices')
  redirect(`/dashboard/experience?scope=device&id=${encodeURIComponent(deviceId)}&assignmentSaved=1`)
}

export default async function ExperiencePage({
  searchParams,
}: {
  searchParams: Promise<{
    scope?: string
    id?: string
    saved?: string
    reset?: string
    groupSaved?: string
    groupDeleted?: string
    assignmentSaved?: string
  }>
}) {
  const resolvedSearchParams = await searchParams
  const scope = normalizeScope(resolvedSearchParams.scope)
  const targetId = resolvedSearchParams.id || ''
  const groups = await getDeviceGroups()
  const assignments = await getDeviceGroupAssignments()
  const devices = await prisma.device.findMany({
    orderBy: [{ deviceName: 'asc' }, { deviceId: 'asc' }],
    select: {
      deviceId: true,
      deviceName: true,
      isActive: true,
    },
  })

  const config = await loadConfig(scope, targetId)
  const currentGroup = scope === 'group' ? groups.find((group) => group.id === targetId) : null
  const currentDevice = scope === 'device' ? devices.find((device) => device.deviceId === targetId) : null
  const currentScopeLabel =
    scope === 'global'
      ? 'Global Profile'
      : scope === 'group'
        ? `Group Profile: ${currentGroup?.name || targetId}`
        : `Device Override: ${currentDevice?.deviceName || targetId}`

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Home Experience"
        description="Atur asset-driven splash, home menu, running text, halaman statis, dan force video dengan prioritas Global -> Group -> Device."
        badge="Server-Driven UI"
      />

      {(resolvedSearchParams.saved === '1' || resolvedSearchParams.reset === '1' || resolvedSearchParams.groupSaved === '1' || resolvedSearchParams.groupDeleted === '1' || resolvedSearchParams.assignmentSaved === '1') && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          {resolvedSearchParams.saved === '1' && 'Profile berhasil disimpan. Android akan memakai perubahan ini setelah aplikasi restart.'}
          {resolvedSearchParams.reset === '1' && 'Profile berhasil di-reset sesuai scope terpilih.'}
          {resolvedSearchParams.groupSaved === '1' && 'Device group berhasil dibuat.'}
          {resolvedSearchParams.groupDeleted === '1' && 'Device group berhasil dihapus beserta assignment dan profile override-nya.'}
          {resolvedSearchParams.assignmentSaved === '1' && 'Assignment device ke group berhasil diperbarui.'}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-6">
        <div className="space-y-6">
          <div className="card rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Edit Scope</h3>
            <a href="/dashboard/experience?scope=global" className={`block rounded-xl border px-3 py-3 text-xs transition-all ${scope === 'global' ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border bg-accent/20 text-foreground hover:bg-accent/40'}`}>
              Global Profile
            </a>

            <div className="space-y-2 pt-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Group Profiles</div>
              {groups.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border px-3 py-4 text-[11px] text-muted-foreground">
                  Belum ada group. Buat group baru di panel bawah.
                </div>
              ) : (
                groups.map((group) => (
                  <div key={group.id} className="flex items-center gap-2">
                    <a
                      href={`/dashboard/experience?scope=group&id=${encodeURIComponent(group.id)}`}
                      className={`flex-1 rounded-xl border px-3 py-3 text-xs transition-all ${scope === 'group' && targetId === group.id ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border bg-accent/20 text-foreground hover:bg-accent/40'}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: group.color }} />
                        <span className="font-semibold">{group.name}</span>
                      </div>
                      {group.description && <div className="mt-1 text-[10px] text-muted-foreground">{group.description}</div>}
                    </a>
                    <form action={deleteGroupAction}>
                      <input type="hidden" name="groupId" value={group.id} />
                      <button type="submit" className="rounded-lg border border-rose-500/20 px-2.5 py-2 text-[10px] font-semibold text-rose-400 hover:bg-rose-500/10">
                        Hapus
                      </button>
                    </form>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-2 pt-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Device Overrides</div>
              <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1">
                {devices.map((device) => {
                  const assignedGroupId = assignments[device.deviceId] || ''
                  const assignedGroup = groups.find((group) => group.id === assignedGroupId)
                  return (
                    <div key={device.deviceId} className="rounded-xl border border-border bg-accent/20 p-3">
                      <a
                        href={`/dashboard/experience?scope=device&id=${encodeURIComponent(device.deviceId)}`}
                        className={`block rounded-lg px-2 py-2 text-xs transition-all ${scope === 'device' && targetId === device.deviceId ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-accent/50'}`}
                      >
                        <div className="font-semibold">{device.deviceName}</div>
                        <div className="mt-1 break-all text-[10px] text-muted-foreground">{device.deviceId}</div>
                        <div className="mt-1 text-[10px] text-muted-foreground">
                          Group: {assignedGroup ? assignedGroup.name : 'Tanpa Group'}
                        </div>
                      </a>
                      <form action={assignGroupAction} className="mt-2 flex gap-2">
                        <input type="hidden" name="deviceId" value={device.deviceId} />
                        <select name="groupId" defaultValue={assignedGroupId} className="field-input py-2 text-[11px]">
                          <option value="">Tanpa Group</option>
                          {groups.map((group) => (
                            <option key={group.id} value={group.id}>{group.name}</option>
                          ))}
                        </select>
                        <button type="submit" className="rounded-lg border border-primary/20 px-3 py-2 text-[10px] font-semibold text-primary hover:bg-primary/10">
                          Assign
                        </button>
                      </form>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="card rounded-2xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Create Group</h3>
              <p className="mt-1 text-[10px] text-muted-foreground">Group dipakai untuk apply profile home experience ke banyak device sekaligus.</p>
            </div>
            <form action={createGroupAction} className="space-y-3">
              <Field label="Nama Group">
                <input type="text" name="groupName" required className="field-input" placeholder="Contoh: VIP Ward, Lantai 2, Ruang Operasi" />
              </Field>
              <Field label="Deskripsi">
                <input type="text" name="groupDescription" className="field-input" placeholder="Opsional" />
              </Field>
              <Field label="Warna Group">
                <input type="color" name="groupColor" defaultValue="#2EE6C6" className="h-11 w-full rounded-xl border border-border bg-background px-2" />
              </Field>
              <button type="submit" className="w-full btn btn-primary py-2.5">Create Device Group</button>
            </form>
          </div>
        </div>

        <HomeExperienceForm
          scope={scope}
          targetId={targetId}
          config={config}
          currentScopeLabel={currentScopeLabel}
          onSaveAction={saveHomeExperienceAction}
          onResetAction={resetHomeExperienceAction}
        />
      </div>
    </div>
  )
}

async function loadConfig(scope: HomeExperienceScope, targetId: string): Promise<HomeExperienceConfig> {
  if (scope === 'group' && targetId) {
    return (await getGroupHomeExperience(targetId)) ?? FALLBACK_HOME_EXPERIENCE_CONFIG
  }
  if (scope === 'device' && targetId) {
    return (await getDeviceHomeExperience(targetId)) ?? FALLBACK_HOME_EXPERIENCE_CONFIG
  }
  return getGlobalHomeExperience()
}

function normalizeScope(scope: string | undefined): HomeExperienceScope {
  return scope === 'group' || scope === 'device' ? scope : 'global'
}

async function resolveUploadedAsset(
  formData: FormData,
  fieldName: string,
  prefix: string,
  fallbackUrl: string
): Promise<string> {
  const file = formData.get(fieldName)
  if (file instanceof File && file.size > 0) {
    return saveHomeExperienceAsset(file, prefix)
  }
  return fallbackUrl
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label>
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}
