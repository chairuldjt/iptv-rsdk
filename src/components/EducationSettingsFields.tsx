'use client'

import React, { useState } from 'react'

type EducationSettingsFieldsProps = {
  source: string
  playbackMode: string
  videoPath: string
  username: string
  password: string
  domain: string
}

export default function EducationSettingsFields({
  source,
  playbackMode,
  videoPath,
  username,
  password,
  domain,
}: EducationSettingsFieldsProps) {
  const [activeSource, setActiveSource] = useState(source || 'smb')
  const [activePlaybackMode, setActivePlaybackMode] = useState(playbackMode || 'copy')

  return (
    <div className="md:col-span-2 space-y-4">
      <input type="hidden" name="educationSource" value={activeSource} />
      <input type="hidden" name="educationPlaybackMode" value={activePlaybackMode} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ControlGroup
          label="Sumber Video Edukasi"
          options={[
            { value: 'smb', title: 'SMB Share', description: 'Ambil dari Windows Share lokal' },
            { value: 'web', title: 'Web Repository', description: 'Ambil dari repository server' },
          ]}
          value={activeSource}
          onChange={setActiveSource}
        />

        <ControlGroup
          label="Mode Playback"
          options={[
            { value: 'copy', title: 'Salin Lokal', description: 'Download/cache dulu di STB' },
            { value: 'stream', title: 'Streaming', description: 'Putar langsung dari sumber' },
          ]}
          value={activePlaybackMode}
          onChange={setActivePlaybackMode}
        />
      </div>

      {activeSource === 'web' ? (
        <>
          <input type="hidden" name="educationVideoPath" value={videoPath} />
          <input type="hidden" name="educationSmbUsername" value={username} />
          <input type="hidden" name="educationSmbPassword" value={password} />
          <input type="hidden" name="educationSmbDomain" value={domain} />

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold text-emerald-300">Web Repository aktif</p>
                <p className="text-[11px] text-emerald-100/70 mt-0.5">
                  Path SMB tidak dibutuhkan. STB mengambil daftar video dari repository server.
                </p>
              </div>
              <a
                href="/dashboard/videos"
                className="shrink-0 px-3 py-2 rounded-lg border border-emerald-400/20 text-emerald-100 hover:bg-emerald-400/10 text-xs font-bold transition-colors"
              >
                Kelola Video Repository
              </a>
            </div>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl border border-slate-800 bg-slate-950/30 p-4">
          <div className="md:col-span-2">
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Jalur Folder Video SMB</label>
            <input
              type="text"
              name="educationVideoPath"
              defaultValue={videoPath}
              placeholder="Contoh: \\10.45.128.129\edukasi"
              className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-primary font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Username SMB</label>
            <input
              type="text"
              name="educationSmbUsername"
              defaultValue={username}
              placeholder="Guest jika kosong"
              className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Domain SMB</label>
            <input
              type="text"
              name="educationSmbDomain"
              defaultValue={domain}
              placeholder="Opsional"
              className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-primary"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Password SMB</label>
            <input
              type="password"
              name="educationSmbPassword"
              defaultValue={password}
              placeholder="Kosongkan jika tanpa password"
              className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-primary"
            />
          </div>
        </div>
      )}
    </div>
  )
}

function ControlGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: Array<{ value: string; title: string; description: string }>
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div>
      <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">{label}</span>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => {
          const active = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`text-left rounded-xl border px-3 py-3 transition-all ${
                active
                  ? 'border-indigo-400/40 bg-indigo-500/15 text-white'
                  : 'border-slate-800 bg-slate-950/35 text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <span className="block text-xs font-extrabold">{option.title}</span>
              <span className="block text-[10px] mt-1 leading-4">{option.description}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
