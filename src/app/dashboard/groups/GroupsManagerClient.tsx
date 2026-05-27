'use client'

import React, { useState, useMemo, useEffect, useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useToast } from '@/components/Toast'
import PageHeader from '@/components/PageHeader'
import Badge, { StatusDot } from '@/components/Badge'
import Modal from '@/components/Modal'
import ConfirmDialog from '@/components/ConfirmDialog'
import Button from '@/components/Button'

const PRESET_COLORS = [
  { name: 'Teal', hex: '#2EE6C6' },
  { name: 'Indigo', hex: '#6D6FFB' },
  { name: 'Emerald', hex: '#10B981' },
  { name: 'Amber', hex: '#F59E0B' },
  { name: 'Rose', hex: '#F43F5E' },
  { name: 'Sky', hex: '#0EA5E9' },
  { name: 'Violet', hex: '#8B5CF6' },
  { name: 'Pink', hex: '#EC4899' },
  { name: 'Orange', hex: '#F97316' },
]

export type DeviceGroup = {
  id: string
  name: string
  description: string
  color: string
  createdAt: string
}

type SerializedDevice = {
  deviceId: string
  deviceName: string
  isActive: boolean
  lastOnline: string | null
}

interface GroupsManagerClientProps {
  groups: DeviceGroup[]
  assignments: Record<string, string>
  devices: SerializedDevice[]
  currentTimestamp: number
  searchParams: {
    created?: string
    updated?: string
    deleted?: string
    assigned?: string
    removed?: string
    edit?: string
  }
  createGroupAction: (formData: FormData) => Promise<void>
  updateGroupAction: (formData: FormData) => Promise<void>
  deleteGroupAction: (formData: FormData) => Promise<void>
  assignDeviceAction: (formData: FormData) => Promise<void>
  removeDeviceAction: (formData: FormData) => Promise<void>
  assignDevicesBulkAction: (formData: FormData) => Promise<void>
  removeDevicesBulkAction: (formData: FormData) => Promise<void>
}

export default function GroupsManagerClient({
  groups,
  assignments,
  devices,
  currentTimestamp,
  searchParams,
  createGroupAction,
  updateGroupAction,
  deleteGroupAction,
  assignDeviceAction,
  removeDeviceAction,
  assignDevicesBulkAction,
  removeDevicesBulkAction,
}: GroupsManagerClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const currentSearchParams = useSearchParams()
  const { showToast } = useToast()
  const [isPending, startTransition] = useTransition()

  // State filters & search
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOption, setSortOption] = useState<'name-asc' | 'name-desc' | 'devices-desc' | 'devices-asc'>('name-asc')
  const [filterOption, setFilterOption] = useState<'all' | 'has-devices' | 'empty'>('all')
  const [unassignedSearchQuery, setUnassignedSearchQuery] = useState('')

  // Modal open states
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [prevEditId, setPrevEditId] = useState<string | undefined>(searchParams.edit)
  const [editingGroup, setEditingGroup] = useState<DeviceGroup | null>(() => {
    const editId = searchParams.edit
    return editId ? (groups.find((group) => group.id === editId) || null) : null
  })

  // Adjust state when searchParams.edit prop changes
  if (searchParams.edit !== prevEditId) {
    setPrevEditId(searchParams.edit)
    const g = searchParams.edit ? (groups.find((group) => group.id === searchParams.edit) || null) : null
    setEditingGroup(g)
  }

  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null)

  // Selection states (for bulk actions)
  const [selectedUnassigned, setSelectedUnassigned] = useState<string[]>([])
  const [selectedMembers, setSelectedMembers] = useState<Record<string, string[]>>({})
  const [bulkTargetGroupId, setBulkTargetGroupId] = useState('')

  // Memoized lookups
  const deletingGroup = useMemo(() => {
    return deletingGroupId ? (groups.find((g) => g.id === deletingGroupId) || null) : null
  }, [deletingGroupId, groups])

  // Handle toasts from redirects/searchParams
  useEffect(() => {
    const created = currentSearchParams.get('created')
    const updated = currentSearchParams.get('updated')
    const deleted = currentSearchParams.get('deleted')
    const assigned = currentSearchParams.get('assigned')
    const removed = currentSearchParams.get('removed')

    if (created || updated || deleted || assigned || removed) {
      if (created) showToast('success', 'Grup baru berhasil dibuat.')
      if (updated) showToast('success', 'Grup berhasil diperbarui.')
      if (deleted) showToast('success', 'Grup berhasil dihapus beserta assignment-nya.')
      if (assigned) showToast('success', 'Perangkat berhasil dimasukkan ke grup.')
      if (removed) showToast('success', 'Perangkat berhasil dikeluarkan dari grup.')

      const params = new URLSearchParams(currentSearchParams.toString())
      params.delete('created')
      params.delete('updated')
      params.delete('deleted')
      params.delete('assigned')
      params.delete('removed')
      params.delete('edit')
      const newQuery = params.toString()
      router.replace(`${pathname}${newQuery ? `?${newQuery}` : ''}`, { scroll: false })
    }
  }, [currentSearchParams, pathname, router, showToast])

  // editingGroup is synchronized with searchParams.edit at render time

  const isDeviceOnline = (d: SerializedDevice) => {
    if (!d.isActive || !d.lastOnline) return false
    const tenMinutesAgo = currentTimestamp - 10 * 60 * 1000
    return new Date(d.lastOnline).getTime() >= tenMinutesAgo
  }

  const groupDeviceMap = useMemo(() => {
    const map = new Map<string, SerializedDevice[]>()
    for (const group of groups) map.set(group.id, [])
    for (const d of devices) {
      const gid = assignments[d.deviceId]
      if (gid && map.has(gid)) map.get(gid)!.push(d)
    }
    return map
  }, [groups, devices, assignments])

  const unassignedDevices = useMemo(() => {
    return devices.filter((d) => !assignments[d.deviceId])
  }, [devices, assignments])

  const filteredUnassignedDevices = useMemo(() => {
    if (!unassignedSearchQuery) return unassignedDevices
    const q = unassignedSearchQuery.toLowerCase()
    return unassignedDevices.filter(
      (d) => d.deviceName.toLowerCase().includes(q) || d.deviceId.toLowerCase().includes(q)
    )
  }, [unassignedDevices, unassignedSearchQuery])

  const processedGroups = useMemo(() => {
    let result = [...groups]
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (g) => g.name.toLowerCase().includes(q) || g.description.toLowerCase().includes(q)
      )
    }
    if (filterOption === 'has-devices') {
      result = result.filter((g) => (groupDeviceMap.get(g.id) || []).length > 0)
    } else if (filterOption === 'empty') {
      result = result.filter((g) => (groupDeviceMap.get(g.id) || []).length === 0)
    }
    result.sort((a, b) => {
      const countA = (groupDeviceMap.get(a.id) || []).length
      const countB = (groupDeviceMap.get(b.id) || []).length
      if (sortOption === 'name-asc') return a.name.localeCompare(b.name)
      if (sortOption === 'name-desc') return b.name.localeCompare(a.name)
      if (sortOption === 'devices-desc') return countB - countA || a.name.localeCompare(b.name)
      if (sortOption === 'devices-asc') return countA - countB || a.name.localeCompare(b.name)
      return 0
    })
    return result
  }, [groups, searchQuery, filterOption, sortOption, groupDeviceMap])

  const totalGroups = groups.length
  const totalAssigned = devices.length - unassignedDevices.length
  const totalUnassigned = unassignedDevices.length

  // Programmatic server actions with useTransition
  const handleCreateOrUpdate = async (formData: FormData) => {
    startTransition(async () => {
      try {
        if (editingGroup) {
          await updateGroupAction(formData)
          setEditingGroup(null)
        } else {
          await createGroupAction(formData)
          setIsCreateOpen(false)
        }
      } catch (err: unknown) {
        const isRedirect =
          err instanceof Error &&
          (err.message.includes('NEXT_REDIRECT') || ('digest' in err && String((err as { digest?: string }).digest).includes('NEXT_REDIRECT')))
        if (isRedirect) {
          setIsCreateOpen(false)
          setEditingGroup(null)
          return
        }
        console.error(err)
        showToast('error', err instanceof Error ? err.message : 'Gagal memproses data grup.')
      }
    })
  }

  const handleDeleteConfirm = async () => {
    if (!deletingGroupId) return
    const formData = new FormData()
    formData.append('groupId', deletingGroupId)

    startTransition(async () => {
      try {
        await deleteGroupAction(formData)
        setDeletingGroupId(null)
      } catch (err: unknown) {
        const isRedirect =
          err instanceof Error &&
          (err.message.includes('NEXT_REDIRECT') || ('digest' in err && String((err as { digest?: string }).digest).includes('NEXT_REDIRECT')))
        if (isRedirect) {
          setDeletingGroupId(null)
          return
        }
        console.error(err)
        showToast('error', err instanceof Error ? err.message : 'Gagal menghapus grup.')
      }
    })
  }

  const handleAssignDevice = async (groupId: string, deviceId: string) => {
    const formData = new FormData()
    formData.append('groupId', groupId)
    formData.append('deviceId', deviceId)

    startTransition(async () => {
      try {
        await assignDeviceAction(formData)
      } catch (err: unknown) {
        const isRedirect =
          err instanceof Error &&
          (err.message.includes('NEXT_REDIRECT') || ('digest' in err && String((err as { digest?: string }).digest).includes('NEXT_REDIRECT')))
        if (isRedirect) return
        console.error(err)
        showToast('error', err instanceof Error ? err.message : 'Gagal memasukkan perangkat.')
      }
    })
  }

  const handleRemoveDevice = async (deviceId: string) => {
    const formData = new FormData()
    formData.append('deviceId', deviceId)

    startTransition(async () => {
      try {
        await removeDeviceAction(formData)
      } catch (err: unknown) {
        const isRedirect =
          err instanceof Error &&
          (err.message.includes('NEXT_REDIRECT') || ('digest' in err && String((err as { digest?: string }).digest).includes('NEXT_REDIRECT')))
        if (isRedirect) return
        console.error(err)
        showToast('error', err instanceof Error ? err.message : 'Gagal mengeluarkan perangkat.')
      }
    })
  }

  const handleBulkAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedUnassigned.length === 0 || !bulkTargetGroupId) return
    const formData = new FormData()
    formData.append('groupId', bulkTargetGroupId)
    selectedUnassigned.forEach((id) => formData.append('deviceIds', id))

    startTransition(async () => {
      try {
        await assignDevicesBulkAction(formData)
        setSelectedUnassigned([])
        setBulkTargetGroupId('')
      } catch (err: unknown) {
        const isRedirect =
          err instanceof Error &&
          (err.message.includes('NEXT_REDIRECT') || ('digest' in err && String((err as { digest?: string }).digest).includes('NEXT_REDIRECT')))
        if (isRedirect) {
          setSelectedUnassigned([])
          setBulkTargetGroupId('')
          return
        }
        console.error(err)
        showToast('error', err instanceof Error ? err.message : 'Gagal memasukkan perangkat secara massal.')
      }
    })
  }

  const handleBulkRemove = async (groupId: string) => {
    const selected = selectedMembers[groupId] || []
    if (selected.length === 0) return
    const formData = new FormData()
    selected.forEach((id) => formData.append('deviceIds', id))

    startTransition(async () => {
      try {
        await removeDevicesBulkAction(formData)
        setSelectedMembers((prev) => ({ ...prev, [groupId]: [] }))
      } catch (err: unknown) {
        const isRedirect =
          err instanceof Error &&
          (err.message.includes('NEXT_REDIRECT') || ('digest' in err && String((err as { digest?: string }).digest).includes('NEXT_REDIRECT')))
        if (isRedirect) {
          setSelectedMembers((prev) => ({ ...prev, [groupId]: [] }))
          return
        }
        console.error(err)
        showToast('error', err instanceof Error ? err.message : 'Gagal mengeluarkan perangkat secara massal.')
      }
    })
  }

  const toggleSelectAllUnassigned = (all: SerializedDevice[]) => {
    if (selectedUnassigned.length === all.length) {
      setSelectedUnassigned([])
    } else {
      setSelectedUnassigned(all.map((d) => d.deviceId))
    }
  }

  const toggleSelectOneUnassigned = (deviceId: string) => {
    setSelectedUnassigned((prev) =>
      prev.includes(deviceId) ? prev.filter((id) => id !== deviceId) : [...prev, deviceId]
    )
  }

  const toggleSelectAllMembers = (groupId: string, members: SerializedDevice[]) => {
    const current = selectedMembers[groupId] || []
    if (current.length === members.length) {
      setSelectedMembers((prev) => ({ ...prev, [groupId]: [] }))
    } else {
      setSelectedMembers((prev) => ({ ...prev, [groupId]: members.map((m) => m.deviceId) }))
    }
  }

  const toggleSelectOneMember = (groupId: string, deviceId: string) => {
    setSelectedMembers((prev) => {
      const current = prev[groupId] || []
      const updated = current.includes(deviceId) ? current.filter((id) => id !== deviceId) : [...current, deviceId]
      return { ...prev, [groupId]: updated }
    })
  }

  const handleCloseEdit = () => {
    setEditingGroup(null)
    if (currentSearchParams.has('edit')) {
      const params = new URLSearchParams(currentSearchParams.toString())
      params.delete('edit')
      const newQuery = params.toString()
      router.replace(`${pathname}${newQuery ? `?${newQuery}` : ''}`, { scroll: false })
    }
  }

  return (
    <div className="space-y-6 animate-fade-in text-foreground">
      <PageHeader
        title="Device Groups"
        description="Kelola grup perangkat dan keanggotaannya. Perangkat di dalam grup mewarisi konfigurasi Home Experience dari grup tersebut."
        badge="DSA-STYLE"
        actions={
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsCreateOpen(true)}
            className="shadow-sm font-semibold shrink-0 cursor-pointer"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Buat Grup
          </Button>
        }
      />

      {/* Stats Cards */}
      <StatsCards
        totalGroups={totalGroups}
        totalAssigned={totalAssigned}
        totalUnassigned={totalUnassigned}
      />

      {/* Group Toolbar */}
      <GroupToolbar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filterOption={filterOption}
        setFilterOption={setFilterOption}
        sortOption={sortOption}
        setSortOption={setSortOption}
      />

      {/* Main Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Device Groups List */}
        <div className="lg:col-span-2 space-y-6">
          {processedGroups.length === 0 ? (
            <div className="card p-10 text-center border border-white/[0.04] bg-card">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-border flex items-center justify-center text-muted-foreground/60 mx-auto mb-4">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </div>
              <h4 className="font-bold text-foreground">Grup Tidak Ditemukan</h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                {groups.length === 0
                  ? 'Belum ada grup yang dibuat. Mulai dengan membuat grup pertama Anda.'
                  : 'Tidak ada grup yang cocok dengan kriteria pencarian/filter.'}
              </p>
              {groups.length === 0 && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsCreateOpen(true)}
                  className="mt-4"
                >
                  Buat Grup Pertama
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {processedGroups.map((group) => {
                const members = groupDeviceMap.get(group.id) || []
                const checkedMembers = selectedMembers[group.id] || []
                return (
                  <GroupCard
                    key={group.id}
                    group={group}
                    members={members}
                    eligibleToAdd={unassignedDevices}
                    onEdit={setEditingGroup}
                    onDelete={(g) => setDeletingGroupId(g.id)}
                    isPending={isPending}
                    isDeviceOnline={isDeviceOnline}
                    toggleSelectAllMembers={toggleSelectAllMembers}
                    toggleSelectOneMember={toggleSelectOneMember}
                    checkedMembers={checkedMembers}
                    handleBulkRemove={handleBulkRemove}
                    handleAssignDevice={handleAssignDevice}
                    handleRemoveDevice={handleRemoveDevice}
                  />
                )
              })}
            </div>
          )}
        </div>

        {/* Right Column: Device Tanpa Grup Sidebar */}
        <div className="lg:col-span-1">
          <UngroupedDevicesPanel
            unassignedDevices={unassignedDevices}
            filteredUnassignedDevices={filteredUnassignedDevices}
            selectedUnassigned={selectedUnassigned}
            groups={groups}
            unassignedSearchQuery={unassignedSearchQuery}
            setUnassignedSearchQuery={setUnassignedSearchQuery}
            toggleSelectAllUnassigned={toggleSelectAllUnassigned}
            toggleSelectOneUnassigned={toggleSelectOneUnassigned}
            bulkTargetGroupId={bulkTargetGroupId}
            setBulkTargetGroupId={setBulkTargetGroupId}
            handleBulkAssignSubmit={handleBulkAssignSubmit}
            handleAssignDevice={handleAssignDevice}
            isPending={isPending}
            isDeviceOnline={isDeviceOnline}
          />
        </div>
      </div>

      {/* Add / Edit Group Modal */}
      <GroupModal
        key={editingGroup?.id || (isCreateOpen ? 'create' : 'closed')}
        open={isCreateOpen || editingGroup !== null}
        onClose={editingGroup ? handleCloseEdit : () => setIsCreateOpen(false)}
        group={editingGroup}
        onSubmit={handleCreateOrUpdate}
        isPending={isPending}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deletingGroupId !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingGroupId(null)
        }}
        onConfirm={handleDeleteConfirm}
        title="Hapus Group?"
        description={
          deletingGroup
            ? `Apakah Anda yakin ingin menghapus grup "${deletingGroup.name}"? Semua perangkat di dalam grup ini akan dilepas (menjadi tanpa grup) dan kembali mewarisi Global Experience.`
            : 'Apakah Anda yakin ingin menghapus grup ini?'
        }
        confirmLabel="Hapus"
        cancelLabel="Batal"
        variant="danger"
      />
    </div>
  )
}

/* =========================================
   SUB-COMPONENTS
   ========================================= */

/* ---- StatsCards ---- */
interface StatsCardsProps {
  totalGroups: number
  totalAssigned: number
  totalUnassigned: number
}

function StatsCards({ totalGroups, totalAssigned, totalUnassigned }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      <StatCard
        label="Total Grup"
        value={totalGroups}
        accentColor="#6D6FFB"
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        }
      />
      <StatCard
        label="Device Ter-assign"
        value={totalAssigned}
        accentColor="#10B981"
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      />
      <StatCard
        label="Tanpa Grup"
        value={totalUnassigned}
        accentColor={totalUnassigned > 0 ? '#F59E0B' : '#a1a1aa'}
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        }
        muted={totalUnassigned === 0}
      />
    </div>
  )
}

function StatCard({
  label,
  value,
  accentColor,
  icon,
  muted,
}: {
  label: string
  value: number
  accentColor: string
  icon: React.ReactNode
  muted?: boolean
}) {
  return (
    <div className="card p-5 flex items-center justify-between border border-white/[0.04] bg-card hover:border-white/[0.08] transition-all duration-200">
      <div className="space-y-1">
        <span className="text-[0.6875rem] font-bold tracking-wider text-muted-foreground uppercase">{label}</span>
        <h4 className="text-3xl font-bold text-foreground leading-none">{value}</h4>
      </div>
      <div
        className="p-3 rounded-2xl flex items-center justify-center shrink-0 transition-colors"
        style={{
          backgroundColor: muted ? 'rgba(255, 255, 255, 0.02)' : `${accentColor}10`,
          color: muted ? '#71717a' : accentColor,
          border: `1px solid ${muted ? 'rgba(255,255,255,0.05)' : `${accentColor}20`}`,
        }}
      >
        {icon}
      </div>
    </div>
  )
}

/* ---- GroupToolbar ---- */
interface GroupToolbarProps {
  searchQuery: string
  setSearchQuery: (q: string) => void
  filterOption: 'all' | 'has-devices' | 'empty'
  setFilterOption: (f: 'all' | 'has-devices' | 'empty') => void
  sortOption: 'name-asc' | 'name-desc' | 'devices-desc' | 'devices-asc'
  setSortOption: (s: 'name-asc' | 'name-desc' | 'devices-desc' | 'devices-asc') => void
}

function GroupToolbar({
  searchQuery,
  setSearchQuery,
  filterOption,
  setFilterOption,
  sortOption,
  setSortOption,
}: GroupToolbarProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 card border border-white/[0.04] bg-card shadow-sm">
      <div className="relative flex-1 max-w-md w-full">
        <svg className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Cari nama atau deskripsi grup..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="field-input pl-10 text-xs w-full py-2 bg-slate-900/60 border-border focus:border-primary"
        />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-[0.6875rem] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Filter:</span>
          <select
            value={filterOption}
            onChange={(e) => setFilterOption(e.target.value as 'all' | 'has-devices' | 'empty')}
            className="field-input py-1.5 px-3 text-xs h-9 bg-slate-900/60 border-border w-[120px]"
          >
            <option value="all">Semua</option>
            <option value="has-devices">Ada Device</option>
            <option value="empty">Kosong</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[0.6875rem] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Urutan:</span>
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as 'name-asc' | 'name-desc' | 'devices-desc' | 'devices-asc')}
            className="field-input py-1.5 px-3 text-xs h-9 bg-slate-900/60 border-border w-[140px]"
          >
            <option value="name-asc">Nama A-Z</option>
            <option value="name-desc">Nama Z-A</option>
            <option value="devices-desc">Device Banyak</option>
            <option value="devices-asc">Device Sedikit</option>
          </select>
        </div>
      </div>
    </div>
  )
}

/* ---- GroupCard ---- */
interface GroupCardProps {
  group: DeviceGroup
  members: SerializedDevice[]
  eligibleToAdd: SerializedDevice[]
  onEdit: (group: DeviceGroup) => void
  onDelete: (group: DeviceGroup) => void
  isPending: boolean
  isDeviceOnline: (d: SerializedDevice) => boolean
  toggleSelectAllMembers: (groupId: string, members: SerializedDevice[]) => void
  toggleSelectOneMember: (groupId: string, deviceId: string) => void
  checkedMembers: string[]
  handleBulkRemove: (groupId: string) => void
  handleAssignDevice: (groupId: string, deviceId: string) => void
  handleRemoveDevice: (deviceId: string) => void
}

function GroupCard({
  group,
  members,
  eligibleToAdd,
  onEdit,
  onDelete,
  isPending,
  isDeviceOnline,
  toggleSelectAllMembers,
  toggleSelectOneMember,
  checkedMembers,
  handleBulkRemove,
  handleAssignDevice,
  handleRemoveDevice,
}: GroupCardProps) {
  const onlineCount = members.filter(isDeviceOnline).length
  const offlineCount = members.length - onlineCount

  return (
    <div className="card overflow-hidden border border-white/[0.04] bg-card hover:border-white/[0.08] transition-all duration-200 shadow-md">
      {/* Card Header */}
      <div className="p-4 border-b border-border flex items-center justify-between gap-3 bg-white/[0.005]">
        <div className="flex items-center gap-3.5 min-w-0">
          <span
            className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-extrabold shadow-sm shrink-0"
            style={{
              backgroundColor: `${group.color}15`,
              color: group.color,
              border: `1px solid ${group.color}30`,
            }}
          >
            {group.name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-foreground truncate">{group.name}</h4>
            <p className="text-[0.6875rem] text-muted-foreground truncate mt-0.5">
              {group.description || <span className="text-muted-foreground/30 italic">Tidak ada deskripsi</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge
            variant="muted"
            className="text-[0.625rem] px-2 py-0.5 font-bold"
            style={{
              color: group.color,
              borderColor: `${group.color}30`,
              backgroundColor: `${group.color}10`,
            }}
          >
            {members.length} Device
          </Badge>
          <a
            href={`/dashboard/experience?scope=group&id=${encodeURIComponent(group.id)}&edit=1`}
            className="p-1.5 text-primary border border-border/80 hover:border-primary/30 hover:bg-primary/5 rounded-lg transition-colors"
            title="Konfigurasi Experience"
          >
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </a>
          <button
            onClick={() => onEdit(group)}
            className="p-1.5 text-muted-foreground hover:text-foreground border border-border hover:bg-accent/40 rounded-lg transition-colors cursor-pointer"
            title="Edit Grup"
          >
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(group)}
            className="p-1.5 text-rose-400 border border-border hover:border-rose-500/30 hover:bg-rose-500/5 rounded-lg transition-colors cursor-pointer"
            title="Hapus Grup"
          >
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 space-y-4">
        {members.length > 0 && (
          <div className="flex items-center justify-between text-[0.6875rem] text-muted-foreground border-b border-border/40 pb-2">
            <span className="font-semibold uppercase tracking-wider text-muted-foreground/80">Keanggotaan</span>
            <span className="flex items-center gap-2">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <strong className="text-emerald-400 font-bold">{onlineCount}</strong> Online
              </span>
              <span>·</span>
              <span>{offlineCount} Offline</span>
            </span>
          </div>
        )}

        {members.length === 0 ? (
          <div className="py-8 border border-dashed border-border/80 rounded-xl text-center text-xs text-muted-foreground/60 bg-white/[0.005]">
            Belum ada device di grup ini.
          </div>
        ) : (
          <div className="space-y-2">
            {/* Bulk actions */}
            {checkedMembers.length > 0 && (
              <div className="flex items-center justify-between p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl animate-fade-in">
                <span className="text-[0.6875rem] font-bold text-rose-400 ml-1.5">
                  {checkedMembers.length} Device Terpilih
                </span>
                <button
                  type="button"
                  onClick={() => handleBulkRemove(group.id)}
                  disabled={isPending}
                  className="btn btn-xs bg-rose-500/20 border-rose-500/30 text-rose-400 hover:bg-rose-500/30 rounded-lg py-1 px-2.5 cursor-pointer disabled:opacity-40"
                >
                  Keluarkan
                </button>
              </div>
            )}

            <div className="border border-border rounded-xl divide-y divide-border/60 overflow-hidden bg-white/[0.005]">
              {/* Select All Members */}
              <div className="flex items-center gap-3 px-4 py-2 bg-white/[0.015]">
                <input
                  type="checkbox"
                  checked={checkedMembers.length === members.length && members.length > 0}
                  onChange={() => toggleSelectAllMembers(group.id, members)}
                  className="rounded border-border text-primary h-4 w-4 bg-background cursor-pointer focus:ring-primary focus:ring-2"
                />
                <span className="text-[0.625rem] font-bold text-muted-foreground uppercase tracking-wider">
                  Pilih Semua ({members.length})
                </span>
              </div>

              {/* Members List */}
              <div className="divide-y divide-border/40">
                {members.map((device) => {
                  const online = isDeviceOnline(device)
                  return (
                    <DeviceItem
                      key={device.deviceId}
                      device={device}
                      online={online}
                      checked={checkedMembers.includes(device.deviceId)}
                      onToggleCheck={() => toggleSelectOneMember(group.id, device.deviceId)}
                      onRemove={() => handleRemoveDevice(device.deviceId)}
                      isPending={isPending}
                    />
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Dropdown to add devices */}
        {eligibleToAdd.length > 0 ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              const devId = fd.get('deviceId') as string
              if (devId) handleAssignDevice(group.id, devId)
            }}
            className="flex items-center gap-2 pt-3 border-t border-border/40"
          >
            <select
              name="deviceId"
              required
              disabled={isPending}
              className="field-input py-1.5 px-3 text-[0.75rem] flex-1 h-9 bg-slate-900/40 border-border"
            >
              <option value="">— Tambahkan device ke grup —</option>
              {eligibleToAdd.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.deviceName}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={isPending}
              className="btn btn-secondary btn-xs h-9 border-primary/20 text-primary hover:bg-primary/5 cursor-pointer disabled:opacity-40"
            >
              + Tambah
            </button>
          </form>
        ) : (
          <div className="pt-2 text-center text-[0.6875rem] text-muted-foreground/30 italic">
            Semua perangkat sudah masuk grup.
          </div>
        )}
      </div>
    </div>
  )
}

/* ---- DeviceItem ---- */
interface DeviceItemProps {
  device: SerializedDevice
  online: boolean
  checked: boolean
  onToggleCheck: () => void
  onRemove: () => void
  isPending: boolean
}

function DeviceItem({ device, online, checked, onToggleCheck, onRemove, isPending }: DeviceItemProps) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors duration-150">
      <div className="flex items-center gap-3 min-w-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggleCheck}
          className="rounded border-border text-primary h-4 w-4 bg-background cursor-pointer focus:ring-primary focus:ring-2"
        />
        <div className="min-w-0">
          <div className="text-xs font-semibold text-foreground truncate flex items-center gap-2">
            <StatusDot status={device.isActive && online ? 'online' : device.isActive ? 'offline' : 'disabled'} />
            {device.deviceName}
          </div>
          <div className="text-[0.625rem] text-muted-foreground font-mono truncate mt-0.5">{device.deviceId}</div>
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        disabled={isPending}
        className="rounded-lg border border-rose-500/20 px-2.5 py-1 text-[0.6875rem] font-semibold text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/35 transition-colors disabled:opacity-40 cursor-pointer"
      >
        Keluarkan
      </button>
    </div>
  )
}

/* ---- UngroupedDevicesPanel ---- */
interface UngroupedDevicesPanelProps {
  unassignedDevices: SerializedDevice[]
  filteredUnassignedDevices: SerializedDevice[]
  selectedUnassigned: string[]
  groups: DeviceGroup[]
  unassignedSearchQuery: string
  setUnassignedSearchQuery: (q: string) => void
  toggleSelectAllUnassigned: (all: SerializedDevice[]) => void
  toggleSelectOneUnassigned: (id: string) => void
  bulkTargetGroupId: string
  setBulkTargetGroupId: (id: string) => void
  handleBulkAssignSubmit: (e: React.FormEvent) => void
  handleAssignDevice: (groupId: string, deviceId: string) => void
  isPending: boolean
  isDeviceOnline: (d: SerializedDevice) => boolean
}

function UngroupedDevicesPanel({
  unassignedDevices,
  filteredUnassignedDevices,
  selectedUnassigned,
  groups,
  unassignedSearchQuery,
  setUnassignedSearchQuery,
  toggleSelectAllUnassigned,
  toggleSelectOneUnassigned,
  bulkTargetGroupId,
  setBulkTargetGroupId,
  handleBulkAssignSubmit,
  handleAssignDevice,
  isPending,
  isDeviceOnline,
}: UngroupedDevicesPanelProps) {
  const totalUnassigned = unassignedDevices.length

  return (
    <div className="card border border-white/[0.04] bg-card overflow-hidden sticky top-6 shadow-md">
      {/* Header */}
      <div className="p-4 border-b border-border bg-white/[0.005]">
        <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
          <span>Device Tanpa Grup</span>
          <Badge variant="warning" className="text-[0.5625rem] px-2 py-0.5 bg-amber-500/10 text-amber-400 border-amber-500/20">
            {totalUnassigned}
          </Badge>
        </h3>
        <p className="mt-1 text-[0.6875rem] text-muted-foreground leading-relaxed">
          Device yang belum memiliki group. Hanya mewarisi Global Experience.
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <svg className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Cari device tanpa grup..."
            value={unassignedSearchQuery}
            onChange={(e) => setUnassignedSearchQuery(e.target.value)}
            className="field-input pl-9 py-2 text-xs bg-slate-900/60 border-border"
          />
        </div>

        {/* Bulk Assign */}
        {selectedUnassigned.length > 0 && (
          <form onSubmit={handleBulkAssignSubmit} className="flex items-center justify-between gap-2 p-2 bg-primary/10 border border-primary/20 rounded-xl animate-fade-in">
            <span className="text-[0.6875rem] font-bold text-primary ml-1 shrink-0">
              {selectedUnassigned.length} Terpilih
            </span>
            <div className="flex items-center gap-1.5 flex-1 justify-end min-w-0">
              <select
                value={bulkTargetGroupId}
                onChange={(e) => setBulkTargetGroupId(e.target.value)}
                required
                className="field-input py-1 px-2 text-[0.6875rem] h-8 bg-slate-900 border-primary/30 max-w-[120px]"
              >
                <option value="">— Pilih Grup —</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
              <button
                type="submit"
                disabled={isPending || !bulkTargetGroupId}
                className="btn btn-primary btn-xs h-8 px-2.5 cursor-pointer disabled:opacity-40"
              >
                Assign
              </button>
            </div>
          </form>
        )}

        {totalUnassigned > 0 ? (
          <div className="border border-border rounded-xl overflow-hidden bg-white/[0.005]">
            {/* Select All Checkbox */}
            <div className="flex items-center gap-3 px-3 py-2 bg-white/[0.015] border-b border-border/40">
              <input
                type="checkbox"
                checked={filteredUnassignedDevices.length > 0 && selectedUnassigned.length === filteredUnassignedDevices.length}
                onChange={() => toggleSelectAllUnassigned(filteredUnassignedDevices)}
                className="rounded border-border text-primary h-3.5 w-3.5 bg-background cursor-pointer focus:ring-primary focus:ring-2"
              />
              <span className="text-[0.625rem] font-bold text-muted-foreground uppercase tracking-wider">
                Pilih Semua ({filteredUnassignedDevices.length})
              </span>
            </div>

            {/* List with internal scroll */}
            <div className="max-h-[360px] overflow-y-auto divide-y divide-border/40">
              {filteredUnassignedDevices.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground bg-white/[0.002]">
                  Tidak ada device yang cocok.
                </div>
              ) : (
                filteredUnassignedDevices.map((d) => {
                  const online = isDeviceOnline(d)
                  return (
                    <div
                      key={d.deviceId}
                      className="flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-white/[0.01] transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={selectedUnassigned.includes(d.deviceId)}
                          onChange={() => toggleSelectOneUnassigned(d.deviceId)}
                          className="rounded border-border text-primary h-3.5 w-3.5 bg-background cursor-pointer focus:ring-primary focus:ring-2 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-foreground truncate flex items-center gap-1.5">
                            <StatusDot status={d.isActive && online ? 'online' : d.isActive ? 'offline' : 'disabled'} />
                            <span className="truncate">{d.deviceName}</span>
                          </div>
                          <div className="text-[0.625rem] text-muted-foreground font-mono truncate">{d.deviceId}</div>
                        </div>
                      </div>

                      {groups.length > 0 && (
                        <QuickAssignForm
                          onAssign={handleAssignDevice}
                          deviceId={d.deviceId}
                          groups={groups}
                          isPending={isPending}
                        />
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        ) : (
          <div className="border border-dashed border-border rounded-xl py-10 px-4 text-center bg-emerald-500/[0.005]">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h4 className="text-xs font-semibold text-foreground">Semua Perangkat Ter-assign</h4>
            <p className="text-[0.625rem] text-muted-foreground mt-1">
              Tidak ada perangkat tanpa grup yang tersisa.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function QuickAssignForm({
  onAssign,
  deviceId,
  groups,
  isPending,
}: {
  onAssign: (groupId: string, deviceId: string) => void
  deviceId: string
  groups: DeviceGroup[]
  isPending: boolean
}) {
  const [groupId, setGroupId] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!groupId) return
    onAssign(groupId, deviceId)
    setGroupId('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-1.5 shrink-0">
      <select
        value={groupId}
        onChange={(e) => setGroupId(e.target.value)}
        required
        disabled={isPending}
        className="field-input py-1 px-2 text-[0.6875rem] w-28 h-8 bg-slate-900/60 border-border"
      >
        <option value="">— Pilih Grup —</option>
        {groups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={isPending || !groupId}
        className="rounded-lg border border-primary/30 h-8 w-8 flex items-center justify-center text-primary hover:bg-primary/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shrink-0"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>
    </form>
  )
}

/* ---- GroupModal ---- */
interface GroupModalProps {
  open: boolean
  onClose: () => void
  group: DeviceGroup | null
  onSubmit: (formData: FormData) => void
  isPending: boolean
}

function GroupModal({ open, onClose, group, onSubmit, isPending }: GroupModalProps) {
  const [formName, setFormName] = useState(group?.name || '')
  const [formDesc, setFormDesc] = useState(group?.description || '')
  const [formColor, setFormColor] = useState(group?.color || '#2EE6C6')
  const [nameError, setNameError] = useState('')
  const [isTouched, setIsTouched] = useState(false)

  const handleNameChange = (val: string) => {
    setFormName(val)
    if (isTouched || val.trim()) {
      if (!val.trim()) {
        setNameError('Nama grup wajib diisi')
      } else {
        setNameError('')
      }
    }
  }

  const handleBlur = () => {
    setIsTouched(true)
    if (!formName.trim()) {
      setNameError('Nama grup wajib diisi')
    } else {
      setNameError('')
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsTouched(true)
    if (!formName.trim()) {
      setNameError('Nama grup wajib diisi')
      return
    }

    const formData = new FormData()
    if (group) {
      formData.append('groupId', group.id)
    }
    formData.append('groupName', formName.trim())
    formData.append('groupDescription', formDesc.trim())
    formData.append('groupColor', formColor)

    onSubmit(formData)
  }

  const isInvalid = !formName.trim() || !!nameError

  const modalTitle = group ? 'Edit Detail Grup' : 'Buat Grup Baru'
  const modalDesc = group
    ? 'Ubah nama, deskripsi, atau skema warna untuk grup ini.'
    : 'Grup menerapkan Home Experience config ke banyak STB secara terpusat.'

  return (
    <Modal open={open} onClose={onClose} title={modalTitle} description={modalDesc} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nama Grup */}
        <div className="form-group">
          <label className="text-[0.6875rem] font-bold text-muted-foreground uppercase tracking-wider">
            Nama Grup <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formName}
            onChange={(e) => handleNameChange(e.target.value)}
            onBlur={handleBlur}
            disabled={isPending}
            className={`field-input ${
              nameError ? 'border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/20' : 'border-border'
            }`}
            placeholder="Contoh: ICU, Lobby Utama"
          />
          {nameError && (
            <span className="text-[0.6875rem] text-rose-400 font-semibold mt-1 flex items-center gap-1 animate-fade-in">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {nameError}
            </span>
          )}
        </div>

        {/* Deskripsi */}
        <div className="form-group">
          <label className="text-[0.6875rem] font-bold text-muted-foreground uppercase tracking-wider">Deskripsi</label>
          <input
            type="text"
            value={formDesc}
            onChange={(e) => setFormDesc(e.target.value)}
            disabled={isPending}
            className="field-input border-border"
            placeholder="Deskripsi singkat"
          />
        </div>

        {/* Warna Tema */}
        <div className="form-group">
          <label className="text-[0.6875rem] font-bold text-muted-foreground uppercase tracking-wider">Warna Tema</label>
          <div className="grid grid-cols-5 gap-2.5">
            {PRESET_COLORS.map((preset) => {
              const isSelected = formColor.toUpperCase() === preset.hex.toUpperCase()
              return (
                <button
                  key={preset.hex}
                  type="button"
                  onClick={() => setFormColor(preset.hex)}
                  disabled={isPending}
                  className="h-9 rounded-xl border border-white/5 hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center relative shadow-sm"
                  style={{ backgroundColor: preset.hex }}
                  title={preset.name}
                >
                  {isSelected && (
                    <span className="w-5 h-5 rounded-full bg-slate-950/40 flex items-center justify-center border border-white/20">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  )}
                </button>
              )
            })}
            
            {/* Custom Color Input */}
            <div className="relative h-9 rounded-xl border border-border bg-accent/20 flex items-center justify-center cursor-pointer hover:bg-accent/40 transition-colors">
              <input
                type="color"
                value={formColor}
                onChange={(e) => setFormColor(e.target.value)}
                disabled={isPending}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <svg className="w-4 h-4 text-muted-foreground pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
          
          <div className="flex items-center gap-2 mt-2">
            <div className="h-5 w-5 rounded-md border border-border shrink-0" style={{ backgroundColor: formColor }} />
            <span className="text-[0.625rem] font-mono font-bold text-muted-foreground uppercase">{formColor}</span>
          </div>
        </div>

        {/* Preview */}
        <div className="rounded-2xl border border-white/[0.05] bg-white/[0.01] p-4 space-y-2">
          <span className="text-[0.5625rem] uppercase font-bold tracking-wider text-muted-foreground/60 block">Preview Tampilan</span>
          <div className="flex items-center gap-3.5 p-3 rounded-xl bg-slate-950/20 border border-white/[0.02]">
            <span
              className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-extrabold shadow-sm shrink-0"
              style={{
                backgroundColor: `${formColor}15`,
                color: formColor,
                border: `1px solid ${formColor}30`,
              }}
            >
              {formName ? formName.trim().charAt(0).toUpperCase() : 'G'}
            </span>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-foreground truncate">{formName || 'Nama Grup Baru'}</h4>
              <p className="text-[0.625rem] text-muted-foreground truncate mt-0.5">
                {formDesc || 'Deskripsi akan tampil di sini.'}
              </p>
            </div>
            <Badge
              variant="muted"
              className="text-[0.5625rem] px-2 py-0.5 font-bold"
              style={{
                color: formColor,
                borderColor: `${formColor}20`,
                backgroundColor: `${formColor}10`,
              }}
            >
              0 Device
            </Badge>
          </div>
        </div>

        {/* Footer buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/60">
          <Button type="button" variant="secondary" size="md" onClick={onClose} disabled={isPending}>
            Batal
          </Button>
          <Button type="submit" variant="primary" size="md" disabled={isPending || isInvalid} loading={isPending}>
            {group ? 'Simpan Perubahan' : 'Buat Grup'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
