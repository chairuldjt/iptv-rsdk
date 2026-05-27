'use client'

import type { Dispatch, SetStateAction } from 'react'
import { useMemo, useState } from 'react'
import type {
  HomeExperienceConfig,
  HomeExperienceMenuItem,
  HomeExperienceScope,
  HomeExperienceStaticPage,
} from '@/lib/homeExperience'

type HomeExperienceFormProps = {
  scope: HomeExperienceScope
  targetId: string
  config: HomeExperienceConfig
  currentScopeLabel: string
  onSaveAction: (formData: FormData) => void | Promise<void>
  onResetAction: (formData: FormData) => void | Promise<void>
}

const MENU_TYPE_OPTIONS = [
  { value: 'tv', label: 'TV' },
  { value: 'education', label: 'Education' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'settings', label: 'Settings' },
  { value: 'info_dialog', label: 'Info Dialog' },
  { value: 'static_page', label: 'Static Page' },
] as const

const ICON_OPTIONS = ['live_tv', 'menu_book', 'movie', 'settings', 'info', 'room_service']

export default function HomeExperienceForm({
  scope,
  targetId,
  config,
  currentScopeLabel,
  onSaveAction,
  onResetAction,
}: HomeExperienceFormProps) {
  const [menus, setMenus] = useState<HomeExperienceMenuItem[]>(config.menus)
  const [staticPages, setStaticPages] = useState<HomeExperienceStaticPage[]>(config.staticPages)
  const [logoUrl, setLogoUrl] = useState(config.logoUrl)
  const [homeBackgroundUrl, setHomeBackgroundUrl] = useState(config.homeBackgroundUrl)
  const [splashEnabled, setSplashEnabled] = useState(config.splash.enabled)
  const [splashShowSound, setSplashShowSound] = useState(config.splash.showSound)
  const [splashBackgroundUrl, setSplashBackgroundUrl] = useState(config.splash.backgroundUrl)
  const [splashLogoUrl, setSplashLogoUrl] = useState(config.splash.logoUrl)
  const [splashSoundUrl, setSplashSoundUrl] = useState(config.splash.soundUrl)
  const [splashTitle, setSplashTitle] = useState(config.splash.title)
  const [splashSubtitle, setSplashSubtitle] = useState(config.splash.subtitle)
  const [splashFooterText, setSplashFooterText] = useState(config.splash.footerText)
  const [splashLoadingText, setSplashLoadingText] = useState(config.splash.loadingText)
  const [enableSelectionSound, setEnableSelectionSound] = useState(config.sounds.enableSelectionSound)
  const [enableSplashSound, setEnableSplashSound] = useState(config.sounds.enableSplashSound)
  const [selectionSoundUrl, setSelectionSoundUrl] = useState(config.sounds.selectionSoundUrl)

  const staticPageOptions = useMemo(
    () => staticPages.map((page) => ({ id: page.id, title: page.title || page.id })),
    [staticPages]
  )

  return (
    <div className="card rounded-2xl p-5 space-y-6">
      <div className="flex flex-col gap-2 border-b border-border pb-4">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Scope aktif</div>
        <div className="text-sm font-semibold text-foreground">{currentScopeLabel}</div>
        <p className="text-[11px] text-muted-foreground">
          Profile ini akan di-merge dengan prioritas Global -&gt; Group -&gt; Device. Perubahan diterapkan saat aplikasi Android restart.
        </p>
      </div>

      <form action={onSaveAction} className="space-y-6">
        <input type="hidden" name="scope" value={scope} />
        <input type="hidden" name="targetId" value={targetId} />
        <input type="hidden" name="revision" value={String(config.revision + 1)} />
        <input type="hidden" name="menusJson" value={JSON.stringify(menus)} />
        <input type="hidden" name="staticPagesJson" value={JSON.stringify(staticPages)} />

        <section className="space-y-4">
          <SectionTitle title="Branding & Background" description="Mengatur logo utama, background home default, dan asset splash." />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Logo URL">
              <input type="url" name="logoUrl" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} className="field-input font-mono" placeholder="https://..." />
            </Field>
            <Field label="Upload Logo">
              <input type="file" name="logoFile" accept="image/*" className="field-input py-2" />
            </Field>
            <Field label="Home Background URL">
              <input type="url" name="homeBackgroundUrl" value={homeBackgroundUrl} onChange={(e) => setHomeBackgroundUrl(e.target.value)} className="field-input font-mono" placeholder="https://..." />
            </Field>
            <Field label="Upload Home Background">
              <input type="file" name="homeBackgroundFile" accept="image/*" className="field-input py-2" />
            </Field>
          </div>
        </section>

        <section className="space-y-4 border-t border-border pt-6">
          <SectionTitle title="Splash Screen" description="Asset dan teks splash yang ditampilkan saat startup aplikasi." />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Toggle name="splashEnabled" checked={splashEnabled} onChange={setSplashEnabled} title="Enable Splash Profile" description="Jika aktif, splash akan mengikuti profile ini." />
            <Toggle name="splashShowSound" checked={splashShowSound} onChange={setSplashShowSound} title="Play Splash Sound" description="Mengontrol bunyi splash saat startup." />
            <Field label="Splash Background URL">
              <input type="url" name="splashBackgroundUrl" value={splashBackgroundUrl} onChange={(e) => setSplashBackgroundUrl(e.target.value)} className="field-input font-mono" placeholder="https://..." />
            </Field>
            <Field label="Upload Splash Background">
              <input type="file" name="splashBackgroundFile" accept="image/*" className="field-input py-2" />
            </Field>
            <Field label="Splash Logo URL">
              <input type="url" name="splashLogoUrl" value={splashLogoUrl} onChange={(e) => setSplashLogoUrl(e.target.value)} className="field-input font-mono" placeholder="https://..." />
            </Field>
            <Field label="Upload Splash Logo">
              <input type="file" name="splashLogoFile" accept="image/*" className="field-input py-2" />
            </Field>
            <Field label="Splash Sound URL">
              <input type="url" name="splashSoundUrl" value={splashSoundUrl} onChange={(e) => setSplashSoundUrl(e.target.value)} className="field-input font-mono" placeholder="https://..." />
            </Field>
            <Field label="Upload Splash Sound">
              <input type="file" name="splashSoundFile" accept="audio/*" className="field-input py-2" />
            </Field>
            <Field label="Splash Title">
              <input type="text" name="splashTitle" value={splashTitle} onChange={(e) => setSplashTitle(e.target.value)} className="field-input" />
            </Field>
            <Field label="Splash Subtitle">
              <input type="text" name="splashSubtitle" value={splashSubtitle} onChange={(e) => setSplashSubtitle(e.target.value)} className="field-input" />
            </Field>
            <Field label="Splash Footer Text">
              <input type="text" name="splashFooterText" value={splashFooterText} onChange={(e) => setSplashFooterText(e.target.value)} className="field-input" />
            </Field>
            <Field label="Splash Loading Text">
              <input type="text" name="splashLoadingText" value={splashLoadingText} onChange={(e) => setSplashLoadingText(e.target.value)} className="field-input" />
            </Field>
          </div>
        </section>

        <section className="space-y-4 border-t border-border pt-6">
          <div className="flex items-center justify-between gap-4">
            <SectionTitle title="Home Menu" description="Atur hide/show, nama, subtitle, warna, border, icon, dan aksi menu." />
            <button
              type="button"
              onClick={() => setMenus((current) => [
                ...current,
                {
                  id: `menu_${Date.now()}`,
                  enabled: true,
                  type: 'static_page',
                  title: 'MENU BARU',
                  subtitle: 'Subtitle',
                  icon: 'info',
                  textColor: '#FFFFFF',
                  borderColor: '#FFFFFF',
                  accentColor: '#FFFFFF',
                  backgroundUrl: '',
                  staticPageId: staticPageOptions[0]?.id || '',
                  sortOrder: (current.at(-1)?.sortOrder || 0) + 10,
                },
              ])}
              className="rounded-xl border border-primary/20 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/10"
            >
              Tambah Menu
            </button>
          </div>
          <div className="space-y-4">
            {menus.map((menu, index) => (
              <div key={menu.id} className="rounded-2xl border border-border bg-accent/20 p-4 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-foreground">{menu.title || `Menu ${index + 1}`}</div>
                    <div className="text-[10px] text-muted-foreground">{menu.id}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMenus((current) => current.filter((item) => item.id !== menu.id))}
                    className="rounded-lg border border-rose-500/20 px-2.5 py-1.5 text-[10px] font-semibold text-rose-400 hover:bg-rose-500/10"
                  >
                    Hapus
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  <Field label="ID">
                    <input type="text" value={menu.id} onChange={(e) => updateMenu(setMenus, menu.id, { id: e.target.value })} className="field-input font-mono" />
                  </Field>
                  <Field label="Type">
                    <select value={menu.type} onChange={(e) => updateMenu(setMenus, menu.id, { type: e.target.value as HomeExperienceMenuItem['type'] })} className="field-input py-2">
                      {MENU_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Icon">
                    <select value={menu.icon} onChange={(e) => updateMenu(setMenus, menu.id, { icon: e.target.value })} className="field-input py-2">
                      {ICON_OPTIONS.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Sort Order">
                    <input type="number" value={menu.sortOrder} onChange={(e) => updateMenu(setMenus, menu.id, { sortOrder: Number.parseInt(e.target.value || '0', 10) || 0 })} className="field-input" />
                  </Field>
                  <Field label="Title">
                    <input type="text" value={menu.title} onChange={(e) => updateMenu(setMenus, menu.id, { title: e.target.value })} className="field-input" />
                  </Field>
                  <Field label="Subtitle">
                    <input type="text" value={menu.subtitle} onChange={(e) => updateMenu(setMenus, menu.id, { subtitle: e.target.value })} className="field-input" />
                  </Field>
                  <Field label="Background URL">
                    <input type="url" value={menu.backgroundUrl} onChange={(e) => updateMenu(setMenus, menu.id, { backgroundUrl: e.target.value })} className="field-input font-mono" placeholder="https://..." />
                  </Field>
                  <Field label="Upload Background">
                    <input type="file" name={`menuBackgroundFile__${menu.id}`} accept="image/*" className="field-input py-2" />
                  </Field>
                  <Field label="Static Page Target">
                    <select value={menu.staticPageId} onChange={(e) => updateMenu(setMenus, menu.id, { staticPageId: e.target.value })} className="field-input py-2">
                      <option value="">Pilih page</option>
                      {staticPageOptions.map((option) => (
                        <option key={option.id} value={option.id}>{option.title}</option>
                      ))}
                    </select>
                  </Field>
                  <ColorField label="Text" value={menu.textColor} onChange={(value) => updateMenu(setMenus, menu.id, { textColor: value })} />
                  <ColorField label="Border" value={menu.borderColor} onChange={(value) => updateMenu(setMenus, menu.id, { borderColor: value })} />
                  <ColorField label="Accent" value={menu.accentColor} onChange={(value) => updateMenu(setMenus, menu.id, { accentColor: value })} />
                  <ToggleInline checked={menu.enabled} onChange={(checked) => updateMenu(setMenus, menu.id, { enabled: checked })} title="Visible" description="Hide / show menu" />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4 border-t border-border pt-6">
          <div className="flex items-center justify-between gap-4">
            <SectionTitle title="Static Pages" description="Dipakai oleh menu type static_page untuk menampilkan halaman informasi." />
            <button
              type="button"
              onClick={() => setStaticPages((current) => [
                ...current,
                {
                  id: `page_${Date.now()}`,
                  title: 'Halaman Baru',
                  content: 'Isi konten halaman statis.',
                },
              ])}
              className="rounded-xl border border-primary/20 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/10"
            >
              Tambah Halaman
            </button>
          </div>
          <div className="space-y-4">
            {staticPages.map((page) => (
              <div key={page.id} className="rounded-2xl border border-border bg-accent/20 p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-semibold text-foreground">{page.title || page.id}</div>
                  <button
                    type="button"
                    onClick={() => setStaticPages((current) => current.filter((item) => item.id !== page.id))}
                    className="rounded-lg border border-rose-500/20 px-2.5 py-1.5 text-[10px] font-semibold text-rose-400 hover:bg-rose-500/10"
                  >
                    Hapus
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Page ID">
                    <input type="text" value={page.id} onChange={(e) => updateStaticPage(setStaticPages, page.id, { id: e.target.value })} className="field-input font-mono" />
                  </Field>
                  <Field label="Judul">
                    <input type="text" value={page.title} onChange={(e) => updateStaticPage(setStaticPages, page.id, { title: e.target.value })} className="field-input" />
                  </Field>
                  <Field label="Konten" wide>
                    <textarea value={page.content} onChange={(e) => updateStaticPage(setStaticPages, page.id, { content: e.target.value })} className="field-input min-h-[140px]" />
                  </Field>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4 border-t border-border pt-6">
          <SectionTitle title="Sound Effect" description="Untuk saat ini profile mengatur enable / disable built-in splash dan selection sound di shell Android." />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Toggle name="enableSelectionSound" checked={enableSelectionSound} onChange={setEnableSelectionSound} title="Selection Sound" description="Bunyi ketika fokus menu home berpindah." />
            <Toggle name="enableSplashSound" checked={enableSplashSound} onChange={setEnableSplashSound} title="Splash Sound" description="Bunyi ketika splash screen tampil." />
            <Field label="Selection Sound URL">
              <input type="url" name="selectionSoundUrl" value={selectionSoundUrl} onChange={(e) => setSelectionSoundUrl(e.target.value)} className="field-input font-mono" placeholder="https://..." />
            </Field>
            <Field label="Upload Selection Sound">
              <input type="file" name="selectionSoundFile" accept="audio/*" className="field-input py-2" />
            </Field>
          </div>
        </section>

        <section className="space-y-4 border-t border-border pt-6">
          <SectionTitle title="Live Preview" description="Preview cepat untuk splash dan menu berdasarkan state editor saat ini." />
          <HomeExperiencePreview
            config={{
              ...config,
              logoUrl,
              homeBackgroundUrl,
              menus,
              staticPages,
              splash: {
                ...config.splash,
                enabled: splashEnabled,
                showSound: splashShowSound,
                backgroundUrl: splashBackgroundUrl,
                logoUrl: splashLogoUrl,
                soundUrl: splashSoundUrl,
                title: splashTitle,
                subtitle: splashSubtitle,
                footerText: splashFooterText,
                loadingText: splashLoadingText,
              },
              sounds: {
                ...config.sounds,
                enableSelectionSound,
                enableSplashSound,
                selectionSoundUrl,
              },
            }}
          />
        </section>

        <div className="flex flex-col sm:flex-row gap-3 border-t border-border pt-6">
          <button type="submit" className="flex-1 btn btn-primary py-2.5">Save Home Experience Profile</button>
        </div>
      </form>

      <form action={onResetAction} className="border-t border-border pt-4">
        <input type="hidden" name="scope" value={scope} />
        <input type="hidden" name="targetId" value={targetId} />
        <button type="submit" className="w-full rounded-xl border border-amber-500/20 bg-amber-500/5 py-2.5 text-xs font-semibold text-amber-400 hover:bg-amber-500/10">
          {scope === 'global' ? 'Reset Global Profile ke Fallback Bawaan' : 'Clear Override Scope Ini'}
        </button>
      </form>
    </div>
  )
}

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-[10px] text-muted-foreground">{description}</p>
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
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

function Toggle({
  name,
  checked,
  onChange,
  title,
  description,
}: {
  name: string
  checked: boolean
  onChange: (checked: boolean) => void
  title: string
  description: string
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-accent/30 p-3 hover:bg-accent/50 transition-colors">
      <input type="checkbox" name={name} checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded accent-primary" />
      <span>
        <span className="block text-xs font-semibold text-foreground">{title}</span>
        <span className="text-[10px] text-muted-foreground">{description}</span>
      </span>
    </label>
  )
}

function ToggleInline({
  checked,
  onChange,
  title,
  description,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  title: string
  description: string
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-accent/30 p-3 hover:bg-accent/50 transition-colors">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded accent-primary" />
      <span>
        <span className="block text-[11px] font-semibold text-foreground">{title}</span>
        <span className="text-[10px] text-muted-foreground">{description}</span>
      </span>
    </label>
  )
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <Field label={`${label} Color`}>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value.toUpperCase())} className="h-11 w-14 rounded-xl border border-border bg-background px-1" />
        <input type="text" value={value} onChange={(e) => onChange(e.target.value.toUpperCase())} className="field-input font-mono" />
      </div>
    </Field>
  )
}

function updateMenu(
  setMenus: Dispatch<SetStateAction<HomeExperienceMenuItem[]>>,
  id: string,
  patch: Partial<HomeExperienceMenuItem>
) {
  setMenus((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)))
}

function updateStaticPage(
  setPages: Dispatch<SetStateAction<HomeExperienceStaticPage[]>>,
  id: string,
  patch: Partial<HomeExperienceStaticPage>
) {
  setPages((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)))
}

export function HomeExperiencePreview({ config }: { config: HomeExperienceConfig }) {
  const visibleMenus = [...config.menus].filter((menu) => menu.enabled).sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <div className="grid grid-cols-1 2xl:grid-cols-[380px_minmax(0,1fr)] gap-6">
      <div className="rounded-3xl border border-border bg-[radial-gradient(circle_at_top,rgba(46,230,198,0.12),transparent_60%),linear-gradient(180deg,rgba(8,14,24,0.98),rgba(5,10,19,0.98))] p-5 space-y-4">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Splash Preview</div>
        <div className="rounded-2xl border border-white/10 bg-black/30 p-5 text-center space-y-4">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-white/15 bg-white/5 text-[10px] text-muted-foreground overflow-hidden">
            {config.splash.logoUrl ? <img src={config.splash.logoUrl} alt="Splash Logo" className="h-full w-full object-contain" /> : 'Logo'}
          </div>
          <div>
            <div className="text-lg font-bold text-white">{config.splash.title}</div>
            <div className="mt-1 text-xs text-white/70">{config.splash.subtitle}</div>
          </div>
          <div className="text-[11px] text-primary">{config.splash.loadingText}</div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/45">{config.splash.footerText}</div>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-[linear-gradient(180deg,rgba(10,16,28,0.98),rgba(6,11,20,0.98))] p-5 space-y-4">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Home Preview</div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {visibleMenus.map((menu) => (
              <div
                key={menu.id}
                className="rounded-2xl border p-4 shadow-[0_12px_30px_rgba(0,0,0,0.2)]"
                style={{
                  borderColor: menu.borderColor,
                  background: menu.backgroundUrl
                    ? `linear-gradient(rgba(5,10,19,0.65), rgba(5,10,19,0.82)), url(${menu.backgroundUrl}) center/cover`
                    : 'linear-gradient(180deg, rgba(20,35,49,1), rgba(12,18,28,1))',
                }}
              >
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: menu.borderColor }}>
                  {menu.icon}
                </div>
                <div className="mt-6 text-base font-bold" style={{ color: menu.textColor }}>{menu.title}</div>
                <div className="mt-1 text-xs text-white/75">{menu.subtitle}</div>
                <div className="mt-5 h-1 rounded-full" style={{ backgroundColor: menu.accentColor }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
