'use client'

import React, { useState } from 'react'
import type { Device, DeviceConfig } from '@prisma/client'
import ConfirmForm from './ConfirmForm'
import { DEFAULT_CUSTOM_M3U_URL, DEFAULT_SYNC_MODE, normalizeSyncMode } from '@/lib/defaults'
import EducationSettingsFields from './EducationSettingsFields'

interface DeviceConfigFormProps {
  editingDevice: Device & { config: DeviceConfig | null }
  saveDeviceConfigAction: (formData: FormData) => void | Promise<void>
  clearDeviceCacheAction: (formData: FormData) => void | Promise<void>
}

export default function DeviceConfigForm({ editingDevice, saveDeviceConfigAction, clearDeviceCacheAction }: DeviceConfigFormProps) {
  const [syncMode, setSyncMode] = useState(normalizeSyncMode(editingDevice.config?.syncMode || DEFAULT_SYNC_MODE))
  const [lockSettings, setLockSettings] = useState(editingDevice.config?.lockSettings ?? true)
  const [autoStart, setAutoStart] = useState(editingDevice.config?.autoStartOnBoot ?? false)

  return (
    <div className="space-y-6">
      <form action={saveDeviceConfigAction} className="space-y-6">
        <input type="hidden" name="deviceId" value={editingDevice.deviceId} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Friendly Name</label>
            <input type="text" name="deviceName" defaultValue={editingDevice.deviceName} required className="field-input" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Sync Mode (Playlist Source)</label>
            <select name="syncMode" value={syncMode} onChange={(e) => setSyncMode(normalizeSyncMode(e.target.value))} className="field-input py-2">
              <option value="api">API Server (Centralized / Global)</option>
              <option value="custom">Custom M3U URL (Device Specific)</option>
            </select>
          </div>
          {syncMode === 'custom' && (
            <div className="md:col-span-2 animate-fade-in">
              <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Custom M3U URL</label>
              <input type="url" name="customM3uUrl" defaultValue={editingDevice.config?.customM3uUrl || DEFAULT_CUSTOM_M3U_URL}
                required={syncMode === 'custom'} placeholder="http://your-server.com/playlist.m3u" className="field-input font-mono" />
            </div>
          )}
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Aspect Ratio</label>
            <select name="aspectRatio" defaultValue={editingDevice.config?.aspectRatio || 'fit'} className="field-input py-2">
              <option value="fit">Fit (Original Scale)</option>
              <option value="stretch">Stretch (Fullscreen)</option>
              <option value="zoom">Zoom (Cropped Full)</option>
              <option value="16_9">Force 16:9</option>
              <option value="4_3">Force 4:3</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Sync (Sec)</label>
              <input type="number" name="syncInterval" defaultValue={editingDevice.config?.syncInterval || 1800} required min={60} className="field-input text-center" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Tech PIN</label>
              <input type="text" name="technicianPin" defaultValue={editingDevice.config?.technicianPin || '2468'} required maxLength={8}
                className="field-input font-mono text-center font-bold tracking-widest text-primary" />
            </div>
          </div>
        </div>

        {/* Education Settings */}
        <div className="pt-4 border-t border-border space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Konten Edukasi</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <EducationSettingsFields
              source={editingDevice.config?.educationSource || 'smb'}
              playbackMode={editingDevice.config?.educationPlaybackMode || 'copy'}
              videoPath={editingDevice.config?.educationVideoPath || ''}
              username={editingDevice.config?.educationSmbUsername || ''}
              password={editingDevice.config?.educationSmbPassword || ''}
              domain={editingDevice.config?.educationSmbDomain || ''}
            />
            <div>
              <label className="block text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Mode Pengulangan Video</label>
              <select name="educationRepeatMode" defaultValue={editingDevice.config?.educationRepeatMode || 'all'} className="field-input py-2">
                <option value="all">Ulangi Semua (Repeat All)</option>
                <option value="one">Ulangi Satu (Repeat One)</option>
                <option value="none">Sekali Putar (No Repeat)</option>
              </select>
            </div>
            <div>
              <label className="block text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Urutan Putar Video</label>
              <select name="educationPlayOrder" defaultValue={editingDevice.config?.educationPlayOrder || 'alphabetical'} className="field-input py-2">
                <option value="alphabetical">Berdasarkan Nama (A-Z)</option>
                <option value="random">Acak (Random)</option>
                <option value="shuffle">Campur (Shuffle)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Toggles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border">
          <label className="flex items-center gap-3 cursor-pointer p-3 bg-accent/30 border border-border rounded-xl hover:bg-accent/50 transition-colors">
            <input type="checkbox" name="lockSettings" checked={lockSettings}
              onChange={(e) => setLockSettings(e.target.checked)}
              className="w-4 h-4 rounded accent-primary" />
            <div>
              <span className="text-xs font-semibold text-foreground">Global Settings Lock (Padlock)</span>
              <p className="text-[10px] text-muted-foreground">Mask settings screen with padlock overlay & PIN.</p>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer p-3 bg-accent/30 border border-border rounded-xl hover:bg-accent/50 transition-colors">
            <input type="checkbox" name="autoStartOnBoot" checked={autoStart}
              onChange={(e) => setAutoStart(e.target.checked)}
              className="w-4 h-4 rounded accent-primary" />
            <div>
              <span className="text-xs font-semibold text-foreground">Auto Start on Boot</span>
              <p className="text-[10px] text-muted-foreground">Launch player right after STB turns on.</p>
            </div>
          </label>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/15">
          <div className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </div>
          <div>
            <span className="text-xs font-bold text-primary block">Real-Time Sync Active</span>
            <p className="text-[10px] text-primary/70">Changes are picked up by the device on the next heartbeat.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button type="submit" name="educationForceSyncTrigger" value="true"
            className="btn btn-secondary btn-sm py-2.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
            Paksa Sync Edukasi ke STB
          </button>
          <button type="submit" className="flex-1 btn btn-primary btn-sm py-2.5">
            Save Configuration Override
          </button>
        </div>
      </form>

      {/* Maintenance */}
      <div className="pt-4 border-t border-border space-y-3">
        <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest block">Maintenance Tools</h4>
        <ConfirmForm action={clearDeviceCacheAction}
          message="Bersihkan semua cache saluran pada perangkat ini? Perangkat akan mengunduh ulang playlist saat sinkronisasi berikutnya.">
          <input type="hidden" name="deviceId" value={editingDevice.deviceId} />
          <button type="submit"
            className="w-full py-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-400 hover:bg-amber-500/10 font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
            Bersihkan Cache Saluran Perangkat (Remote)
          </button>
        </ConfirmForm>
      </div>
    </div>
  )
}
