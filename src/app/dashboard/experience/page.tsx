import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import prisma from '@/lib/db'
import PageHeader from '@/components/PageHeader'
import HomeExperienceForm, { HomeExperiencePreview } from '@/components/HomeExperienceForm'
import ConfirmForm from '@/components/ConfirmForm'
import {
  FALLBACK_HOME_EXPERIENCE_CONFIG,
  applyHomeExperiencePatch,
  assignProfileToDevice,
  assignProfileToGroup,
  createHomeExperienceProfile,
  deleteHomeExperienceProfile,
  getDeviceProfileMap,
  getGlobalProfileId,
  getGroupProfileMap,
  getHomeExperienceProfileConfig,
  getHomeExperienceProfilePatch,
  getHomeExperienceProfiles,
  homeExperienceFromFormData,
  saveHomeExperienceProfileConfig,
  setGlobalProfileId,
  type HomeExperiencePatch,
  type HomeExperienceResolvedConfig,
  type HomeExperienceProfile,
} from '@/lib/homeExperience'
import { saveHomeExperienceAudio, saveHomeExperienceImage } from '@/lib/uploadedAssets'
import type { ImageAssetKind } from '@/lib/assetValidation'
import { getDeviceGroupAssignments, getDeviceGroups, type DeviceGroup } from '@/lib/deviceGroups'

export const revalidate = 0

// ── Server Actions ────────────────────────────────────────────────────────────

async function createProfileAction(formData: FormData) {
  'use server'
  const name = (formData.get('profileName') as string) || ''
  const description = (formData.get('profileDescription') as string) || ''
  const profile = await createHomeExperienceProfile({ name, description })
  revalidatePath('/dashboard/experience')
  redirect(`/dashboard/experience?edit=${encodeURIComponent(profile.id)}&created=1`)
}

async function saveProfileConfigAction(formData: FormData) {
  'use server'
  const profileId = (formData.get('targetId') as string) || ''
  if (!profileId) return
  const config = homeExperienceFromFormData(formData)

  try {
    config.logoUrl = await resolveImageAsset(formData, 'logoFile', 'logo', 'logo', config.logoUrl)
    config.homeBackgroundUrl = await resolveImageAsset(formData, 'homeBackgroundFile', 'home-bg', 'background', config.homeBackgroundUrl)
    config.splash.backgroundUrl = await resolveImageAsset(formData, 'splashBackgroundFile', 'splash-bg', 'background', config.splash.backgroundUrl)
    config.splash.logoUrl = await resolveImageAsset(formData, 'splashLogoFile', 'splash-logo', 'logo', config.splash.logoUrl)
    config.splash.soundUrl = await resolveAudioAsset(formData, 'splashSoundFile', 'splash-sound', config.splash.soundUrl)
    config.sounds.selectionSoundUrl = await resolveAudioAsset(formData, 'selectionSoundFile', 'selection-sound', config.sounds.selectionSoundUrl)
    config.menus = await Promise.all(
      config.menus.map(async (menu) => ({
        ...menu,
        backgroundUrl: await resolveImageAsset(
          formData,
          `menuBackgroundFile__${menu.id}`,
          `menu-bg-${menu.id}`,
          'background',
          menu.backgroundUrl
        ),
      }))
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload gagal divalidasi.'
    revalidatePath('/dashboard/experience')
    redirect(
      `/dashboard/experience?edit=${encodeURIComponent(profileId)}&uploadError=${encodeURIComponent(message)}`
    )
  }

  await saveHomeExperienceProfileConfig(profileId, config)
  revalidatePath('/dashboard/experience')
  redirect(`/dashboard/experience?edit=${encodeURIComponent(profileId)}&saved=1`)
}

async function resetProfileConfigAction(formData: FormData) {
  'use server'
  const profileId = (formData.get('targetId') as string) || ''
  if (!profileId) return
  await saveHomeExperienceProfileConfig(profileId, FALLBACK_HOME_EXPERIENCE_CONFIG)
  revalidatePath('/dashboard/experience')
  redirect(`/dashboard/experience?edit=${encodeURIComponent(profileId)}&reset=1`)
}

async function deleteProfileAction(formData: FormData) {
  'use server'
  const profileId = (formData.get('profileId') as string) || ''
  if (profileId) await deleteHomeExperienceProfile(profileId)
  revalidatePath('/dashboard/experience')
  redirect('/dashboard/experience?deleted=1')
}

async function setGlobalAction(formData: FormData) {
  'use server'
  const profileId = (formData.get('profileId') as string) || ''
  if (profileId) await setGlobalProfileId(profileId)
  revalidatePath('/dashboard/experience')
  redirect('/dashboard/experience?globalSet=1')
}

async function assignGroupAction(formData: FormData) {
  'use server'
  const profileId = (formData.get('profileId') as string) || ''
  const groupId = (formData.get('groupId') as string) || ''
  const action = (formData.get('action') as string) || 'assign'
  if (profileId && groupId) {
    await assignProfileToGroup(groupId, action === 'assign' ? profileId : null)
  }
  revalidatePath('/dashboard/experience')
  redirect(`/dashboard/experience?assign=${encodeURIComponent(profileId)}&ok=1`)
}

async function assignDeviceAction(formData: FormData) {
  'use server'
  const profileId = (formData.get('profileId') as string) || ''
  const deviceId = (formData.get('deviceId') as string) || ''
  const action = (formData.get('action') as string) || 'assign'
  if (profileId && deviceId) {
    await assignProfileToDevice(deviceId, action === 'assign' ? profileId : null)
  }
  revalidatePath('/dashboard/experience')
  redirect(`/dashboard/experience?assign=${encodeURIComponent(profileId)}&ok=1`)
}

// ── Page Component ────────────────────────────────────────────────────────────

export default async function ExperiencePage({
  searchParams,
}: {
  searchParams: Promise<{
    edit?: string
    assign?: string
    created?: string
    saved?: string
    reset?: string
    updated?: string
    deleted?: string
    globalSet?: string
    ok?: string
    uploadError?: string
  }>
}) {
  const sp = await searchParams
  const editProfileId = sp.edit || ''
  const assignProfileId = sp.assign || ''

  const profiles = await getHomeExperienceProfiles()
  const globalProfileId = await getGlobalProfileId()
  const groupProfileMap = await getGroupProfileMap()
  const deviceProfileMap = await getDeviceProfileMap()
  const groups = await getDeviceGroups()
  const groupAssignments = await getDeviceGroupAssignments()
  const allDevices = await prisma.device.findMany({
    orderBy: [{ deviceName: 'asc' }],
    select: { deviceId: true, deviceName: true, isActive: true },
  })

  const hasNotif = sp.created || sp.saved || sp.reset || sp.updated || sp.deleted || sp.globalSet || sp.ok

  // ── Mode: Edit profile config ──────────────────────────────────────────────
  if (editProfileId) {
    const profile = profiles.find((p) => p.id === editProfileId)
    if (!profile) redirect('/dashboard/experience')
    const config = (await getHomeExperienceProfileConfig(editProfileId)) ?? FALLBACK_HOME_EXPERIENCE_CONFIG
    const entertainmentItems = await prisma.entertainmentItem.findMany({
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
      select: { id: true, title: true, subtitle: true, isActive: true },
    })
    const previewContexts = await buildEffectivePreviewContexts({
      profileId: editProfileId,
      profileName: profile.name,
      profileDescription: profile.description,
      globalProfileId,
      groupProfileMap,
      deviceProfileMap,
      groups,
      groupAssignments,
      allDevices,
    })

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <a
            href="/dashboard/experience"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Kembali ke Daftar Config
          </a>
          <span className="text-border">/</span>
          <span className="text-xs text-foreground font-medium">{profile.name}</span>
          {globalProfileId === profile.id && (
            <span className="badge badge-primary text-[9px]">Global</span>
          )}
        </div>

        {(sp.saved || sp.reset) && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            {sp.saved ? 'Config berhasil disimpan.' : 'Config berhasil di-reset ke default.'}
            {' '}Android akan memakai perubahan setelah aplikasi restart.
          </div>
        )}

        {sp.uploadError && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
            <div className="font-bold mb-1">Upload ditolak</div>
            <div className="font-normal">{sp.uploadError}</div>
            <div className="mt-2 font-normal text-rose-300/80">Konfig lain tidak ikut tersimpan. Perbaiki file lalu submit ulang.</div>
          </div>
        )}

        <HomeExperienceForm
          scope="profile"
          targetId={editProfileId}
          config={config}
          currentScopeLabel={`Config Profile: ${profile.name}`}
          entertainmentItems={entertainmentItems}
          onSaveAction={saveProfileConfigAction}
          onResetAction={resetProfileConfigAction}
        />

        <EffectivePreviewSection contexts={previewContexts} />
      </div>
    )
  }

  // ── Mode: Manage assignments for a profile ────────────────────────────────
  if (assignProfileId) {
    const profile = profiles.find((p) => p.id === assignProfileId)
    if (!profile) redirect('/dashboard/experience')

    // Find which groups and devices are assigned to this profile
    const assignedGroupIds = new Set(
      Object.entries(groupProfileMap)
        .filter(([, pid]) => pid === assignProfileId)
        .map(([gid]) => gid)
    )
    const assignedDeviceIds = new Set(
      Object.entries(deviceProfileMap)
        .filter(([, pid]) => pid === assignProfileId)
        .map(([did]) => did)
    )

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <a
            href="/dashboard/experience"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Kembali ke Daftar Config
          </a>
          <span className="text-border">/</span>
          <span className="text-xs text-foreground font-medium">Assignment: {profile.name}</span>
        </div>

        {sp.ok && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            Assignment berhasil diperbarui.
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Group Assignments */}
          <div className="card rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Group Level</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Semua device dalam grup akan menggunakan config ini sebagai group-level policy.
                Satu grup hanya bisa memiliki satu config aktif.
              </p>
            </div>
            <div className="divide-y divide-border/50">
              {groups.length === 0 ? (
                <div className="px-5 py-6 text-center text-[11px] text-muted-foreground">
                  Belum ada grup. <a href="/dashboard/groups" className="text-primary hover:underline">Buat grup dulu.</a>
                </div>
              ) : (
                groups.map((group) => {
                  const isAssigned = assignedGroupIds.has(group.id)
                  const currentProfileId = groupProfileMap[group.id]
                  const currentProfile = currentProfileId && currentProfileId !== assignProfileId
                    ? profiles.find((p) => p.id === currentProfileId)
                    : null
                  const memberCount = Object.values(groupAssignments).filter((gid) => gid === group.id).length

                  return (
                    <div key={group.id} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: group.color }} />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-foreground truncate">{group.name}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {memberCount} device
                            {currentProfile && !isAssigned && (
                              <span className="ml-1 text-amber-400"> • aktif: {currentProfile.name}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <form action={assignGroupAction} className="shrink-0">
                        <input type="hidden" name="profileId" value={assignProfileId} />
                        <input type="hidden" name="groupId" value={group.id} />
                        <input type="hidden" name="action" value={isAssigned ? 'remove' : 'assign'} />
                        <button
                          type="submit"
                          className={`rounded-lg border px-3 py-1.5 text-[10px] font-semibold transition-all ${
                            isAssigned
                              ? 'border-rose-500/20 text-rose-400 hover:bg-rose-500/10'
                              : 'border-primary/20 text-primary hover:bg-primary/10'
                          }`}
                        >
                          {isAssigned ? 'Remove' : 'Assign'}
                        </button>
                      </form>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Device Assignments */}
          <div className="card rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Device Level (Override)</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Device yang di-assign langsung akan menggunakan config ini sebagai device-level override,
                menggantikan config grup-nya.
              </p>
            </div>
            <div className="divide-y divide-border/50 max-h-[480px] overflow-y-auto">
              {allDevices.length === 0 ? (
                <div className="px-5 py-6 text-center text-[11px] text-muted-foreground">Belum ada device terdaftar.</div>
              ) : (
                allDevices.map((device) => {
                  const isAssigned = assignedDeviceIds.has(device.deviceId)
                  const currentProfileId = deviceProfileMap[device.deviceId]
                  const currentProfile = currentProfileId && currentProfileId !== assignProfileId
                    ? profiles.find((p) => p.id === currentProfileId)
                    : null
                  const deviceGroupId = groupAssignments[device.deviceId]
                  const deviceGroup = groups.find((g) => g.id === deviceGroupId)

                  return (
                    <div key={device.deviceId} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${device.isActive ? 'bg-emerald-500' : 'bg-muted'}`} />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-foreground truncate">{device.deviceName}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {deviceGroup ? (
                              <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: deviceGroup.color }} />
                                {deviceGroup.name}
                              </span>
                            ) : 'Tanpa grup'}
                            {currentProfile && !isAssigned && (
                              <span className="ml-1 text-amber-400"> • aktif: {currentProfile.name}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <form action={assignDeviceAction} className="shrink-0">
                        <input type="hidden" name="profileId" value={assignProfileId} />
                        <input type="hidden" name="deviceId" value={device.deviceId} />
                        <input type="hidden" name="action" value={isAssigned ? 'remove' : 'assign'} />
                        <button
                          type="submit"
                          className={`rounded-lg border px-3 py-1.5 text-[10px] font-semibold transition-all ${
                            isAssigned
                              ? 'border-rose-500/20 text-rose-400 hover:bg-rose-500/10'
                              : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent/50'
                          }`}
                        >
                          {isAssigned ? 'Remove' : 'Assign'}
                        </button>
                      </form>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Mode: Profile list (default) ───────────────────────────────────────────

  // Build assignment stats per profile
  const profileGroupCount = new Map<string, string[]>()
  const profileDeviceCount = new Map<string, string[]>()
  for (const profile of profiles) {
    profileGroupCount.set(profile.id, [])
    profileDeviceCount.set(profile.id, [])
  }
  for (const [groupId, profileId] of Object.entries(groupProfileMap)) {
    profileGroupCount.get(profileId)?.push(groupId)
  }
  for (const [deviceId, profileId] of Object.entries(deviceProfileMap)) {
    profileDeviceCount.get(profileId)?.push(deviceId)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Home Experience"
        description="Kelola config tampilan Android TV sebagai profile mandiri — setiap profile bisa di-assign ke banyak group maupun device sekaligus."
        badge="GPO-style Config"
      />

      {hasNotif && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          {sp.created && 'Profile baru berhasil dibuat.'}
          {sp.saved && 'Config berhasil disimpan.'}
          {sp.reset && 'Config berhasil di-reset.'}
          {sp.updated && 'Profile berhasil diperbarui.'}
          {sp.deleted && 'Profile berhasil dihapus.'}
          {sp.globalSet && 'Global profile berhasil diubah.'}
          {sp.ok && 'Assignment berhasil diperbarui.'}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[340px_minmax(0,1fr)] gap-6 items-start">

        {/* Left: Create Profile Form */}
        <div className="card rounded-2xl p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Buat Profile Baru</h3>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Setiap profile adalah config mandiri yang dapat di-assign ke banyak grup atau device sekaligus — mirip GPO di GPMC.
            </p>
          </div>
          <form action={createProfileAction} className="space-y-3">
            <Field label="Nama Profile">
              <input
                type="text"
                name="profileName"
                required
                className="field-input"
                placeholder="Contoh: Standar RS, VIP Ward, ICU Khusus"
              />
            </Field>
            <Field label="Deskripsi">
              <input
                type="text"
                name="profileDescription"
                className="field-input"
                placeholder="Opsional"
              />
            </Field>
            <button type="submit" className="w-full btn btn-primary py-2.5">
              + Buat Profile
            </button>
          </form>
        </div>

        {/* Right: Profile List */}
        <div className="space-y-3">
          {profiles.length === 0 ? (
            <div className="card rounded-2xl p-10 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl border border-border flex items-center justify-center text-muted-foreground">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Belum Ada Config Profile</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Buat profile pertama di panel kiri untuk mulai mengelola tampilan Android TV.
                </p>
              </div>
            </div>
          ) : (
            profiles.map((profile) => {
              const isGlobal = globalProfileId === profile.id
              const assignedGroups = (profileGroupCount.get(profile.id) || [])
                .map((gid) => groups.find((g) => g.id === gid))
                .filter(Boolean)
              const assignedDeviceIds2 = profileDeviceCount.get(profile.id) || []

              return (
                <ProfileCard
                  key={profile.id}
                  profile={profile}
                  isGlobal={isGlobal}
                  assignedGroups={assignedGroups as NonNullable<(typeof groups)[number]>[]}
                  assignedDeviceCount={assignedDeviceIds2.length}
                  deleteProfileAction={deleteProfileAction}
                  setGlobalAction={setGlobalAction}
                />
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ProfileCard({
  profile,
  isGlobal,
  assignedGroups,
  assignedDeviceCount,
  deleteProfileAction,
  setGlobalAction,
}: {
  profile: HomeExperienceProfile
  isGlobal: boolean
  assignedGroups: Array<{ id: string; name: string; color: string }>
  assignedDeviceCount: number
  deleteProfileAction: (fd: FormData) => Promise<void>
  setGlobalAction: (fd: FormData) => Promise<void>
}) {
  return (
    <div className={`card rounded-2xl overflow-hidden ${isGlobal ? 'ring-2 ring-primary/30' : ''}`}>
      <div className="px-5 py-4 flex items-center justify-between gap-3 border-b border-border">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm ${
            isGlobal ? 'bg-primary/15 border border-primary/20 text-primary' : 'bg-accent/30 border border-border text-muted-foreground'
          }`}>
            {isGlobal ? '🌐' : '📋'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-foreground truncate">{profile.name}</span>
              {isGlobal && <span className="badge badge-primary shrink-0">Global Base</span>}
            </div>
            {profile.description && (
              <p className="text-[10px] text-muted-foreground truncate">{profile.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href={`/dashboard/experience?assign=${encodeURIComponent(profile.id)}`}
            className="btn btn-xs border border-border text-muted-foreground hover:text-foreground hover:bg-accent/50"
          >
            Assign
          </a>
          <a
            href={`/dashboard/experience?edit=${encodeURIComponent(profile.id)}`}
            className="btn btn-xs border border-primary/20 text-primary hover:bg-primary/10"
          >
            Edit Config
          </a>
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

        {/* Set as Global */}
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
          <span className="ml-auto text-[10px] text-primary/70">
            ✓ Base config untuk semua device
          </span>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label>
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

type PreviewSourceLabel = 'fallback' | 'global' | 'group' | 'device'

type EffectivePreviewContext = {
  id: string
  title: string
  description: string
  config: HomeExperienceResolvedConfig
  fieldSources: Record<'logoUrl' | 'homeBackgroundUrl' | 'menus' | 'splash' | 'sounds', PreviewSourceLabel>
}

async function buildEffectivePreviewContexts(input: {
  profileId: string
  profileName: string
  profileDescription: string
  globalProfileId: string | null
  groupProfileMap: Record<string, string>
  deviceProfileMap: Record<string, string>
  groups: DeviceGroup[]
  groupAssignments: Record<string, string>
  allDevices: Array<{ deviceId: string; deviceName: string; isActive: boolean }>
}): Promise<EffectivePreviewContext[]> {
  const currentPatch = (await getHomeExperienceProfilePatch(input.profileId)) ?? {}
  const globalPatch = input.globalProfileId && input.globalProfileId !== input.profileId
    ? ((await getHomeExperienceProfilePatch(input.globalProfileId)) ?? {})
    : null

  const contexts: EffectivePreviewContext[] = []

  const standaloneLayers = [
    { label: 'fallback' as const, patch: null },
    { label: 'device' as const, patch: currentPatch },
  ]
  contexts.push({
    id: 'standalone',
    title: 'Profile Only',
    description: 'Simulasi profile ini di atas fallback bawaan tanpa global/group/device lain.',
    config: applyLayerStack(standaloneLayers),
    fieldSources: buildFieldSourceMap(standaloneLayers),
  })

  const groupIds = Object.entries(input.groupProfileMap)
    .filter(([, profileId]) => profileId === input.profileId)
    .map(([groupId]) => groupId)
  const firstGroup = input.groups.find((group) => groupIds.includes(group.id))

  if (firstGroup) {
    const groupLayers = [
      { label: 'fallback' as const, patch: null },
      { label: 'global' as const, patch: globalPatch },
      { label: 'group' as const, patch: currentPatch },
    ]
    const memberCount = Object.values(input.groupAssignments).filter((groupId) => groupId === firstGroup.id).length
    contexts.push({
      id: `group-${firstGroup.id}`,
      title: `Sample Group: ${firstGroup.name}`,
      description: `${memberCount} device di grup ini akan mewarisi hasil merge global base lalu override group dari profile ini.`,
      config: applyLayerStack(groupLayers),
      fieldSources: buildFieldSourceMap(groupLayers),
    })
  }

  const deviceIds = Object.entries(input.deviceProfileMap)
    .filter(([, profileId]) => profileId === input.profileId)
    .map(([deviceId]) => deviceId)
  const firstDevice = input.allDevices.find((device) => deviceIds.includes(device.deviceId))

  if (firstDevice) {
    const deviceGroupId = input.groupAssignments[firstDevice.deviceId]
    const deviceGroupProfileId = deviceGroupId ? input.groupProfileMap[deviceGroupId] : null
    const groupPatch = deviceGroupProfileId && deviceGroupProfileId !== input.profileId
      ? ((await getHomeExperienceProfilePatch(deviceGroupProfileId)) ?? {})
      : null
    const deviceLayers = [
      { label: 'fallback' as const, patch: null },
      { label: 'global' as const, patch: globalPatch },
      { label: 'group' as const, patch: groupPatch },
      { label: 'device' as const, patch: currentPatch },
    ]
    const groupName = input.groups.find((group) => group.id === deviceGroupId)?.name || 'Tanpa grup'
    contexts.push({
      id: `device-${firstDevice.deviceId}`,
      title: `Sample Device: ${firstDevice.deviceName}`,
      description: `Device ini menerima base global, policy grup (${groupName}), lalu diakhiri override device dari profile ini.`,
      config: applyLayerStack(deviceLayers),
      fieldSources: buildFieldSourceMap(deviceLayers),
    })
  }

  if (input.globalProfileId === input.profileId) {
    const globalLayers = [
      { label: 'fallback' as const, patch: null },
      { label: 'global' as const, patch: currentPatch },
    ]
    contexts.unshift({
      id: 'global-live',
      title: 'Live Global Base',
      description: 'Ini adalah hasil efektif untuk device yang tidak memiliki override group maupun device.',
      config: applyLayerStack(globalLayers),
      fieldSources: buildFieldSourceMap(globalLayers),
    })
  } else if (globalPatch) {
    const inheritedLayers = [
      { label: 'fallback' as const, patch: null },
      { label: 'global' as const, patch: globalPatch },
      { label: 'device' as const, patch: currentPatch },
    ]
    contexts.splice(1, 0, {
      id: 'with-global-base',
      title: 'With Current Global Base',
      description: 'Simulasi profile ini saat diwariskan di atas global base yang sedang aktif sekarang.',
      config: applyLayerStack(inheritedLayers),
      fieldSources: buildFieldSourceMap(inheritedLayers),
    })
  }

  return contexts
}

function applyLayerStack(
  layers: Array<{ label: PreviewSourceLabel; patch: HomeExperiencePatch | null }>
): HomeExperienceResolvedConfig {
  return layers.reduce(
    (config, layer) => applyHomeExperiencePatch(config, layer.patch),
    FALLBACK_HOME_EXPERIENCE_CONFIG
  )
}

function buildFieldSourceMap(
  layers: Array<{ label: PreviewSourceLabel; patch: HomeExperiencePatch | null }>
): EffectivePreviewContext['fieldSources'] {
  return {
    logoUrl: resolvePatchSource(layers, 'logoUrl'),
    homeBackgroundUrl: resolvePatchSource(layers, 'homeBackgroundUrl'),
    menus: resolvePatchSource(layers, 'menus'),
    splash: resolvePatchSource(layers, 'splash'),
    sounds: resolvePatchSource(layers, 'sounds'),
  }
}

function resolvePatchSource(
  layers: Array<{ label: PreviewSourceLabel; patch: HomeExperiencePatch | null }>,
  key: keyof HomeExperiencePatch
): PreviewSourceLabel {
  for (let index = layers.length - 1; index >= 0; index -= 1) {
    const layer = layers[index]
    if (layer.patch && key in layer.patch) return layer.label
  }
  return 'fallback'
}

function EffectivePreviewSection({ contexts }: { contexts: EffectivePreviewContext[] }) {
  if (contexts.length === 0) return null

  return (
    <div className="card rounded-2xl p-5 space-y-6">
      <div className="space-y-2 border-b border-border pb-4">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Effective Preview</div>
        <div className="text-sm font-semibold text-foreground">Simulasi Hasil Merge Nyata</div>
        <p className="text-[11px] text-muted-foreground">
          Panel ini menampilkan hasil config final setelah inheritance diterapkan pada beberapa skenario assignment yang relevan.
        </p>
      </div>

      <div className="space-y-6">
        {contexts.map((context) => (
          <div key={context.id} className="space-y-4 rounded-2xl border border-border bg-accent/10 p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="text-sm font-semibold text-foreground">{context.title}</div>
                <p className="mt-1 text-[11px] text-muted-foreground">{context.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] md:grid-cols-3">
                <SourceBadge label="Logo" source={context.fieldSources.logoUrl} />
                <SourceBadge label="Background" source={context.fieldSources.homeBackgroundUrl} />
                <SourceBadge label="Menus" source={context.fieldSources.menus} />
                <SourceBadge label="Splash" source={context.fieldSources.splash} />
                <SourceBadge label="Sounds" source={context.fieldSources.sounds} />
              </div>
            </div>

            <HomeExperiencePreview config={context.config} />
          </div>
        ))}
      </div>
    </div>
  )
}

function SourceBadge({ label, source }: { label: string; source: PreviewSourceLabel }) {
  const tone =
    source === 'device'
      ? 'border-rose-500/20 bg-rose-500/10 text-rose-300'
      : source === 'group'
        ? 'border-sky-500/20 bg-sky-500/10 text-sky-300'
        : source === 'global'
          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
          : 'border-border bg-background/40 text-muted-foreground'

  const sourceLabel =
    source === 'device'
      ? 'Device'
      : source === 'group'
        ? 'Group'
        : source === 'global'
          ? 'Global'
          : 'Fallback'

  return (
    <div className={`rounded-xl border px-2.5 py-2 ${tone}`}>
      <div className="font-semibold">{label}</div>
      <div className="mt-0.5 uppercase tracking-wider">{sourceLabel}</div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function resolveImageAsset(
  formData: FormData,
  fieldName: string,
  prefix: string,
  kind: ImageAssetKind,
  fallbackUrl: string
): Promise<string> {
  const file = formData.get(fieldName)
  if (file instanceof File && file.size > 0) {
    return saveHomeExperienceImage(file, prefix, kind)
  }
  return fallbackUrl
}

async function resolveAudioAsset(
  formData: FormData,
  fieldName: string,
  prefix: string,
  fallbackUrl: string
): Promise<string> {
  const file = formData.get(fieldName)
  if (file instanceof File && file.size > 0) {
    return saveHomeExperienceAudio(file, prefix)
  }
  return fallbackUrl
}
