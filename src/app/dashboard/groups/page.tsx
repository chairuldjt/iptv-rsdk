import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import prisma from '@/lib/db'
import {
  assignDeviceToGroup,
  createDeviceGroup,
  deleteDeviceGroup,
  getDeviceGroupAssignments,
  getDeviceGroups,
  updateDeviceGroup,
} from '@/lib/deviceGroups'
import { getCurrentTimestamp } from '@/lib/time'
import GroupsManagerClient from './GroupsManagerClient'

export const revalidate = 0

async function createGroupAction(formData: FormData) {
  'use server'
  const name = (formData.get('groupName') as string) || ''
  const description = (formData.get('groupDescription') as string) || ''
  const color = (formData.get('groupColor') as string) || '#2EE6C6'
  const group = await createDeviceGroup({ name, description, color })
  revalidatePath('/dashboard/groups')
  revalidatePath('/dashboard/experience')
  revalidatePath('/dashboard/devices')
  redirect(`/dashboard/groups?created=${group.id}`)
}

async function updateGroupAction(formData: FormData) {
  'use server'
  const id = (formData.get('groupId') as string) || ''
  const name = (formData.get('groupName') as string) || ''
  const description = (formData.get('groupDescription') as string) || ''
  const color = (formData.get('groupColor') as string) || '#2EE6C6'
  if (id) {
    await updateDeviceGroup({ id, name, description, color, createdAt: '' })
  }
  revalidatePath('/dashboard/groups')
  revalidatePath('/dashboard/experience')
  revalidatePath('/dashboard/devices')
  redirect(`/dashboard/groups?updated=1`)
}

async function deleteGroupAction(formData: FormData) {
  'use server'
  const groupId = (formData.get('groupId') as string) || ''
  if (groupId) {
    await deleteDeviceGroup(groupId)
  }
  revalidatePath('/dashboard/groups')
  revalidatePath('/dashboard/experience')
  revalidatePath('/dashboard/devices')
  redirect('/dashboard/groups?deleted=1')
}

async function assignDeviceAction(formData: FormData) {
  'use server'
  const deviceId = (formData.get('deviceId') as string) || ''
  const groupId = ((formData.get('groupId') as string) || '').trim() || null
  if (deviceId) {
    await assignDeviceToGroup(deviceId, groupId)
  }
  revalidatePath('/dashboard/groups')
  revalidatePath('/dashboard/experience')
  revalidatePath('/dashboard/devices')
  redirect('/dashboard/groups?assigned=1')
}

async function removeDeviceAction(formData: FormData) {
  'use server'
  const deviceId = (formData.get('deviceId') as string) || ''
  if (deviceId) {
    await assignDeviceToGroup(deviceId, null)
  }
  revalidatePath('/dashboard/groups')
  revalidatePath('/dashboard/experience')
  revalidatePath('/dashboard/devices')
  redirect('/dashboard/groups?removed=1')
}

async function assignDevicesBulkAction(formData: FormData) {
  'use server'
  const deviceIds = formData.getAll('deviceIds') as string[]
  const groupId = ((formData.get('groupId') as string) || '').trim() || null
  for (const deviceId of deviceIds) {
    if (deviceId) {
      await assignDeviceToGroup(deviceId, groupId)
    }
  }
  revalidatePath('/dashboard/groups')
  revalidatePath('/dashboard/experience')
  revalidatePath('/dashboard/devices')
  redirect('/dashboard/groups?assigned=1')
}

async function removeDevicesBulkAction(formData: FormData) {
  'use server'
  const deviceIds = formData.getAll('deviceIds') as string[]
  for (const deviceId of deviceIds) {
    if (deviceId) {
      await assignDeviceToGroup(deviceId, null)
    }
  }
  revalidatePath('/dashboard/groups')
  revalidatePath('/dashboard/experience')
  revalidatePath('/dashboard/devices')
  redirect('/dashboard/groups?removed=1')
}

export default async function GroupsPage({
  searchParams,
}: {
  searchParams: Promise<{
    created?: string
    updated?: string
    deleted?: string
    assigned?: string
    removed?: string
    edit?: string
  }>
}) {
  const resolved = await searchParams

  const groups = await getDeviceGroups()
  const assignments = await getDeviceGroupAssignments()
  const allDevices = await prisma.device.findMany({
    orderBy: [{ deviceName: 'asc' }, { deviceId: 'asc' }],
    select: { deviceId: true, deviceName: true, isActive: true, lastOnline: true },
  })

  // Serialize Date objects to safe ISO string representation to pass down to Client component
  const serializedDevices = allDevices.map((d) => ({
    deviceId: d.deviceId,
    deviceName: d.deviceName,
    isActive: d.isActive,
    lastOnline: d.lastOnline ? d.lastOnline.toISOString() : null,
  }))

  return (
    <GroupsManagerClient
      groups={groups}
      assignments={assignments}
      devices={serializedDevices}
      currentTimestamp={getCurrentTimestamp()}
      searchParams={resolved}
      createGroupAction={createGroupAction}
      updateGroupAction={updateGroupAction}
      deleteGroupAction={deleteGroupAction}
      assignDeviceAction={assignDeviceAction}
      removeDeviceAction={removeDeviceAction}
      assignDevicesBulkAction={assignDevicesBulkAction}
      removeDevicesBulkAction={removeDevicesBulkAction}
    />
  )
}
