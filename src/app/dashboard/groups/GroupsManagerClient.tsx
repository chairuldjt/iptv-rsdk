'use client'

import React, { useState, useMemo, useEffect, useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useToast } from '@/components/Toast'
import PageHeader from '@/components/PageHeader'
import ConfirmForm from '@/components/ConfirmForm'

// Curated professional color palette for device groups
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

  // State management
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOption, setSortOption] = useState<'name-asc' | 'name-desc' | 'devices-desc' | 'devices-asc'>('name-asc')
  const [filterOption, setFilterOption] = useState<'all' | 'has-devices' | 'empty'>('all')
  const [unassignedSearchQuery, setUnassignedSearchQuery] = useState('')
  const [editingGroupId, setEditingGroupId] = useState<string | null>(searchParams.edit || null)

  // Form inputs state
  const editingGroup = useMemo(() => {
    return editingGroupId ? (groups.find((g) => g.id === editingGroupId) || null) : null
  }, [editingGroupId, groups])

  // Bulk action checkboxes state
  const [selectedUnassigned, setSelectedUnassigned] = useState<string[]>([])
  const [selectedMembers, setSelectedMembers] = useState<Record<string, string[]>>({})

  // Toast notification detector and clean up URL query params
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

      // Clear the notification params from URL
      const params = new URLSearchParams(currentSearchParams.toString())
      params.delete('created')
      params.delete('updated')
      params.delete('deleted')
      params.delete('assigned')
      params.delete('removed')
      params.delete('edit') // also clear edit query if it exists
      const newQuery = params.toString()
      router.replace(`${pathname}${newQuery ? `?${newQuery}` : ''}`, { scroll: false })
    }
  }, [currentSearchParams, pathname, router, showToast])

  // Device online helper (10 minutes threshold)
  const isDeviceOnline = (d: SerializedDevice) => {
    if (!d.isActive || !d.lastOnline) return false
    const tenMinutesAgo = currentTimestamp - 10 * 60 * 1000
    return new Date(d.lastOnline).getTime() >= tenMinutesAgo
  }

  // Reverse mapping: groupId -> device[]
  const groupDeviceMap = useMemo(() => {
    const map = new Map<string, SerializedDevice[]>()
    for (const group of groups) {
      map.set(group.id, [])
    }
    for (const d of devices) {
      const gid = assignments[d.deviceId]
      if (gid && map.has(gid)) {
        map.get(gid)!.push(d)
      }
    }
    return map
  }, [groups, devices, assignments])

  // Unassigned devices list
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

  // Stats calculation
  const totalGroups = groups.length
  const totalAssigned = devices.length - unassignedDevices.length
  const totalUnassigned = unassignedDevices.length

  // Filter & sort groups
  const processedGroups = useMemo(() => {
    let result = [...groups]

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (g) => g.name.toLowerCase().includes(q) || g.description.toLowerCase().includes(q)
      )
    }

    // Dropdown status filter
    if (filterOption === 'has-devices') {
      result = result.filter((g) => (groupDeviceMap.get(g.id) || []).length > 0)
    } else if (filterOption === 'empty') {
      result = result.filter((g) => (groupDeviceMap.get(g.id) || []).length === 0)
    }

    // Sort
    result.sort((a, b) => {
      const countA = (groupDeviceMap.get(a.id) || []).length
      const countB = (groupDeviceMap.get(b.id) || []).length

      if (sortOption === 'name-asc') {
        return a.name.localeCompare(b.name)
      } else if (sortOption === 'name-desc') {
        return b.name.localeCompare(a.name)
      } else if (sortOption === 'devices-desc') {
        return countB - countA || a.name.localeCompare(b.name)
      } else if (sortOption === 'devices-asc') {
        return countA - countB || a.name.localeCompare(b.name)
      }
      return 0
    })

    return result
  }, [groups, searchQuery, filterOption, sortOption, groupDeviceMap])

  // Bulk actions handlers
  const handleBulkAssign = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (selectedUnassigned.length === 0) return
    const formData = new FormData(e.currentTarget)
    selectedUnassigned.forEach((id) => formData.append('deviceIds', id))
    
    startTransition(async () => {
      await assignDevicesBulkAction(formData)
      setSelectedUnassigned([])
    })
  }

  const handleBulkRemove = async (groupId: string) => {
    const selected = selectedMembers[groupId] || []
    if (selected.length === 0) return
    
    const formData = new FormData()
    selected.forEach((id) => formData.append('deviceIds', id))

    startTransition(async () => {
      await removeDevicesBulkAction(formData)
      setSelectedMembers((prev) => ({ ...prev, [groupId]: [] }))
    })
  }

  // Checkbox helpers
  const handleUnassignedCheckAll = (checked: boolean) => {
    if (checked) {
      setSelectedUnassigned(filteredUnassignedDevices.map((d) => d.deviceId))
    } else {
      setSelectedUnassigned([])
    }
  }

  const handleUnassignedCheckOne = (deviceId: string, checked: boolean) => {
    setSelectedUnassigned((prev) =>
      checked ? [...prev, deviceId] : prev.filter((id) => id !== deviceId)
    )
  }

  const handleMemberCheckAll = (groupId: string, members: SerializedDevice[], checked: boolean) => {
    setSelectedMembers((prev) => ({
      ...prev,
      [groupId]: checked ? members.map((m) => m.deviceId) : [],
    }))
  }

  const handleMemberCheckOne = (groupId: string, deviceId: string, checked: boolean) => {
    setSelectedMembers((prev) => {
      const current = prev[groupId] || []
      const updated = checked ? [...current, deviceId] : current.filter((id) => id !== deviceId)
      return { ...prev, [groupId]: updated }
    })
  }

  return (
    <div className="space-y-6 animate-fade-in text-foreground">
      {/* Header */}
      <PageHeader
        title="Device Groups"
        description="Kelola grup perangkat dan keanggotaannya. Device dalam grup mewarisi Home Experience config dari grup (mirip OU di AD)."
        badge="DSA-style"
      />

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card rounded-2xl p-5 flex items-center justify-between border-l-[3.5px]" style={{ borderLeftColor: '#6D6FFB' }}>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Total Groups</span>
            <h4 className="text-2xl font-black text-foreground mt-1">{totalGroups}</h4>
          </div>
          <div className="p-3 bg-primary/10 rounded-xl text-primary">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
        </div>

        <div className="card rounded-2xl p-5 flex items-center justify-between border-l-[3.5px]" style={{ borderLeftColor: '#10B981' }}>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Assigned Devices</span>
            <h4 className="text-2xl font-black text-foreground mt-1">{totalAssigned}</h4>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        <div className="card rounded-2xl p-5 flex items-center justify-between border-l-[3.5px]" style={{ borderLeftColor: totalUnassigned > 0 ? '#F59E0B' : '#a1a1aa' }}>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Unassigned Devices</span>
            <h4 className="text-2xl font-black text-foreground mt-1">{totalUnassigned}</h4>
          </div>
          <div className={`p-3 rounded-xl ${totalUnassigned > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-white/5 text-muted-foreground'}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-[380px_minmax(0,1fr)] gap-6 items-start">
        
        {/* Left Column: Create Form + Unassigned List */}
        <div className="space-y-6">
          
          {/* Create/Edit Group Card (Keyed to reset inputs on editingGroup change) */}
          <GroupFormCard
            key={editingGroupId || 'create'}
            editingGroupId={editingGroupId}
            editingGroup={editingGroup}
            createGroupAction={createGroupAction}
            updateGroupAction={updateGroupAction}
            isPending={isPending}
            onCancelEdit={() => setEditingGroupId(null)}
          />

          {/* Unassigned Devices Card */}
          <div className="card rounded-2xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-foreground">Device Tanpa Grup</h3>
              <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                {totalUnassigned} device tidak memiliki grup. Device ini hanya mewarisi Global Experience.
              </p>
            </div>

            {/* Inner search */}
            <div className="relative">
              <svg className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Cari device..."
                value={unassignedSearchQuery}
                onChange={(e) => setUnassignedSearchQuery(e.target.value)}
                className="field-input pl-8.5 py-1.5 text-xs"
              />
            </div>

            {totalUnassigned > 0 ? (
              <form onSubmit={handleBulkAssign} className="space-y-3">
                {/* Bulk assign bar */}
                {selectedUnassigned.length > 0 && (
                  <div className="flex items-center justify-between gap-2 p-2 bg-primary/10 border border-primary/20 rounded-xl animate-fade-in">
                    <span className="text-[10px] font-bold text-primary shrink-0 ml-1">
                      {selectedUnassigned.length} Terpilih
                    </span>
                    <div className="flex items-center gap-1.5 flex-1 max-w-[190px]">
                      <select name="groupId" required className="field-input py-1 px-2 text-[10px] h-8 bg-slate-900 border-primary/30">
                        <option value="">— Pilih Grup —</option>
                        {groups.map((g) => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        disabled={isPending}
                        className="btn btn-primary py-1 px-2.5 text-[10px] h-8 rounded-lg"
                      >
                        Assign
                      </button>
                    </div>
                  </div>
                )}

                {/* Device List */}
                <div className="border border-border rounded-xl overflow-hidden max-h-[300px] overflow-y-auto divide-y divide-border/60">
                  <div className="flex items-center gap-3 px-3 py-2 bg-accent/20">
                    <input
                      type="checkbox"
                      checked={filteredUnassignedDevices.length > 0 && selectedUnassigned.length === filteredUnassignedDevices.length}
                      onChange={(e) => handleUnassignedCheckAll(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary/25 h-3.5 w-3.5 bg-background cursor-pointer"
                    />
                    <span className="text-[9px] font-bold text-muted-foreground uppercase">Pilih Semua ({filteredUnassignedDevices.length})</span>
                  </div>

                  {filteredUnassignedDevices.length === 0 ? (
                    <div className="text-center py-6 text-xs text-muted-foreground">
                      Tidak ada device yang cocok.
                    </div>
                  ) : (
                    filteredUnassignedDevices.map((d) => {
                      const online = isDeviceOnline(d)
                      return (
                        <div key={d.deviceId} className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-accent/10 transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <input
                              type="checkbox"
                              checked={selectedUnassigned.includes(d.deviceId)}
                              onChange={(e) => handleUnassignedCheckOne(d.deviceId, e.target.checked)}
                              className="rounded border-border text-primary focus:ring-primary/25 h-3.5 w-3.5 bg-background cursor-pointer"
                            />
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-foreground truncate flex items-center gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-emerald-500' : 'bg-muted'}`} />
                                {d.deviceName}
                              </div>
                              <div className="text-[9px] text-muted-foreground font-mono truncate">{d.deviceId}</div>
                            </div>
                          </div>

                          {/* Quick individual assign */}
                          {groups.length > 0 && (
                            <form action={assignDeviceAction} className="flex items-center gap-1 shrink-0">
                              <input type="hidden" name="deviceId" value={d.deviceId} />
                              <select name="groupId" required className="field-input py-1 px-1.5 text-[9px] w-22 h-7 bg-slate-900/60 border-border/80">
                                <option value="">— Group —</option>
                                {groups.map((g) => (
                                  <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                              </select>
                              <button
                                type="submit"
                                className="rounded-lg border border-primary/30 p-1.5 text-[9px] font-bold text-primary hover:bg-primary/10 hover:border-primary/50 transition-colors flex items-center justify-center h-7 w-7"
                                title="Assign"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                              </button>
                            </form>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </form>
            ) : (
              <div className="border border-dashed border-border rounded-xl py-6 px-4 text-center text-xs text-muted-foreground">
                Semua perangkat sudah masuk grup.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Groups Grid */}
        <div className="space-y-4">
          
          {/* Controls Bar: Search, Filters, and Sorting */}
          <div className="card rounded-2xl p-4 flex flex-col md:flex-row items-center gap-4 justify-between">
            <div className="relative w-full md:max-w-xs">
              <svg className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Cari grup berdasarkan nama / deskripsi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="field-input pl-10 text-xs w-full"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto md:justify-end">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground font-medium shrink-0">Filter:</span>
                <select
                  value={filterOption}
                  onChange={(e) => setFilterOption(e.target.value as 'all' | 'has-devices' | 'empty')}
                  className="field-input py-1.5 px-3 text-xs w-36 h-9"
                >
                  <option value="all">Semua Grup</option>
                  <option value="has-devices">Ada Device</option>
                  <option value="empty">Grup Kosong</option>
                </select>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground font-medium shrink-0">Urutkan:</span>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as 'name-asc' | 'name-desc' | 'devices-desc' | 'devices-asc')}
                  className="field-input py-1.5 px-3 text-xs w-40 h-9"
                >
                  <option value="name-asc">Nama (A-Z)</option>
                  <option value="name-desc">Nama (Z-A)</option>
                  <option value="devices-desc">Device (Banyak)</option>
                  <option value="devices-asc">Device (Sedikit)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Group Grid / List */}
          {processedGroups.length === 0 ? (
            <div className="card rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-border flex items-center justify-center text-muted-foreground/60 shadow-inner">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-foreground">Grup Tidak Ditemukan</h4>
                <p className="text-xs text-muted-foreground max-w-sm">
                  {groups.length === 0
                    ? 'Buat grup pertama Anda menggunakan formulir di sebelah kiri.'
                    : 'Tidak ada grup yang cocok dengan pencarian atau filter Anda.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {processedGroups.map((group) => {
                const members = groupDeviceMap.get(group.id) || []
                const checkedMembers = selectedMembers[group.id] || []
                const isEditing = editingGroupId === group.id
                
                // Count online members
                const onlineCount = members.filter(isDeviceOnline).length

                // Eligible devices to add to this group
                const eligibleToAdd = unassignedDevices

                return (
                  <div
                    key={group.id}
                    className={`card rounded-2xl overflow-hidden transition-all duration-300 ${
                      isEditing ? 'ring-2 ring-primary/40 bg-primary/[0.01]' : 'hover:border-white/10'
                    }`}
                  >
                    {/* Card Header */}
                    <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-4 bg-accent/5">
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Alphabet Avatar icon with color and light matching background */}
                        <span
                          className="w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-extrabold shadow-sm"
                          style={{
                            backgroundColor: `${group.color}15`,
                            color: group.color,
                            border: `1px solid ${group.color}35`,
                          }}
                        >
                          {group.name.charAt(0).toUpperCase()}
                        </span>
                        
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-foreground truncate">{group.name}</h4>
                          {group.description ? (
                            <p className="text-[10px] text-muted-foreground truncate mt-0.5">{group.description}</p>
                          ) : (
                            <p className="text-[10px] text-muted-foreground/40 italic truncate mt-0.5">Tidak ada deskripsi</p>
                          )}
                        </div>
                      </div>

                      {/* Header Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className="badge font-semibold text-[9px] px-2 py-0.5 shrink-0"
                          style={{
                            color: group.color,
                            borderColor: `${group.color}30`,
                            backgroundColor: `${group.color}10`,
                          }}
                        >
                          {members.length} Devices
                        </span>

                        <a
                          href={`/dashboard/experience?scope=group&id=${encodeURIComponent(group.id)}&edit=1`}
                          className="p-1.5 text-primary hover:text-primary-foreground border border-primary/20 hover:bg-primary/10 rounded-lg transition-colors flex items-center justify-center"
                          title="Configure Experience"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </a>

                        <button
                          onClick={() => {
                            setEditingGroupId(group.id)
                            window.scrollTo({ top: 0, behavior: 'smooth' })
                          }}
                          className="p-1.5 text-muted-foreground hover:text-foreground border border-border hover:bg-accent/40 rounded-lg transition-colors flex items-center justify-center"
                          title="Edit Group Info"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>

                        <ConfirmForm
                          action={deleteGroupAction}
                          message={`Hapus grup "${group.name}"? Semua device anggota akan kehilangan assignment grup ini.`}
                        >
                          <input type="hidden" name="groupId" value={group.id} />
                          <button
                            type="submit"
                            className="p-1.5 text-rose-400 hover:text-rose-300 border border-rose-500/20 hover:bg-rose-500/10 rounded-lg transition-colors flex items-center justify-center"
                            title="Delete Group"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </ConfirmForm>
                      </div>
                    </div>

                    {/* Member List Section */}
                    <div className="p-4 space-y-4">
                      
                      {/* Active / Online Ratio Indicator */}
                      {members.length > 0 && (
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground border-b border-border/40 pb-2">
                          <span className="font-semibold">KEANGGOTAAN</span>
                          <span className="flex items-center gap-2">
                            <span className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <strong className="text-emerald-400 font-bold">{onlineCount}</strong> Online
                            </span>
                            <span>•</span>
                            <span>{members.length - onlineCount} Offline</span>
                          </span>
                        </div>
                      )}

                      {members.length === 0 ? (
                        <div className="py-6 border border-dashed border-border rounded-xl flex flex-col items-center justify-center text-center text-[11px] text-muted-foreground/60 space-y-1 bg-accent/5">
                          <span>Belum ada device di grup ini.</span>
                          <span>Gunakan menu tambah di bawah atau assign dari unassigned panel.</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          
                          {/* Bulk remove bar */}
                          {checkedMembers.length > 0 && (
                            <div className="flex items-center justify-between p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl animate-fade-in">
                              <span className="text-[10px] font-bold text-rose-400 shrink-0 ml-1">
                                {checkedMembers.length} Device Terpilih
                              </span>
                              <button
                                type="button"
                                onClick={() => handleBulkRemove(group.id)}
                                disabled={isPending}
                                className="btn btn-destructive py-1 px-3 text-[10px] h-7 rounded-lg flex items-center gap-1"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7" />
                                </svg>
                                Keluarkan dari Grup
                              </button>
                            </div>
                          )}

                          {/* Member Devices list */}
                          <div className="border border-border/80 rounded-xl divide-y divide-border/60 overflow-hidden bg-accent/5">
                            {/* Checkbox Header */}
                            <div className="flex items-center gap-3 px-3 py-1.5 bg-accent/15">
                              <input
                                type="checkbox"
                                checked={checkedMembers.length === members.length}
                                onChange={(e) => handleMemberCheckAll(group.id, members, e.target.checked)}
                                className="rounded border-border text-primary focus:ring-primary/25 h-3.5 w-3.5 bg-background cursor-pointer"
                              />
                              <span className="text-[9px] font-bold text-muted-foreground uppercase">
                                Pilih Semua Anggota ({members.length})
                              </span>
                            </div>

                            {/* Device rows */}
                            {members.map((device) => {
                              const online = isDeviceOnline(device)
                              return (
                                <div
                                  key={device.deviceId}
                                  className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-accent/10 transition-colors"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <input
                                      type="checkbox"
                                      checked={checkedMembers.includes(device.deviceId)}
                                      onChange={(e) => handleMemberCheckOne(group.id, device.deviceId, e.target.checked)}
                                      className="rounded border-border text-primary focus:ring-primary/25 h-3.5 w-3.5 bg-background cursor-pointer"
                                    />
                                    <div className="min-w-0">
                                      <div className="text-xs font-semibold text-foreground truncate flex items-center gap-1.5">
                                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${online ? 'bg-emerald-500 animate-pulse-glow' : 'bg-muted'}`} />
                                        {device.deviceName}
                                      </div>
                                      <div className="text-[9px] text-muted-foreground font-mono truncate">{device.deviceId}</div>
                                    </div>
                                  </div>

                                  <form action={removeDeviceAction} className="shrink-0">
                                    <input type="hidden" name="deviceId" value={device.deviceId} />
                                    <button
                                      type="submit"
                                      className="rounded-lg border border-rose-500/20 px-2.5 py-1 text-[10px] font-semibold text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/40 transition-colors flex items-center gap-1"
                                      title="Keluarkan dari grup"
                                    >
                                      Remove
                                    </button>
                                  </form>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Add Device Inline Form */}
                      {eligibleToAdd.length > 0 && (
                        <form action={assignDeviceAction} className="flex items-center gap-2 pt-2 border-t border-border/40">
                          <input type="hidden" name="groupId" value={group.id} />
                          <select name="deviceId" required className="field-input py-1.5 px-3 text-[11px] flex-1 h-9 bg-slate-900/40 border-border/80">
                            <option value="">— Tambahkan device ke grup ini —</option>
                            {eligibleToAdd.map((d) => (
                              <option key={d.deviceId} value={d.deviceId}>{d.deviceName} ({d.deviceId})</option>
                            ))}
                          </select>
                          <button
                            type="submit"
                            className="btn btn-secondary py-1.5 px-3.5 text-[10px] h-9 rounded-lg border-primary/20 hover:border-primary/40 text-primary hover:bg-primary/10 flex items-center justify-center gap-1 whitespace-nowrap"
                          >
                            + Add Device
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface GroupFormCardProps {
  editingGroupId: string | null
  editingGroup: DeviceGroup | null
  createGroupAction: (formData: FormData) => Promise<void>
  updateGroupAction: (formData: FormData) => Promise<void>
  isPending: boolean
  onCancelEdit: () => void
}

function GroupFormCard({
  editingGroupId,
  editingGroup,
  createGroupAction,
  updateGroupAction,
  isPending,
  onCancelEdit,
}: GroupFormCardProps) {
  const [formName, setFormName] = useState(editingGroup?.name || '')
  const [formDesc, setFormDesc] = useState(editingGroup?.description || '')
  const [formColor, setFormColor] = useState(editingGroup?.color || '#2EE6C6')

  return (
    <div className={`card rounded-2xl p-5 space-y-5 relative overflow-hidden transition-all duration-300 ${editingGroupId ? 'ring-2 ring-primary/40 bg-primary/[0.02]' : ''}`}>
      {editingGroupId && (
        <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-primary via-indigo-400 to-primary animate-pulse" />
      )}
      
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: formColor }} />
            {editingGroupId ? `Edit Group: ${editingGroup?.name}` : 'Buat Group Baru'}
          </h3>
          {editingGroupId && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="text-[10px] text-muted-foreground hover:text-foreground border border-border px-2 py-1 rounded-lg bg-accent/30 transition-all cursor-pointer"
            >
              Batal Edit
            </button>
          )}
        </div>
        <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">
          {editingGroupId
            ? 'Ubah nama, warna tema, atau deskripsi grup. Perangkat di grup ini akan otomatis mewarisi pengaturannya.'
            : 'Grup digunakan untuk menerapkan Home Experience config ke banyak STB secara terpusat.'}
        </p>
      </div>

      <form action={editingGroupId ? updateGroupAction : createGroupAction} className="space-y-4">
        {editingGroupId && <input type="hidden" name="groupId" value={editingGroupId} />}

        {/* Group Name */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Nama Group</label>
          <input
            type="text"
            name="groupName"
            required
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            className="field-input w-full font-medium"
            placeholder="Contoh: ICU, VIP, Lobby Utama"
          />
        </div>

        {/* Description */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Deskripsi</label>
          <input
            type="text"
            name="groupDescription"
            value={formDesc}
            onChange={(e) => setFormDesc(e.target.value)}
            className="field-input w-full"
            placeholder="Deskripsi singkat lokasi / fungsi"
          />
        </div>

        {/* Color Presets */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Warna Tema</label>
          <div className="grid grid-cols-5 gap-2.5">
            {PRESET_COLORS.map((preset) => (
              <button
                key={preset.hex}
                type="button"
                onClick={() => setFormColor(preset.hex)}
                className="h-9 rounded-xl border border-white/5 transition-all flex items-center justify-center relative hover:scale-105 active:scale-95 cursor-pointer animate-scale-in"
                style={{ backgroundColor: preset.hex }}
                title={preset.name}
              >
                {formColor.toUpperCase() === preset.hex.toUpperCase() && (
                  <span className="w-5 h-5 rounded-full bg-slate-950/40 flex items-center justify-center border border-white/20">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                )}
              </button>
            ))}
            {/* Custom color picker button */}
            <div className="relative h-9 rounded-xl border border-border bg-accent/20 flex items-center justify-center cursor-pointer hover:bg-accent/40 transition-colors">
              <input
                type="color"
                name="groupColor"
                value={formColor}
                onChange={(e) => setFormColor(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <svg className="w-4 h-4 text-muted-foreground pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="h-5 w-5 rounded-lg border border-border" style={{ backgroundColor: formColor }} />
            <span className="text-[10px] font-mono font-semibold text-muted-foreground uppercase">{formColor}</span>
          </div>
        </div>

        {/* Live Preview Card */}
        <div className="rounded-xl border border-white/5 bg-white/[0.01] p-3 space-y-2">
          <span className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground/60 block">Live Preview</span>
          <div className="flex items-center gap-3">
            <span
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-extrabold shadow-sm transition-all"
              style={{
                backgroundColor: `${formColor}15`,
                color: formColor,
                border: `1px solid ${formColor}40`,
                boxShadow: `0 4px 20px ${formColor}10`,
              }}
            >
              {formName ? formName.trim().charAt(0).toUpperCase() : 'G'}
            </span>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-foreground truncate">{formName || 'Nama Grup'}</h4>
              <p className="text-[9px] text-muted-foreground truncate">{formDesc || 'Deskripsi akan tampil di sini.'}</p>
            </div>
            <span className="badge badge-primary shrink-0 text-[9px] px-2 py-0.5" style={{ color: formColor, borderColor: `${formColor}30`, backgroundColor: `${formColor}10` }}>
              0 Devices
            </span>
          </div>
        </div>

        {/* Submit Buttons */}
        <button
          type="submit"
          disabled={isPending || !formName.trim()}
          className="w-full btn btn-primary py-2.5 text-xs font-semibold flex items-center justify-center gap-2"
        >
          {isPending ? (
            <>
              <svg className="animate-spin h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Memproses...</span>
            </>
          ) : editingGroupId ? (
            'Simpan Perubahan'
          ) : (
            '+ Buat Group'
          )}
        </button>
      </form>
    </div>
  )
}
