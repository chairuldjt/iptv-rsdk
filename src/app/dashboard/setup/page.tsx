import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  defaultDeviceConfigFromFormData,
  getDefaultDeviceConfig,
  resetDefaultDeviceConfig,
  setDefaultDeviceConfig,
} from '@/lib/defaultDeviceConfig'
import {
  getAppPublicOrigin,
  getApiBaseUrl,
  getOnDemandHlsRelayConfig,
  getPrimaryNtpServer,
  resetRelayRuntimeSettings,
  setAppPublicOrigin,
  setApiBaseUrl,
  setOnDemandHlsRelayConfig,
  setPrimaryNtpServer,
} from '@/lib/settings'
import EducationSettingsFields from '@/components/EducationSettingsFields'
import PageHeader from '@/components/PageHeader'
import SectionCard from '@/components/SectionCard'
import SetupTabWrapper from './SetupTabWrapper'
import { normalizeSyncMode } from '@/lib/defaults'

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

async function saveRelayRuntimeAction(formData: FormData) {
  'use server'
  await setAppPublicOrigin(formData.get('appPublicOrigin') as string)
  await setApiBaseUrl(formData.get('apiBaseUrl') as string)
  await setPrimaryNtpServer(formData.get('primaryNtpServer') as string)
  await setOnDemandHlsRelayConfig({
    ffmpegBin: formData.get('ffmpegBin') as string,
    localAddr: formData.get('localAddr') as string,
    outputRoot: formData.get('outputRoot') as string,
    hlsTime: formData.get('hlsTime') as string,
    hlsListSize: formData.get('hlsListSize') as string,
    fifoSize: formData.get('fifoSize') as string,
    logLevel: formData.get('logLevel') as string,
    idleTimeoutMs: Number.parseInt(formData.get('idleTimeoutMs') as string, 10),
  })
  revalidatePath('/dashboard/setup')
  redirect('/dashboard/setup?relaySaved=1')
}

async function resetRelayRuntimeAction() {
  'use server'
  await resetRelayRuntimeSettings()
  revalidatePath('/dashboard/setup')
  redirect('/dashboard/setup?relayReset=1')
}

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; reset?: string; relaySaved?: string; relayReset?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const config = await getDefaultDeviceConfig()
  const relayConfig = await getOnDemandHlsRelayConfig()
  const appPublicOrigin = await getAppPublicOrigin()
  const apiBaseUrl = await getApiBaseUrl()
  const primaryNtpServer = await getPrimaryNtpServer()
  const showSaved = resolvedSearchParams.saved === '1'
  const showReset = resolvedSearchParams.reset === '1'
  const showRelaySaved = resolvedSearchParams.relaySaved === '1'
  const showRelayReset = resolvedSearchParams.relayReset === '1'

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Setup Defaults"
        description="Konfigurasi dasar yang otomatis diberikan ke STB saat pertama kali registrasi dan sinkronisasi ke server."
      />

      <SetupTabWrapper
        showSaved={showSaved}
        showReset={showReset}
        showRelaySaved={showRelaySaved}
        showRelayReset={showRelayReset}
        resetDefaultSetupAction={resetDefaultSetupAction}
        resetRelayRuntimeAction={resetRelayRuntimeAction}
        defaultSection={
          <DefaultSetupSection config={config} saveDefaultSetupAction={saveDefaultSetupAction} />
        }
        runtimeSection={
          <RuntimeRelaySection
            relayConfig={relayConfig}
            appPublicOrigin={appPublicOrigin}
            apiBaseUrl={apiBaseUrl}
            primaryNtpServer={primaryNtpServer}
            saveRelayRuntimeAction={saveRelayRuntimeAction}
          />
        }
      />
    </div>
  )
}

/* ---- Default Setup Section ---- */
function DefaultSetupSection({ config, saveDefaultSetupAction }: { config: Awaited<ReturnType<typeof getDefaultDeviceConfig>>; saveDefaultSetupAction: (fd: FormData) => Promise<void> }) {
  return (
    <form action={saveDefaultSetupAction}>
      <SectionCard title="Playback &amp; Sync" description="Mode sumber channel, interval sync, dan tampilan player awal.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Sync Mode">
            <select name="syncMode" defaultValue={normalizeSyncMode(config.syncMode)} className="field-input py-2">
              <option value="api">API Server (Centralized)</option>
              <option value="custom">Custom M3U URL</option>
            </select>
          </Field>
          <Field label="Aspect Ratio">
            <select name="aspectRatio" defaultValue={config.aspectRatio} className="field-input py-2">
              <option value="fit">Fit (Original Scale)</option>
              <option value="stretch">Stretch (Fullscreen)</option>
              <option value="zoom">Zoom (Cropped Full)</option>
              <option value="16_9">Force 16:9</option>
              <option value="4_3">Force 4:3</option>
            </select>
          </Field>
          <Field label="Custom M3U URL">
            <input type="url" name="customM3uUrl" defaultValue={config.customM3uUrl} placeholder="http://your-server.com/playlist.m3u" className="field-input font-mono" />
          </Field>
          <Field label="Sync Interval (Detik)">
            <input type="number" name="syncInterval" defaultValue={config.syncInterval} min={60} max={86400} required className="field-input" />
          </Field>
          <Field label="Default Category">
            <input type="text" name="defaultCategory" defaultValue={config.defaultCategory} className="field-input" />
          </Field>
          <Field label="Default Channel ID">
            <input type="number" name="defaultChannelId" defaultValue={config.defaultChannelId ?? ''} min={1} placeholder="Kosongkan jika tidak ada" className="field-input" />
          </Field>
          <Field label="Start Screen">
            <select name="startScreen" defaultValue={config.startScreen} className="field-input py-2">
              <option value="live_tv">Live TV</option>
              <option value="category_list">Category List</option>
              <option value="home_screen">Home Screen</option>
            </select>
          </Field>
          <Field label="Technician PIN">
            <input type="text" name="technicianPin" defaultValue={config.technicianPin} required maxLength={8} className="field-input font-mono text-center font-bold tracking-widest text-primary" />
          </Field>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <Toggle name="lockSettings" defaultChecked={config.lockSettings} title="Kunci Pengaturan" description="STB baru akan mengunci halaman setting dengan PIN teknisi." />
          <Toggle name="autoStartOnBoot" defaultChecked={config.autoStartOnBoot} title="Auto Start on Boot" description="STB baru otomatis membuka aplikasi setelah perangkat menyala." />
        </div>
      </SectionCard>

      <SectionCard title="Video Edukasi" description="Folder default, kredensial, sumber, dan cara putar video edukasi." className="mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <EducationSettingsFields
            source={config.educationSource}
            playbackMode={config.educationPlaybackMode}
            videoPath={config.educationVideoPath}
            username={config.educationSmbUsername}
            password={config.educationSmbPassword}
            domain={config.educationSmbDomain}
          />
          <Field label="Repeat Mode">
            <select name="educationRepeatMode" defaultValue={config.educationRepeatMode} className="field-input py-2">
              <option value="all">Ulangi Semua</option>
              <option value="one">Ulangi Satu</option>
              <option value="none">Sekali Putar</option>
            </select>
          </Field>
          <Field label="Play Order">
            <select name="educationPlayOrder" defaultValue={config.educationPlayOrder} className="field-input py-2">
              <option value="alphabetical">Berdasarkan Nama (A-Z)</option>
              <option value="random">Acak</option>
              <option value="shuffle">Campur Stabil</option>
            </select>
          </Field>
        </div>
      </SectionCard>

      <div className="sticky-footer">
        <button type="submit" className="btn btn-primary py-2.5">Simpan Default Setup</button>
      </div>
    </form>
  )
}

/* ---- Runtime Relay Section ---- */
function RuntimeRelaySection({
  relayConfig, appPublicOrigin, apiBaseUrl, primaryNtpServer, saveRelayRuntimeAction,
}: {
  relayConfig: Awaited<ReturnType<typeof getOnDemandHlsRelayConfig>>
  appPublicOrigin: string
  apiBaseUrl: string
  primaryNtpServer: string
  saveRelayRuntimeAction: (fd: FormData) => Promise<void>
}) {
  return (
    <form action={saveRelayRuntimeAction}>
      <SectionCard title="Relay &amp; NTP Runtime" description="Pengganti env IPTV_ON_DEMAND_*, APP_PUBLIC_ORIGIN, dan server NTP utama. Env tetap dipakai sebagai fallback.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="APP Public Origin" wide>
            <input type="url" name="appPublicOrigin" defaultValue={appPublicOrigin} placeholder="https://iptv.teknisirsdk.my.id" className="field-input font-mono" />
          </Field>
          <Field label="API Server Base URL" wide>
            <input type="url" name="apiBaseUrl" defaultValue={apiBaseUrl} placeholder="https://iptv.teknisirsdk.my.id" className="field-input font-mono" />
          </Field>
          <Field label="Primary NTP Server">
            <input type="text" name="primaryNtpServer" defaultValue={primaryNtpServer} placeholder="0.id.pool.ntp.org" className="field-input font-mono" />
          </Field>
          <Field label="FFmpeg Binary">
            <input type="text" name="ffmpegBin" defaultValue={relayConfig.ffmpegBin} required className="field-input font-mono" />
          </Field>
          <Field label="UDP Local Address">
            <input type="text" name="localAddr" defaultValue={relayConfig.localAddr} required className="field-input font-mono" />
          </Field>
          <Field label="Output Root" wide>
            <input type="text" name="outputRoot" defaultValue={relayConfig.outputRoot} required className="field-input font-mono" />
          </Field>
          <Field label="HLS Time"><input type="number" step="0.5" min={0.5} name="hlsTime" defaultValue={relayConfig.hlsTime} required className="field-input" /></Field>
          <Field label="HLS List Size"><input type="number" min={1} name="hlsListSize" defaultValue={relayConfig.hlsListSize} required className="field-input" /></Field>
          <Field label="UDP FIFO Size"><input type="number" min={1} name="fifoSize" defaultValue={relayConfig.fifoSize} required className="field-input" /></Field>
          <Field label="Idle Timeout (ms)"><input type="number" min={10000} name="idleTimeoutMs" defaultValue={relayConfig.idleTimeoutMs} required className="field-input" /></Field>
          <Field label="FFmpeg Log Level">
            <select name="logLevel" defaultValue={relayConfig.logLevel} className="field-input py-2">
              <option value="quiet">quiet</option>
              <option value="panic">panic</option>
              <option value="fatal">fatal</option>
              <option value="error">error</option>
              <option value="warning">warning</option>
              <option value="info">info</option>
              <option value="verbose">verbose</option>
              <option value="debug">debug</option>
            </select>
          </Field>
        </div>
      </SectionCard>

      <div className="sticky-footer mt-6">
        <button type="submit" className="btn btn-primary py-2.5">Simpan Runtime Settings</button>
      </div>
    </form>
  )
}

/* ---- Shared field & toggle helpers ---- */
function Field({ label, wide = false, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <label className={`form-group ${wide ? 'md:col-span-2' : ''}`}>
      <span>{label}</span>
      {children}
    </label>
  )
}

function Toggle({ name, defaultChecked, title, description }: { name: string; defaultChecked: boolean; title: string; description: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer p-3 bg-accent/30 border border-border rounded-xl hover:bg-accent/50 transition-colors">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="w-4 h-4 rounded accent-primary" />
      <span>
        <span className="text-xs font-semibold text-foreground block">{title}</span>
        <span className="text-[0.625rem] text-muted-foreground">{description}</span>
      </span>
    </label>
  )
}
