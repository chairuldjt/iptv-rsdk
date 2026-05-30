'use server'

import { redirect, RedirectType } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import {
  createRunningTextProfile,
  updateRunningTextProfileMeta,
  saveRunningTextProfileConfig,
  deleteRunningTextProfile,
  setRunningGlobalProfileId,
  assignRunningTextProfileToGroup,
  assignRunningTextProfileToDevice,
  cloneRunningTextProfile,
  exportRunningTextProfile,
  importRunningTextProfile,
  toggleRunningTextProfileLock,
  toggleRunningTextProfileEnabled,
  renameRunningTextProfile,
  unsetRunningGlobalProfile,
  type RunningTextProfileExport,
} from '@/lib/runningText'
import type { HomeExperienceRunningTextItem } from '@/lib/homeExperience'
import { pushCommand } from '@/lib/remoteQueue'
import { resolveProfileRecipientDevices } from '../_lib/resolveRecipients'

// ── Helper ────────────────────────────────────────────────────────────────────

function parseRunningTextItems(formData: FormData): HomeExperienceRunningTextItem[] {
  const raw = formData.get('rtItemsJson')
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    } catch { /* ignore */ }
  }
  return []
}

function hasActiveRunningItems(items: HomeExperienceRunningTextItem[]): boolean {
  return items.some((item) => item.enabled && item.text.trim().length > 0)
}

// ── Profile CRUD ──────────────────────────────────────────────────────────────

export async function createRunningProfileAction(formData: FormData) {
  const name = (formData.get('profileName') as string) || ''
  const description = (formData.get('profileDescription') as string) || ''
  const profile = await createRunningTextProfile({ name, description })
  revalidatePath('/dashboard/broadcast')
  redirect(`/dashboard/broadcast?tab=ticker&editRunningProfile=${encodeURIComponent(profile.id)}&created=1`)
}

export async function updateRunningProfileMetaAction(formData: FormData) {
  const profileId = (formData.get('profileId') as string) || ''
  const name = (formData.get('profileName') as string) || ''
  const description = (formData.get('profileDescription') as string) || ''
  if (profileId) await updateRunningTextProfileMeta(profileId, { name, description })
  revalidatePath('/dashboard/broadcast')
  redirect(`/dashboard/broadcast?tab=ticker&updated=1`)
}

export async function saveRunningProfileConfigAction(formData: FormData) {
  const profileId = (formData.get('profileId') as string) || ''
  if (!profileId) return
  const items: HomeExperienceRunningTextItem[] = parseRunningTextItems(formData)
  const visibleCount = parseInt((formData.get('rtVisibleCount') as string) || '1', 10)
  const rotationSeconds = parseInt((formData.get('rtRotationSeconds') as string) || '10', 10)
  const displaySeconds = parseInt((formData.get('rtDisplaySeconds') as string) || '10', 10)

  await saveRunningTextProfileConfig(profileId, {
    enabled: false,
    visibleCount: Math.max(1, Math.min(10, visibleCount)),
    rotationSeconds: Math.max(1, Math.min(600, rotationSeconds)),
    displaySeconds: Math.max(0, Math.min(600, displaySeconds)),
    items,
  })

  revalidatePath('/dashboard/broadcast')
  redirect(`/dashboard/broadcast?tab=ticker&editRunningProfile=${encodeURIComponent(profileId)}&saved=1`, RedirectType.replace)
}

export async function deleteRunningProfileAction(formData: FormData) {
  const profileId = (formData.get('profileId') as string) || ''
  if (profileId) await deleteRunningTextProfile(profileId)
  revalidatePath('/dashboard/broadcast')
  redirect('/dashboard/broadcast?tab=ticker&deleted=1')
}

export async function cloneRunningProfileAction(formData: FormData) {
  'use server'
  const profileId = (formData.get('profileId') as string) || ''
  if (!profileId) return
  const cloned = await cloneRunningTextProfile(profileId)
  if (cloned) {
    revalidatePath('/dashboard/broadcast')
    redirect(`/dashboard/broadcast?tab=ticker&cloned=1`)
  }
}

export async function renameRunningProfileAction(formData: FormData) {
  'use server'
  const profileId = (formData.get('profileId') as string) || ''
  const newName = (formData.get('profileName') as string) || ''
  if (profileId && newName) {
    await renameRunningTextProfile(profileId, newName)
  }
  revalidatePath('/dashboard/broadcast')
  redirect(`/dashboard/broadcast?tab=ticker&updated=1`)
}

export async function exportRunningProfileAction(formData: FormData) {
  'use server'
  const profileId = (formData.get('profileId') as string) || ''
  if (!profileId) return

  const exportData = await exportRunningTextProfile(profileId)
  if (!exportData) return

  const json = JSON.stringify(exportData, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  redirect(url)
}

export async function importRunningProfileAction(formData: FormData) {
  'use server'
  const jsonData = (formData.get('importData') as string) || ''
  if (!jsonData) {
    redirect('/dashboard/broadcast?tab=ticker&importError=No+data+provided')
    return
  }

  try {
    const data = JSON.parse(jsonData) as RunningTextProfileExport
    const imported = await importRunningTextProfile(data)
    if (imported) {
      revalidatePath('/dashboard/broadcast')
      redirect(`/dashboard/broadcast?tab=ticker&imported=1`)
    } else {
      redirect('/dashboard/broadcast?tab=ticker&importError=Invalid+profile+data')
    }
  } catch {
    redirect('/dashboard/broadcast?tab=ticker&importError=Invalid+JSON+format')
  }
}

export async function toggleRunningLockAction(formData: FormData) {
  'use server'
  const profileId = (formData.get('profileId') as string) || ''
  if (profileId) await toggleRunningTextProfileLock(profileId)
  revalidatePath('/dashboard/broadcast')
  redirect('/dashboard/broadcast?tab=ticker&locked=1')
}

export async function toggleRunningEnabledAction(formData: FormData) {
  'use server'
  const profileId = (formData.get('profileId') as string) || ''
  if (profileId) await toggleRunningTextProfileEnabled(profileId)
  revalidatePath('/dashboard/broadcast')
  redirect('/dashboard/broadcast?tab=ticker&enabledToggled=1')
}

export async function unsetRunningGlobalAction() {
  'use server'
  await unsetRunningGlobalProfile()
  revalidatePath('/dashboard/broadcast')
  redirect('/dashboard/broadcast?tab=ticker&globalUnset=1')
}

// ── Global & Assignment ───────────────────────────────────────────────────────

export async function setRunningGlobalAction(formData: FormData) {
  const profileId = (formData.get('profileId') as string) || ''
  if (profileId) await setRunningGlobalProfileId(profileId)
  revalidatePath('/dashboard/broadcast')
  redirect('/dashboard/broadcast?tab=ticker&globalSet=1')
}

export async function assignRunningGroupAction(formData: FormData) {
  const profileId = (formData.get('profileId') as string) || ''
  const groupId = (formData.get('groupId') as string) || ''
  const action = (formData.get('action') as string) || 'assign'
  if (profileId && groupId) {
    await assignRunningTextProfileToGroup(groupId, action === 'assign' ? profileId : null)
  }
  revalidatePath('/dashboard/broadcast')
  redirect(`/dashboard/broadcast?tab=ticker&assignRunningProfile=${encodeURIComponent(profileId)}&ok=1`)
}

export async function assignRunningDeviceAction(formData: FormData) {
  const profileId = (formData.get('profileId') as string) || ''
  const deviceId = (formData.get('deviceId') as string) || ''
  const action = (formData.get('action') as string) || 'assign'
  if (profileId && deviceId) {
    await assignRunningTextProfileToDevice(deviceId, action === 'assign' ? profileId : null)
  }
  revalidatePath('/dashboard/broadcast')
  redirect(`/dashboard/broadcast?tab=ticker&assignRunningProfile=${encodeURIComponent(profileId)}&ok=1`)
}

// ── Modal-compatible Assignment (no redirect) ────────────────────────────────

export async function assignRunningGroupModalAction(profileId: string, groupId: string, assign: boolean): Promise<{ success: boolean }> {
  'use server'
  try {
    await assignRunningTextProfileToGroup(groupId, assign ? profileId : null)
    revalidatePath('/dashboard/broadcast')
    return { success: true }
  } catch {
    return { success: false }
  }
}

export async function assignRunningDeviceModalAction(profileId: string, deviceId: string, assign: boolean): Promise<{ success: boolean }> {
  'use server'
  try {
    await assignRunningTextProfileToDevice(deviceId, assign ? profileId : null)
    revalidatePath('/dashboard/broadcast')
    return { success: true }
  } catch {
    return { success: false }
  }
}

// ── Live Execution ────────────────────────────────────────────────────────────

export async function pushRunningTextLiveAction(formData: FormData) {
  const profileId = (formData.get('profileId') as string) || ''
  const items: HomeExperienceRunningTextItem[] = parseRunningTextItems(formData)
  const enabled = hasActiveRunningItems(items)
  const visibleCount = parseInt((formData.get('rtVisibleCount') as string) || '1', 10)
  const rotationSeconds = parseInt((formData.get('rtRotationSeconds') as string) || '10', 10)
  const displaySeconds = parseInt((formData.get('rtDisplaySeconds') as string) || '10', 10)

  const payload = JSON.stringify({
    enabled,
    items,
    visibleCount,
    rotationSeconds: Math.max(1, Math.min(600, rotationSeconds)),
    displaySeconds: Math.max(0, Math.min(600, displaySeconds)),
  })

  const recipients = await resolveProfileRecipientDevices(profileId, 'running')
  if (recipients.length === 0) {
    revalidatePath('/dashboard/broadcast')
    redirect(
      `/dashboard/broadcast?tab=ticker&editRunningProfile=${encodeURIComponent(profileId)}&error=${encodeURIComponent(
        'Tidak ada device aktif yang menjadi target profile ini.'
      )}`,
      RedirectType.replace
    )
  }

  for (const deviceId of recipients) {
    pushCommand(deviceId, 'UPDATE_RUNNING_TEXT', payload)
  }

  revalidatePath('/dashboard/broadcast')
  if (profileId) {
    redirect(
      `/dashboard/broadcast?tab=ticker&editRunningProfile=${encodeURIComponent(profileId)}&notice=running-live-queued&count=${recipients.length}`,
      RedirectType.replace
    )
  } else {
    redirect(`/dashboard/broadcast?tab=ticker&notice=running-live-queued&count=${recipients.length}`, RedirectType.replace)
  }
}

export async function stopRunningTextLiveAction(formData: FormData) {
  const profileId = (formData.get('profileId') as string) || ''
  const recipients = await resolveProfileRecipientDevices(profileId, 'running')

  if (recipients.length === 0) {
    revalidatePath('/dashboard/broadcast')
    redirect(
      `/dashboard/broadcast?tab=ticker&editRunningProfile=${encodeURIComponent(profileId)}&error=${encodeURIComponent(
        'Tidak ada device aktif yang bisa dikirimi perintah stop.'
      )}`,
      RedirectType.replace
    )
  }

  const payload = JSON.stringify({
    enabled: false,
    items: [],
    visibleCount: 1,
    rotationSeconds: 10,
    displaySeconds: 0,
  })

  for (const deviceId of recipients) {
    pushCommand(deviceId, 'UPDATE_RUNNING_TEXT', payload)
  }

  revalidatePath('/dashboard/broadcast')
  redirect(
    `/dashboard/broadcast?tab=ticker&editRunningProfile=${encodeURIComponent(profileId)}&notice=running-live-stopped&count=${recipients.length}`,
    RedirectType.replace
  )
}
