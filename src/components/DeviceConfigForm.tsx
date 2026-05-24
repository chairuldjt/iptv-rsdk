'use client'

import React, { useState } from 'react'
import type { Device, DeviceConfig } from '@prisma/client'
import ConfirmForm from './ConfirmForm'
import { DEFAULT_CUSTOM_M3U_URL, DEFAULT_SYNC_MODE } from '@/lib/defaults'

interface DeviceConfigFormProps {
  editingDevice: Device & { config: DeviceConfig | null }
  saveDeviceConfigAction: (formData: FormData) => void | Promise<void>
  clearDeviceCacheAction: (formData: FormData) => void | Promise<void>
}

export default function DeviceConfigForm({
  editingDevice,
  saveDeviceConfigAction,
  clearDeviceCacheAction,
}: DeviceConfigFormProps) {
  // Use controlled states to ensure UI reflects database changes and user input correctly
  const [syncMode, setSyncMode] = useState(editingDevice.config?.syncMode || DEFAULT_SYNC_MODE)
  const [lockSettings, setLockSettings] = useState(editingDevice.config?.lockSettings ?? true)
  const [autoStart, setAutoStart] = useState(editingDevice.config?.autoStartOnBoot ?? false)

  return (
    <div className="space-y-6">
      <form action={saveDeviceConfigAction} className="space-y-6">
        <input type="hidden" name="deviceId" value={editingDevice.deviceId} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Friendly Name</label>
            <input
              type="text"
              name="deviceName"
              defaultValue={editingDevice.deviceName}
              required
              className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Sync Mode (Playlist Source)</label>
            <select
              name="syncMode"
              value={syncMode}
              onChange={(e) => setSyncMode(e.target.value)}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-primary"
            >
              <option value="api">API Server (Centralized / Global)</option>
              <option value="api_relay">API Server Relay (Server Proxy Stream)</option>
              <option value="custom">Custom M3U URL (Device Specific)</option>
            </select>
          </div>

          {syncMode === 'custom' && (
            <div className="md:col-span-2 animate-fade-in">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Custom M3U URL</label>
              <input
                type="url"
                name="customM3uUrl"
                defaultValue={editingDevice.config?.customM3uUrl || DEFAULT_CUSTOM_M3U_URL}
                required={syncMode === 'custom'}
                placeholder="http://your-server.com/playlist.m3u"
                className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-primary font-mono"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Aspect Ratio</label>
            <select
              name="aspectRatio"
              defaultValue={editingDevice.config?.aspectRatio || 'fit'}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-primary"
            >
              <option value="fit">Fit (Original Scale)</option>
              <option value="stretch">Stretch (Fullscreen)</option>
              <option value="zoom">Zoom (Cropped Full)</option>
              <option value="16_9">Force 16:9</option>
              <option value="4_3">Force 4:3</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Sync (Sec)</label>
              <input
                type="number"
                name="syncInterval"
                defaultValue={editingDevice.config?.syncInterval || 1800}
                required
                min={60}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Tech PIN</label>
              <input
                type="text"
                name="technicianPin"
                defaultValue={editingDevice.config?.technicianPin || '2468'}
                required
                maxLength={8}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-primary font-mono text-center"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-border/60 space-y-4">
          <div className="flex items-center gap-2 text-amber-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs font-extrabold uppercase tracking-wider">Konten Hiburan</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Judul Custom Konten</label>
              <input
                type="text"
                name="entertainmentCustomTitle"
                defaultValue={editingDevice.config?.entertainmentCustomTitle || 'Custom Konten'}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">URL Custom Konten</label>
              <input
                type="url"
                name="entertainmentCustomUrl"
                defaultValue={editingDevice.config?.entertainmentCustomUrl || ''}
                placeholder="https://contoh-rs.local/hiburan"
                className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-primary font-mono"
              />
            </div>
          </div>
        </div>

        {/* SMB Education Settings Block */}
        <div className="pt-4 border-t border-border/60 space-y-4">
          <div className="flex items-center gap-2 text-indigo-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span className="text-xs font-extrabold uppercase tracking-wider">Konten Edukasi</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Sumber Video Edukasi</label>
              <select
                name="educationSource"
                defaultValue={editingDevice.config?.educationSource || 'smb'}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-primary"
              >
                <option value="smb">SMB / Windows Share (Lokal)</option>
                <option value="web">Web Repository (Terpusat)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Mode Playback Edukasi</label>
              <select
                name="educationPlaybackMode"
                defaultValue={editingDevice.config?.educationPlaybackMode || 'copy'}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-primary"
              >
                <option value="copy">Salin ke Lokal (Unduh Dulu)</option>
                <option value="stream">Alirkan Langsung (Streaming)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Jalur Folder Video (SMB Share)</label>
              <input
                type="text"
                name="educationVideoPath"
                defaultValue={editingDevice.config?.educationVideoPath || ''}
                placeholder="Contoh: \\10.45.128.129\edukasi"
                className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-primary font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Username SMB</label>
              <input
                type="text"
                name="educationSmbUsername"
                defaultValue={editingDevice.config?.educationSmbUsername || ''}
                placeholder="Guest jika kosong"
                className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Domain SMB</label>
              <input
                type="text"
                name="educationSmbDomain"
                defaultValue={editingDevice.config?.educationSmbDomain || ''}
                placeholder="Opsional"
                className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-primary"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Password SMB</label>
              <input
                type="password"
                name="educationSmbPassword"
                defaultValue={editingDevice.config?.educationSmbPassword || ''}
                placeholder="Kosongkan jika tanpa password"
                className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Mode Pengulangan Video</label>
              <select
                name="educationRepeatMode"
                defaultValue={editingDevice.config?.educationRepeatMode || 'all'}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-primary"
              >
                <option value="all">Ulangi Semua (Repeat All)</option>
                <option value="one">Ulangi Satu (Repeat One)</option>
                <option value="none">Sekali Putar (No Repeat)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Urutan Putar Video</label>
              <select
                name="educationPlayOrder"
                defaultValue={editingDevice.config?.educationPlayOrder || 'alphabetical'}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-primary"
              >
                <option value="alphabetical">Berdasarkan Nama (A-Z)</option>
                <option value="random">Acak (Random)</option>
                <option value="shuffle">Campur (Shuffle)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Toggles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border/60">
          <label className="flex items-center gap-3 cursor-pointer p-1.5 hover:bg-slate-800/20 rounded-lg transition-colors">
            <input
              type="checkbox"
              name="lockSettings"
              checked={lockSettings}
              onChange={(e) => setLockSettings(e.target.checked)}
              className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary"
            />
            <div>
              <span className="text-xs font-bold text-white">Global Settings Lock (Padlock)</span>
              <p className="text-[10px] text-slate-500">Mask settings screen with padlock overlay & PIN.</p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer p-1.5 hover:bg-slate-800/20 rounded-lg transition-colors">
            <input
              type="checkbox"
              name="autoStartOnBoot"
              checked={autoStart}
              onChange={(e) => setAutoStart(e.target.checked)}
              className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary"
            />
            <div>
              <span className="text-xs font-bold text-white">Auto Start on Boot</span>
              <p className="text-[10px] text-slate-500">Launch player right after STB turns on.</p>
            </div>
          </label>
        </div>

        <div className="flex items-center gap-3 p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/15">
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </div>
          <div>
            <span className="text-xs font-bold text-indigo-400 block">Real-Time Sync Active</span>
            <p className="text-[10px] text-indigo-400/70">Changes are picked up by the device on the next heartbeat.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <button
            type="submit"
            name="educationForceSyncTrigger"
            value="true"
            className="py-3 px-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 text-indigo-400 hover:bg-indigo-500 hover:text-white font-bold text-xs transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18.5" />
            </svg>
            Paksa Salin Ulang SMB ke STB
          </button>
          <button
            type="submit"
            className="flex-1 py-3 rounded-xl bg-primary hover:bg-indigo-500 font-bold text-white text-sm transition-all duration-200 cursor-pointer text-center glow-indigo"
          >
            Save Configuration Override
          </button>
        </div>
      </form>

      {/* Maintenance Section */}
      <div className="pt-6 border-t border-border/60">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Maintenance Tools</h4>
        <ConfirmForm 
          action={clearDeviceCacheAction} 
          message="Bersihkan semua cache saluran pada perangkat ini? Perangkat akan mengunduh ulang playlist saat sinkronisasi berikutnya."
        >
          <input type="hidden" name="deviceId" value={editingDevice.deviceId} />
          <button
            type="submit"
            className="w-full py-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-400 hover:bg-amber-500 hover:text-white font-bold text-xs transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Bersihkan Cache Saluran Perangkat (Remote)
          </button>
        </ConfirmForm>
      </div>
    </div>
  )
}
