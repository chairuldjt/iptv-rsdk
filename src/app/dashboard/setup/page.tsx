import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  defaultDeviceConfigFromFormData,
  getDefaultDeviceConfig,
  resetDefaultDeviceConfig,
  setDefaultDeviceConfig,
} from '@/lib/defaultDeviceConfig'

export const revalidate = 0

async function saveDefaultSetupAction(formData: FormData) {
  'use server'

  await setDefaultDeviceConfig(defaultDeviceConfigFromFormData(formData))
  revalidatePath('/dashboard/setup')
  redirect('/dashboard/setup?saved=1')
}

async function resetDefaultSetupAction() {
  'use server'

  await resetDefaultDeviceConfig()
  revalidatePath('/dashboard/setup')
  redirect('/dashboard/setup?reset=1')
}

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; reset?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const config = await getDefaultDeviceConfig()
  const showSaved = resolvedSearchParams.saved === '1'
  const showReset = resolvedSearchParams.reset === '1'

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white">Default App Setup</h2>
        <p className="text-slate-400 mt-1 text-sm">
          Konfigurasi dasar yang otomatis diberikan ke STB saat pertama kali register dan sync ke server.
        </p>
      </div>

      {showSaved && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold">
          Default setup saved. Device baru akan memakai konfigurasi ini saat register berikutnya.
        </div>
      )}

      {showReset && (
        <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl text-xs font-bold">
          Default setup dikembalikan ke nilai bawaan aplikasi.
        </div>
      )}

      <div className="glass-panel rounded-2xl border border-border p-6">
        <form action={saveDefaultSetupAction} className="space-y-8">
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-3">
              <div>
                <h3 className="font-bold text-white text-lg">Playback & Sync</h3>
                <p className="text-xs text-slate-500 mt-1">Mode sumber channel, interval sync, dan tampilan player awal.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Sync Mode">
                <select
                  name="syncMode"
                  defaultValue={config.syncMode}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-primary"
                >
                  <option value="api">API Server (Centralized / Global)</option>
                  <option value="api_relay">API Server Relay (Server Proxy Stream)</option>
                  <option value="custom">Custom M3U URL (Device Specific)</option>
                </select>
              </Field>

              <Field label="Aspect Ratio">
                <select
                  name="aspectRatio"
                  defaultValue={config.aspectRatio}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-primary"
                >
                  <option value="fit">Fit (Original Scale)</option>
                  <option value="stretch">Stretch (Fullscreen)</option>
                  <option value="zoom">Zoom (Cropped Full)</option>
                  <option value="16_9">Force 16:9</option>
                  <option value="4_3">Force 4:3</option>
                </select>
              </Field>

              <Field label="Custom M3U URL">
                <input
                  type="url"
                  name="customM3uUrl"
                  defaultValue={config.customM3uUrl}
                  placeholder="http://your-server.com/playlist.m3u"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-primary font-mono"
                />
              </Field>

              <Field label="Sync Interval (Seconds)">
                <input
                  type="number"
                  name="syncInterval"
                  defaultValue={config.syncInterval}
                  min={60}
                  max={86400}
                  required
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-primary"
                />
              </Field>

              <Field label="Default Category">
                <input
                  type="text"
                  name="defaultCategory"
                  defaultValue={config.defaultCategory}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-primary"
                />
              </Field>

              <Field label="Default Channel ID">
                <input
                  type="number"
                  name="defaultChannelId"
                  defaultValue={config.defaultChannelId ?? ''}
                  min={1}
                  placeholder="Kosongkan jika tidak ada"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-primary"
                />
              </Field>

              <Field label="Start Screen">
                <select
                  name="startScreen"
                  defaultValue={config.startScreen}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-primary"
                >
                  <option value="live_tv">Live TV</option>
                  <option value="category_list">Category List</option>
                  <option value="home_screen">Home Screen</option>
                </select>
              </Field>

              <Field label="Technician PIN">
                <input
                  type="text"
                  name="technicianPin"
                  defaultValue={config.technicianPin}
                  required
                  maxLength={8}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-primary font-mono text-center"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Toggle
                name="lockSettings"
                defaultChecked={config.lockSettings}
                title="Lock Settings by Default"
                description="STB baru akan mengunci halaman setting dengan PIN teknisi."
              />
              <Toggle
                name="autoStartOnBoot"
                defaultChecked={config.autoStartOnBoot}
                title="Auto Start on Boot"
                description="STB baru otomatis membuka aplikasi setelah perangkat menyala."
              />
            </div>
          </section>

          <section className="space-y-4 border-t border-border/60 pt-6">
            <div>
              <h3 className="font-bold text-white text-lg">Education SMB</h3>
              <p className="text-xs text-slate-500 mt-1">Default folder dan kredensial video edukasi untuk perangkat baru.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="SMB Video Folder" wide>
                <input
                  type="text"
                  name="educationVideoPath"
                  defaultValue={config.educationVideoPath}
                  placeholder="Contoh: \\10.45.128.129\edukasi"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-primary font-mono"
                />
              </Field>

              <Field label="SMB Username">
                <input
                  type="text"
                  name="educationSmbUsername"
                  defaultValue={config.educationSmbUsername}
                  placeholder="Guest jika kosong"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-primary"
                />
              </Field>

              <Field label="SMB Domain">
                <input
                  type="text"
                  name="educationSmbDomain"
                  defaultValue={config.educationSmbDomain}
                  placeholder="Opsional"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-primary"
                />
              </Field>

              <Field label="SMB Password" wide>
                <input
                  type="password"
                  name="educationSmbPassword"
                  defaultValue={config.educationSmbPassword}
                  placeholder="Kosongkan jika tanpa password"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-primary"
                />
              </Field>

              <Field label="Repeat Mode">
                <select
                  name="educationRepeatMode"
                  defaultValue={config.educationRepeatMode}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-primary"
                >
                  <option value="all">Ulangi Semua</option>
                  <option value="one">Ulangi Satu</option>
                  <option value="none">Sekali Putar</option>
                </select>
              </Field>

              <Field label="Play Order">
                <select
                  name="educationPlayOrder"
                  defaultValue={config.educationPlayOrder}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-primary"
                >
                  <option value="alphabetical">Berdasarkan Nama (A-Z)</option>
                  <option value="random">Acak</option>
                  <option value="shuffle">Campur Stabil</option>
                </select>
              </Field>
            </div>
          </section>

          <div className="flex flex-col sm:flex-row gap-3 border-t border-border/60 pt-6">
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl bg-primary hover:bg-indigo-500 font-bold text-white text-sm transition-all duration-200 cursor-pointer text-center glow-indigo"
            >
              Save Default Setup
            </button>
          </div>
        </form>

        <form action={resetDefaultSetupAction} className="mt-4">
          <button
            type="submit"
            className="w-full py-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-400 hover:bg-amber-500 hover:text-white font-bold text-xs transition-all duration-200 cursor-pointer"
          >
            Reset to Built-in Defaults
          </button>
        </form>
      </div>
    </div>
  )
}

function Field({
  label,
  wide = false,
  children,
}: {
  label: string
  wide?: boolean
  children: React.ReactNode
}) {
  return (
    <label className={wide ? 'md:col-span-2' : ''}>
      <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</span>
      {children}
    </label>
  )
}

function Toggle({
  name,
  defaultChecked,
  title,
  description,
}: {
  name: string
  defaultChecked: boolean
  title: string
  description: string
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-900/40 border border-slate-800 rounded-xl">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary"
      />
      <span>
        <span className="text-xs font-bold text-white block">{title}</span>
        <span className="text-[10px] text-slate-500">{description}</span>
      </span>
    </label>
  )
}
