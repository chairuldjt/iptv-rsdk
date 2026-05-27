import prisma from '@/lib/db'
import { getDeviceGroupAssignments } from '@/lib/deviceGroups'
import {
  getVideoGlobalProfileId,
  getVideoBroadcastGroupProfileMap,
  getVideoBroadcastDeviceProfileMap,
} from '@/lib/videoBroadcast'
import {
  getRunningGlobalProfileId,
  getRunningTextGroupProfileMap,
  getRunningTextDeviceProfileMap,
} from '@/lib/runningText'

export type TargetMode = 'global' | 'group' | 'device' | 'selected'

/**
 * Resolve the list of target device IDs based on the targeting mode.
 * Used by both Video Broadcast and Running Text live actions to avoid
 * duplicating the same resolution logic in every server action.
 */
export async function resolveRecipientDevices(opts: {
  mode: TargetMode
  groupId?: string
  deviceId?: string
  selectedDeviceIds?: string[]
}): Promise<string[]> {
  const { mode, groupId, deviceId, selectedDeviceIds } = opts

  if (mode === 'global') {
    const devices = await prisma.device.findMany({
      where: { isActive: true },
      select: { deviceId: true },
    })
    return devices.map((d) => d.deviceId)
  }

  if (mode === 'group' && groupId) {
    const assignments = await getDeviceGroupAssignments()
    const groupDeviceIds = Object.entries(assignments)
      .filter(([, gid]) => gid === groupId)
      .map(([did]) => did)
    const devices = await prisma.device.findMany({
      where: { deviceId: { in: groupDeviceIds }, isActive: true },
      select: { deviceId: true },
    })
    return devices.map((d) => d.deviceId)
  }

  if (mode === 'device' && deviceId) {
    return [deviceId]
  }

  if (mode === 'selected' && selectedDeviceIds && selectedDeviceIds.length > 0) {
    return selectedDeviceIds
  }

  return []
}

/**
 * Extract common targeting fields from FormData.
 */
export function extractTargetFields(formData: FormData, prefix = ''): {
  mode: TargetMode
  groupId: string
  deviceId: string
  selectedDeviceIds: string[]
} {
  const modeKey = prefix ? `${prefix}TargetMode` : 'liveTargetMode'
  const groupKey = prefix ? `${prefix}GroupId` : 'liveGroupId'
  const deviceKey = prefix ? `${prefix}DeviceId` : 'liveDeviceId'
  const selectedKey = prefix ? `${prefix}SelectedDeviceIds` : 'selectedDeviceIds'

  return {
    mode: ((formData.get(modeKey) as string) || 'global') as TargetMode,
    groupId: (formData.get(groupKey) as string) || '',
    deviceId: (formData.get(deviceKey) as string) || '',
    selectedDeviceIds: formData.getAll(selectedKey) as string[],
  }
}

/**
 * Automatically resolve active recipient device IDs assigned to a specific profile
 * (either globally, by group, or directly by device).
 */
export async function resolveProfileRecipientDevices(
  profileId: string,
  type: 'video' | 'running'
): Promise<string[]> {
  // 1. Get all active devices
  const activeDevices = await prisma.device.findMany({
    where: { isActive: true },
    select: { deviceId: true },
  })
  const activeDeviceIds = activeDevices.map((d) => d.deviceId)

  // 2. Check if Global profile
  if (type === 'video') {
    const globalId = await getVideoGlobalProfileId()
    if (globalId === profileId) {
      return activeDeviceIds
    }
  } else {
    const globalId = await getRunningGlobalProfileId()
    if (globalId === profileId) {
      return activeDeviceIds
    }
  }

  // 3. Find group assignments for this profile
  const groupMap = type === 'video'
    ? await getVideoBroadcastGroupProfileMap()
    : await getRunningTextGroupProfileMap()

  const assignedGroupIds = Object.entries(groupMap)
    .filter(([, pid]) => pid === profileId)
    .map(([gid]) => gid)

  // 4. Find device assignments for this profile
  const deviceMap = type === 'video'
    ? await getVideoBroadcastDeviceProfileMap()
    : await getRunningTextDeviceProfileMap()

  const assignedDeviceIds = Object.entries(deviceMap)
    .filter(([, pid]) => pid === profileId)
    .map(([did]) => did)

  // 5. Find device-to-group assignments to resolve group devices
  const groupAssignments = await getDeviceGroupAssignments()

  const devicesInAssignedGroups = activeDeviceIds.filter((did) => {
    const gid = groupAssignments[did]
    return gid && assignedGroupIds.includes(gid)
  })

  const directlyAssignedDevices = activeDeviceIds.filter((did) =>
    assignedDeviceIds.includes(did)
  )

  // Return unique combination of both sets
  return Array.from(new Set([...devicesInAssignedGroups, ...directlyAssignedDevices]))
}
