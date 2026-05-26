import prisma from '@/lib/db'

const DEVICE_GROUPS_KEY = 'device.groups'
const DEVICE_GROUP_ASSIGNMENTS_KEY = 'device.groupAssignments'

export type DeviceGroup = {
  id: string
  name: string
  description: string
  color: string
  createdAt: string
}

type DeviceGroupAssignments = Record<string, string>

export async function getDeviceGroups(): Promise<DeviceGroup[]> {
  const setting = await prisma.appSetting.findUnique({
    where: { key: DEVICE_GROUPS_KEY },
  })

  if (!setting?.value) return []

  try {
    return normalizeDeviceGroups(JSON.parse(setting.value))
  } catch {
    return []
  }
}

export async function saveDeviceGroups(groups: DeviceGroup[]): Promise<void> {
  const safeGroups = normalizeDeviceGroups(groups)

  await prisma.appSetting.upsert({
    where: { key: DEVICE_GROUPS_KEY },
    update: { value: JSON.stringify(safeGroups) },
    create: {
      key: DEVICE_GROUPS_KEY,
      value: JSON.stringify(safeGroups),
    },
  })
}

export async function createDeviceGroup(input: {
  name: string
  description?: string
  color?: string
}): Promise<DeviceGroup> {
  const groups = await getDeviceGroups()
  const safeName = input.name.trim()
  const group: DeviceGroup = {
    id: `grp_${Date.now()}`,
    name: safeName || 'Untitled Group',
    description: (input.description || '').trim(),
    color: normalizeHexColor(input.color || '#2EE6C6'),
    createdAt: new Date().toISOString(),
  }
  groups.push(group)
  await saveDeviceGroups(groups)
  return group
}

export async function deleteDeviceGroup(groupId: string): Promise<void> {
  const groups = await getDeviceGroups()
  await saveDeviceGroups(groups.filter((group) => group.id !== groupId))

  const assignments = await getDeviceGroupAssignments()
  const nextAssignments = Object.fromEntries(
    Object.entries(assignments).filter(([, assignedGroupId]) => assignedGroupId !== groupId)
  )
  await saveDeviceGroupAssignments(nextAssignments)
}

export async function updateDeviceGroup(input: DeviceGroup): Promise<void> {
  const groups = await getDeviceGroups()
  const nextGroups = groups.map((group) =>
    group.id === input.id
      ? {
          ...group,
          name: input.name.trim() || group.name,
          description: input.description.trim(),
          color: normalizeHexColor(input.color),
        }
      : group
  )
  await saveDeviceGroups(nextGroups)
}

export async function getDeviceGroupAssignments(): Promise<DeviceGroupAssignments> {
  const setting = await prisma.appSetting.findUnique({
    where: { key: DEVICE_GROUP_ASSIGNMENTS_KEY },
  })

  if (!setting?.value) return {}

  try {
    return normalizeAssignments(JSON.parse(setting.value))
  } catch {
    return {}
  }
}

export async function saveDeviceGroupAssignments(assignments: DeviceGroupAssignments): Promise<void> {
  const safeAssignments = normalizeAssignments(assignments)

  await prisma.appSetting.upsert({
    where: { key: DEVICE_GROUP_ASSIGNMENTS_KEY },
    update: { value: JSON.stringify(safeAssignments) },
    create: {
      key: DEVICE_GROUP_ASSIGNMENTS_KEY,
      value: JSON.stringify(safeAssignments),
    },
  })
}

export async function assignDeviceToGroup(deviceId: string, groupId: string | null): Promise<void> {
  const assignments = await getDeviceGroupAssignments()
  if (!groupId) {
    delete assignments[deviceId]
  } else {
    assignments[deviceId] = groupId
  }
  await saveDeviceGroupAssignments(assignments)
}

export async function getDeviceGroupForDevice(deviceId: string): Promise<string | null> {
  const assignments = await getDeviceGroupAssignments()
  return assignments[deviceId] || null
}

function normalizeDeviceGroups(value: unknown): DeviceGroup[] {
  if (!Array.isArray(value)) return []

  return value
    .filter((entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null)
    .map((entry, index) => ({
      id: safeString(entry.id, `grp_${index}_${Date.now()}`),
      name: safeString(entry.name, 'Untitled Group'),
      description: safeString(entry.description, ''),
      color: normalizeHexColor(safeString(entry.color, '#2EE6C6')),
      createdAt: safeString(entry.createdAt, new Date(0).toISOString()),
    }))
}

function normalizeAssignments(value: unknown): DeviceGroupAssignments {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  const entries = Object.entries(value).filter(
    ([deviceId, groupId]) => typeof deviceId === 'string' && typeof groupId === 'string' && deviceId.trim() && groupId.trim()
  )

  return Object.fromEntries(entries)
}

function safeString(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  return trimmed || fallback
}

function normalizeHexColor(value: string): string {
  const trimmed = value.trim()
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed.toUpperCase() : '#2EE6C6'
}
