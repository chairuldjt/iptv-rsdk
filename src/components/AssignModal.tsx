'use client'

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useToast } from '@/components/Toast'

export type AssignTarget = {
  id: string
  name: string
  isAssigned: boolean
  currentProfileName?: string | null
  color?: string
  memberCount?: number
}

type AssignModalProps = {
  isOpen: boolean
  onClose: () => void
  profileId: string
  profileName: string
  groups: AssignTarget[]
  devices: AssignTarget[]
  onAssignGroup: (profileId: string, groupId: string, assign: boolean) => Promise<unknown>
  onAssignDevice: (profileId: string, deviceId: string, assign: boolean) => Promise<unknown>
}

export default function AssignModal({
  isOpen,
  onClose,
  profileId,
  profileName,
  groups,
  devices,
  onAssignGroup,
  onAssignDevice,
}: AssignModalProps) {
  const [activeTab, setActiveTab] = useState<'group' | 'device'>('group')
  const [groupState, setGroupState] = useState(groups)
  const [deviceState, setDeviceState] = useState(devices)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const { showToast } = useToast()

  // Auto-focus search input when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('')
      setTimeout(() => searchRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Clear search when switching tabs
  useEffect(() => {
    setSearchQuery('')
  }, [activeTab])

  const handleToggleGroup = useCallback(async (groupId: string) => {
    const target = groupState.find((g) => g.id === groupId)
    if (!target || pendingId) return

    setPendingId(groupId)
    const newAssigned = !target.isAssigned
    try {
      await onAssignGroup(profileId, groupId, newAssigned)
      setGroupState((prev) =>
        prev.map((g) =>
          g.id === groupId
            ? { ...g, isAssigned: newAssigned, currentProfileName: newAssigned ? profileName : null }
            : g
        )
      )
      showToast('success', newAssigned ? `Ditugaskan ke ${target.name}` : `Dihapus dari ${target.name}`)
    } catch {
      showToast('error', 'Gagal memperbarui assignment')
    } finally {
      setPendingId(null)
    }
  }, [groupState, pendingId, onAssignGroup, profileId, profileName, showToast])

  const handleToggleDevice = useCallback(async (deviceId: string) => {
    const target = deviceState.find((d) => d.id === deviceId)
    if (!target || pendingId) return

    setPendingId(deviceId)
    const newAssigned = !target.isAssigned
    try {
      await onAssignDevice(profileId, deviceId, newAssigned)
      setDeviceState((prev) =>
        prev.map((d) =>
          d.id === deviceId
            ? { ...d, isAssigned: newAssigned, currentProfileName: newAssigned ? profileName : null }
            : d
        )
      )
      showToast('success', newAssigned ? `Ditugaskan ke ${target.name}` : `Dihapus dari ${target.name}`)
    } catch {
      showToast('error', 'Gagal memperbarui assignment')
    } finally {
      setPendingId(null)
    }
  }, [deviceState, pendingId, onAssignDevice, profileId, profileName, showToast])

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setSearchQuery('')
    }
  }, [])

  const currentList = activeTab === 'group' ? groupState : deviceState
  const assignedCount = currentList.filter((t) => t.isAssigned).length

  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return currentList
    const q = searchQuery.toLowerCase()
    return currentList.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        (t.currentProfileName && t.currentProfileName.toLowerCase().includes(q))
    )
  }, [currentList, searchQuery])

  const filteredAssignedCount = filteredList.filter((t) => t.isAssigned).length

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/78 p-4 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-2xl max-h-[85vh] rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(25,28,45,0.98),rgba(11,15,27,0.98))] shadow-[0_30px_90px_rgba(0,0,0,0.55)] animate-slide-up flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/8">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-white truncate">Assign Profile</h3>
              <p className="text-xs text-slate-400 mt-1 truncate">
                {profileName} &middot; {assignedCount} dari {currentList.length} ditugaskan
                {searchQuery && (
                  <span className="text-primary"> &middot; {filteredList.length} hasil</span>
                )}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors shrink-0"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 bg-white/5 rounded-xl p-1">
            <button
              onClick={() => setActiveTab('group')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'group'
                  ? 'bg-primary/20 text-primary border border-primary/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="flex items-center justify-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
                Grup
                {groupState.some((g) => g.isAssigned) && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-md bg-primary/20 text-primary text-[9px]">
                    {groupState.filter((g) => g.isAssigned).length}
                  </span>
                )}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('device')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'device'
                  ? 'bg-primary/20 text-primary border border-primary/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="flex items-center justify-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                </svg>
                Device
                {deviceState.some((d) => d.isAssigned) && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-md bg-primary/20 text-primary text-[9px]">
                    {deviceState.filter((d) => d.isAssigned).length}
                  </span>
                )}
              </span>
            </button>
          </div>

          {/* Search Input */}
          {currentList.length > 0 && (
            <div className="relative mt-3">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder={`Cari ${activeTab === 'group' ? 'grup' : 'device'}...`}
                className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-white/5 border border-white/8 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary/40 focus:bg-white/8 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {currentList.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="w-12 h-12 rounded-2xl border border-white/10 flex items-center justify-center mx-auto mb-3 text-slate-500">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <p className="text-xs text-slate-400">
                {activeTab === 'group' ? 'Belum ada grup. Buat grup dulu di Device Groups.' : 'Belum ada device terdaftar.'}
              </p>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="w-12 h-12 rounded-2xl border border-white/10 flex items-center justify-center mx-auto mb-3 text-slate-500">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>
              <p className="text-xs text-slate-400">
                Tidak ada hasil untuk &ldquo;{searchQuery}&rdquo;
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 text-[11px] text-primary hover:underline"
              >
                Hapus pencarian
              </button>
            </div>
          ) : (
            <>
              {/* Show assigned first, then unassigned */}
              {filteredList.some((t) => t.isAssigned) && (
                <div className="px-6 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 bg-white/2">
                  Ditugaskan ({filteredAssignedCount})
                </div>
              )}
              <div className="divide-y divide-white/5">
                {filteredList.filter((t) => t.isAssigned).map((target) => (
                  <ListItem
                    key={target.id}
                    target={target}
                    activeTab={activeTab}
                    pendingId={pendingId}
                    onToggle={activeTab === 'group' ? handleToggleGroup : handleToggleDevice}
                  />
                ))}
              </div>
              {filteredList.some((t) => !t.isAssigned) && (
                <div className="px-6 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 bg-white/2">
                  Belum Ditugaskan ({filteredList.length - filteredAssignedCount})
                </div>
              )}
              <div className="divide-y divide-white/5">
                {filteredList.filter((t) => !t.isAssigned).map((target) => (
                  <ListItem
                    key={target.id}
                    target={target}
                    activeTab={activeTab}
                    pendingId={pendingId}
                    onToggle={activeTab === 'group' ? handleToggleGroup : handleToggleDevice}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/8">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-white/5 border border-white/8 text-sm font-medium text-slate-300 hover:bg-white/8 hover:text-white transition-all"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// Extracted list item for cleaner code
function ListItem({
  target,
  activeTab,
  pendingId,
  onToggle,
}: {
  target: AssignTarget
  activeTab: 'group' | 'device'
  pendingId: string | null
  onToggle: (id: string) => void
}) {
  return (
    <div className={`flex items-center justify-between gap-3 px-6 py-3.5 transition-colors ${
      target.isAssigned ? 'bg-white/2' : 'hover:bg-white/2'
    }`}>
      <div className="flex items-center gap-3 min-w-0">
        {activeTab === 'group' && target.color ? (
          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: target.color }} />
        ) : (
          <span className={`w-2 h-2 rounded-full shrink-0 ${target.isAssigned ? 'bg-emerald-500' : 'bg-slate-600'}`} />
        )}
        <div className="min-w-0">
          <div className="text-sm font-medium text-white truncate">{target.name}</div>
          <div className="text-[11px] text-slate-400">
            {activeTab === 'group' && target.memberCount !== undefined && (
              <span>{target.memberCount} device</span>
            )}
            {target.currentProfileName && !target.isAssigned && (
              <span className="ml-1 text-amber-400">&middot; aktif: {target.currentProfileName}</span>
            )}
          </div>
        </div>
      </div>
      <button
        onClick={() => onToggle(target.id)}
        disabled={pendingId === target.id}
        className={`shrink-0 rounded-lg border px-3 py-1.5 text-[10px] font-semibold transition-all disabled:opacity-50 ${
          target.isAssigned
            ? 'border-rose-500/20 text-rose-400 hover:bg-rose-500/10'
            : 'border-primary/20 text-primary hover:bg-primary/10'
        }`}
      >
        {pendingId === target.id ? (
          <span className="flex items-center gap-1">
            <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            ...
          </span>
        ) : target.isAssigned ? 'Remove' : 'Assign'}
      </button>
    </div>
  )
}
