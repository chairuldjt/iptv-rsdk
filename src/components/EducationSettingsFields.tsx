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
  source, playbackMode, videoPath, username, password, domain,
}: EducationSettingsFieldsProps) {
  const [activeSource, setActiveSource] = useState(source || 'smb')
  const [activePlaybackMode, setActivePlaybackMode] = useState(playbackMode || 'copy')

  return (
    <div className="md:col-span-2 space-y-4">
      <input type="hidden" name="educationSource" value={activeSource} />
      <input type="hidden" name="educationPlaybackMode" value={activePlaybackMode} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ControlGroup label="Sumber Video Edukasi" value={activeSource} onChange={setActiveSource}
          options={[
            { value: 'smb', title: 'SMB Share', description: 'Ambil dari Windows Share lokal' },
            { value: 'web', title: 'Web Repository', description: 'Ambil dari repository server' },
          ]} />
        <ControlGroup label="Mode Playback" value={activePlaybackMode} onChange={setActivePlaybackMode}
          options={[
            { value: 'copy', title: 'Salin Lokal', description: 'Download/cache dulu di STB' },
            { value: 'stream', title: 'Streaming', description: 'Putar langsung dari sumber' },
          ]} />
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
                <p className="text-[11px] text-emerald-100/70 mt-0.5">Path SMB tidak dibutuhkan. STB mengambil daftar video dari repository server.</p>
              </div>
              <a href="/dashboard/videos" className="shrink-0 btn btn-xs text-emerald-300 border border-emerald-400/20 hover:bg-emerald-400/10">
                Kelola Video Repository
              </a>
            </div>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl border border-border bg-accent/30 p-4">
          <div className="md:col-span-2">
            <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Jalur Folder Video SMB</label>
            <input type="text" name="educationVideoPath" defaultValue={videoPath}
              placeholder="Contoh: \\10.45.128.129\edukasi" className="field-input font-mono" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Username SMB</label>
            <input type="text" name="educationSmbUsername" defaultValue={username} placeholder="Guest jika kosong" className="field-input" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Domain SMB</label>
            <input type="text" name="educationSmbDomain" defaultValue={domain} placeholder="Opsional" className="field-input" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Password SMB</label>
            <input type="password" name="educationSmbPassword" defaultValue={password} placeholder="Kosongkan jika tanpa password" className="field-input" />
          </div>
        </div>
      )}
    </div>
  )
}

function ControlGroup({ label, options, value, onChange }: {
  label: string
  options: Array<{ value: string; title: string; description: string }>
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div>
      <span className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">{label}</span>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => {
          const active = option.value === value
          return (
            <button
              key={option.value} type="button"
              onClick={() => onChange(option.value)}
              className={`text-left rounded-xl border px-3 py-3 transition-all ${
                active
                  ? 'border-primary/40 bg-primary/10 text-foreground'
                  : 'border-border bg-background/40 text-muted-foreground hover:text-foreground hover:bg-accent/50'
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
