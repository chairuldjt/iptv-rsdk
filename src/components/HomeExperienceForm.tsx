'use client'

import React, { type Dispatch, type SetStateAction, useMemo, useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type {
  HomeExperienceConfig,
  HomeExperienceMenuItem,
  HomeExperienceScope,
  StartScreenValue,
} from '@/lib/homeExperience'
import { START_SCREEN_VALUES } from '@/lib/homeExperience'

export type EntertainmentItemOption = {
  id: number
  title: string
  subtitle: string | null
  isActive: boolean
}

type HomeExperienceFormProps = {
  scope: HomeExperienceScope
  targetId: string
  config: HomeExperienceConfig
  currentScopeLabel: string
  entertainmentItems: EntertainmentItemOption[]
  onSaveAction: (formData: FormData) => void | Promise<void>
  onResetAction: (formData: FormData) => void | Promise<void>
}

const MENU_TYPE_OPTIONS = [
  { value: 'tv', label: 'TV' },
  { value: 'education', label: 'Education' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'settings', label: 'Settings' },
  { value: 'info_dialog', label: 'Info Dialog' },
  { value: 'konten', label: 'Konten' },
  { value: 'recommendations', label: 'Recommendations' },
  { value: 'favorites', label: 'Favorites' },
  { value: 'search', label: 'Search' },
  { value: 'app_drawer', label: 'App Drawer' },
  { value: 'launch_app', label: 'Launch App' },
] as const

const ICON_OPTIONS = ['live_tv', 'menu_book', 'movie', 'settings', 'info', 'room_service', 'star', 'bookmark', 'search', 'apps']

// Full Material Symbols icon library grouped by category
const MATERIAL_ICONS_LIBRARY: { category: string; icons: string[] }[] = [
  {
    category: 'Media & Entertainment',
    icons: ['live_tv', 'tv', 'movie', 'theaters', 'music_note', 'headphones', 'radio', 'podcast', 'videocam', 'play_circle', 'pause_circle', 'stop_circle', 'replay', 'shuffle', 'queue_music', 'album', 'mic', 'speaker', 'volume_up', 'cast', 'screen_share', 'sports_esports', 'sports', 'casino', 'toys'],
  },
  {
    category: 'Education & Info',
    icons: ['menu_book', 'school', 'book', 'library_books', 'auto_stories', 'article', 'description', 'assignment', 'quiz', 'science', 'biotech', 'calculate', 'history_edu', 'psychology', 'info', 'help', 'help_outline', 'announcement', 'campaign', 'notifications', 'tips_and_updates'],
  },
  {
    category: 'Health & Medical',
    icons: ['local_hospital', 'medical_services', 'health_and_safety', 'medication', 'vaccines', 'monitor_heart', 'ecg_heart', 'bloodtype', 'emergency', 'healing', 'personal_injury', 'elderly', 'accessible', 'wheelchair_pickup', 'stethoscope', 'thermometer', 'nutrition', 'fitness_center', 'spa', 'self_improvement'],
  },
  {
    category: 'Navigation & UI',
    icons: ['home', 'dashboard', 'menu', 'apps', 'grid_view', 'view_list', 'view_module', 'widgets', 'layers', 'map', 'navigation', 'explore', 'near_me', 'place', 'location_on', 'directions', 'arrow_forward', 'arrow_back', 'open_in_new', 'launch', 'link', 'share'],
  },
  {
    category: 'Communication',
    icons: ['chat', 'message', 'email', 'phone', 'call', 'video_call', 'forum', 'comment', 'feedback', 'support_agent', 'contact_support', 'contacts', 'person', 'group', 'groups', 'people', 'supervisor_account', 'manage_accounts', 'badge', 'face'],
  },
  {
    category: 'Food & Hospitality',
    icons: ['room_service', 'restaurant', 'local_cafe', 'local_bar', 'local_dining', 'fastfood', 'lunch_dining', 'dinner_dining', 'breakfast_dining', 'bakery_dining', 'hotel', 'bed', 'bathtub', 'cleaning_services', 'dry_cleaning', 'laundry', 'kitchen', 'microwave', 'coffee_maker', 'blender'],
  },
  {
    category: 'Settings & System',
    icons: ['settings', 'tune', 'build', 'construction', 'handyman', 'engineering', 'admin_panel_settings', 'manage_accounts', 'security', 'lock', 'lock_open', 'key', 'password', 'vpn_key', 'shield', 'verified_user', 'privacy_tip', 'policy', 'gpp_good', 'https'],
  },
  {
    category: 'Files & Data',
    icons: ['folder', 'folder_open', 'cloud', 'cloud_upload', 'cloud_download', 'upload', 'download', 'save', 'backup', 'storage', 'database', 'sd_card', 'usb', 'attach_file', 'insert_drive_file', 'picture_as_pdf', 'image', 'photo', 'photo_library', 'collections'],
  },
  {
    category: 'Stars & Misc',
    icons: ['star', 'star_border', 'favorite', 'favorite_border', 'thumb_up', 'thumb_down', 'emoji_events', 'military_tech', 'workspace_premium', 'verified', 'new_releases', 'bolt', 'whatshot', 'local_fire_department', 'celebration', 'cake', 'gift', 'redeem', 'loyalty', 'sell'],
  },
]

const ALL_MATERIAL_ICONS = MATERIAL_ICONS_LIBRARY.flatMap((g) => g.icons)

// Mirrors src/lib/assetValidation.ts — kept here for accept attributes & UI hints.
const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,image/avif,image/heic,image/heif,image/svg+xml'
const IMAGE_ACCEPT_NO_SVG = 'image/png,image/jpeg,image/webp,image/gif,image/avif,image/heic,image/heif'
const AUDIO_ACCEPT = 'audio/mpeg,audio/mp3,audio/ogg,audio/wav'

const LOGO_HINT = 'PNG/JPEG/WebP/GIF/AVIF/HEIC/SVG • min 128×128 • max 1 MB • dikonversi ke PNG'
const BACKGROUND_HINT = 'PNG/JPEG/WebP/GIF/AVIF/HEIC • min 320×180 • max 4 MB • dikonversi ke WebP'
const AUDIO_HINT = 'MP3/OGG/WAV • max 1 MB'

export default function HomeExperienceForm({
  scope,
  targetId,
  config,
  currentScopeLabel,
  entertainmentItems,
  onSaveAction,
  onResetAction,
}: HomeExperienceFormProps) {
  const [menus, setMenus] = useState<HomeExperienceMenuItem[]>(config.menus)
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
  const [startScreen, setStartScreen] = useState<StartScreenValue>(config.startScreen)
  const [startScreenContentId, setStartScreenContentId] = useState<number | null>(config.startScreenContentId ?? null)
  const [expandedSections, setExpandedSections] = useState<Record<string, Record<string, boolean>>>({})
  const [enabledSections, setEnabledSections] = useState<Record<string, Record<string, boolean>>>({})
  const [iconPickerMenuId, setIconPickerMenuId] = useState<string | null>(null)
  // Top-level section expand/collapse state. Sections are always "enabled" —
  // their values are part of the saved config (splash.enabled is the dedicated
  // toggle for splash). Persisting a UI-only "section disabled" flag caused
  // the previous bug where state reset on remount after save.
  const [topLevelExpanded, setTopLevelExpanded] = useState<Record<string, boolean>>({
    branding: false,
    splash: false,
    homeMenu: false,
    sound: false,
    livePreview: false,
  })

  const entertainmentItemOptions = useMemo(
    () => entertainmentItems.map((item) => ({
      id: item.id,
      label: item.title + (item.subtitle ? ` — ${item.subtitle}` : '') + (item.isActive ? '' : ' (nonaktif)'),
    })),
    [entertainmentItems]
  )

  const isExpanded = (menuId: string, section: string) => {
    if (!expandedSections[menuId]) {
      return section === 'basic' || section === 'appearance'
    }
    return expandedSections[menuId][section] ?? false
  }

  const toggleSection = (menuId: string, section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [menuId]: {
        ...prev[menuId],
        [section]: !isExpanded(menuId, section)
      }
    }))
  }

  const isEnabled = (menuId: string, section: string) => {
    if (!enabledSections[menuId]) {
      return section === 'basic'
    }
    return enabledSections[menuId][section] ?? false
  }

  const toggleEnabled = (menuId: string, section: string) => {
    const newEnabledState = !isEnabled(menuId, section)
    setEnabledSections(prev => ({
      ...prev,
      [menuId]: {
        ...prev[menuId],
        [section]: newEnabledState
      }
    }))
    if (newEnabledState) {
      setExpandedSections(prev => ({
        ...prev,
        [menuId]: {
          ...prev[menuId],
          [section]: true
        }
      }))
    }
  }

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

        <CollapsibleSection
          id="branding"
          title="Branding & Background"
          description="Mengatur logo utama, background home default, dan asset splash."
          expanded={topLevelExpanded.branding}
          onToggleExpanded={(expanded) => setTopLevelExpanded(prev => ({ ...prev, branding: expanded }))}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <input type="hidden" name="logoUrl" value={logoUrl} />
            <AssetUpload
              label="Logo Aplikasi"
              fileFieldName="logoFile"
              currentUrl={logoUrl}
              onClear={() => setLogoUrl('')}
              accept={IMAGE_ACCEPT}
              hint={LOGO_HINT}
              kind="image"
            />
            <input type="hidden" name="homeBackgroundUrl" value={homeBackgroundUrl} />
            <AssetUpload
              label="Home Background"
              fileFieldName="homeBackgroundFile"
              currentUrl={homeBackgroundUrl}
              onClear={() => setHomeBackgroundUrl('')}
              accept={IMAGE_ACCEPT_NO_SVG}
              hint={BACKGROUND_HINT}
              kind="image"
            />
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          id="splash"
          title="Splash Screen"
          description="Asset dan teks splash yang ditampilkan saat startup aplikasi."
          expanded={topLevelExpanded.splash}
          onToggleExpanded={(expanded) => setTopLevelExpanded(prev => ({ ...prev, splash: expanded }))}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Toggle name="splashEnabled" checked={splashEnabled} onChange={setSplashEnabled} title="Enable Splash Profile" description="Jika aktif, splash akan mengikuti profile ini." />
            <Toggle name="splashShowSound" checked={splashShowSound} onChange={setSplashShowSound} title="Play Splash Sound" description="Mengontrol bunyi splash saat startup." />
            <input type="hidden" name="splashBackgroundUrl" value={splashBackgroundUrl} />
            <AssetUpload
              label="Splash Background"
              fileFieldName="splashBackgroundFile"
              currentUrl={splashBackgroundUrl}
              onClear={() => setSplashBackgroundUrl('')}
              accept={IMAGE_ACCEPT_NO_SVG}
              hint={BACKGROUND_HINT}
              kind="image"
            />
            <input type="hidden" name="splashLogoUrl" value={splashLogoUrl} />
            <AssetUpload
              label="Splash Logo"
              fileFieldName="splashLogoFile"
              currentUrl={splashLogoUrl}
              onClear={() => setSplashLogoUrl('')}
              accept={IMAGE_ACCEPT}
              hint={LOGO_HINT}
              kind="image"
            />
            <input type="hidden" name="splashSoundUrl" value={splashSoundUrl} />
            <AssetUpload
              label="Splash Sound"
              fileFieldName="splashSoundFile"
              currentUrl={splashSoundUrl}
              onClear={() => setSplashSoundUrl('')}
              accept={AUDIO_ACCEPT}
              hint={AUDIO_HINT}
              kind="audio"
            />
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
        </CollapsibleSection>

        <CollapsibleSection
          id="homeMenu"
          title="Home Menu"
          description="Atur hide/show, nama, subtitle, warna, border, icon, dan aksi menu."
          expanded={topLevelExpanded.homeMenu}
          onToggleExpanded={(expanded) => setTopLevelExpanded(prev => ({ ...prev, homeMenu: expanded }))}
        >
          <div className="flex items-center justify-end gap-4 mb-4">
            <button
              type="button"
              onClick={() => setMenus((current) => [
                ...current,
                {
                  id: `menu_${Date.now()}`,
                  enabled: true,
                  type: 'info_dialog',
                  title: 'MENU BARU',
                  subtitle: 'Subtitle',
                  icon: 'info',
                  textColor: '#FFFFFF',
                  borderColor: '#FFFFFF',
                  accentColor: '#FFFFFF',
                  backgroundUrl: '',
                  entertainmentItemId: 0,
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
              <div
                key={menu.id}
                className={`rounded-2xl border p-5 space-y-5 transition-colors ${
                  menu.enabled
                    ? 'border-border bg-accent/20'
                    : 'border-rose-500/30 bg-rose-500/5'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                      menu.enabled ? 'bg-primary/10' : 'bg-muted/40'
                    }`}>
                      <span className={`material-symbols-rounded text-xl leading-none ${
                        menu.enabled ? 'text-primary' : 'text-muted-foreground'
                      }`}>
                        {menu.icon || 'info'}
                      </span>
                    </div>
                    <div>
                      <div className={`text-sm font-semibold ${menu.enabled ? 'text-foreground' : 'text-muted-foreground line-through decoration-rose-500/60'}`}>
                        {menu.title || `Menu ${index + 1}`}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {menu.id}
                        {!menu.enabled && (
                          <span className="ml-2 inline-block rounded bg-rose-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-400 not-italic">
                            Disabled
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background/40 px-3 py-2 hover:bg-accent/50 transition-colors">
                      <input
                        type="checkbox"
                        checked={menu.enabled}
                        onChange={(e) => updateMenu(setMenus, menu.id, { enabled: e.target.checked })}
                        className="h-4 w-4 rounded accent-primary"
                      />
                      <span className="text-[11px] font-semibold text-foreground select-none">
                        {menu.enabled ? 'Visible' : 'Hidden'}
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setMenus((current) => current.filter((item) => item.id !== menu.id))}
                      className="rounded-lg border border-rose-500/20 px-3 py-2 text-[11px] font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      Hapus Menu
                    </button>
                  </div>
                </div>

                {/* Section 1: Basic Information - COLLAPSIBLE */}
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => toggleSection(menu.id, 'basic')}
                    className="flex items-center gap-2 w-full text-left cursor-pointer hover:opacity-70 transition-opacity"
                  >
                    <span className={`text-sm transition-transform duration-200 ${isExpanded(menu.id, 'basic') ? 'rotate-90' : ''}`}>▶</span>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Informasi Dasar</div>
                    <div className="flex-1 h-px bg-border"></div>
                  </button>
                  {isExpanded(menu.id, 'basic') && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-200">
                      <Field label="Menu ID">
                        <input type="text" value={menu.id} onChange={(e) => updateMenu(setMenus, menu.id, { id: e.target.value })} className="field-input font-mono text-sm" placeholder="menu_id" />
                      </Field>
                      <Field label="Menu Type">
                        <select value={menu.type} onChange={(e) => updateMenu(setMenus, menu.id, { type: e.target.value as HomeExperienceMenuItem['type'] })} className="field-input py-2">
                          {MENU_TYPE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Title (Judul Menu)">
                        <input type="text" value={menu.title} onChange={(e) => updateMenu(setMenus, menu.id, { title: e.target.value })} className="field-input" placeholder="e.g., TV CHANNEL" />
                      </Field>
                      <Field label="Subtitle (Deskripsi)">
                        <input type="text" value={menu.subtitle} onChange={(e) => updateMenu(setMenus, menu.id, { subtitle: e.target.value })} className="field-input" placeholder="e.g., Live TV" />
                      </Field>
                      <Field label="Icon">
                        <button
                          type="button"
                          onClick={() => setIconPickerMenuId(menu.id)}
                          className="field-input flex items-center gap-2 text-left hover:border-primary/50 transition-colors"
                        >
                          <span className="material-symbols-rounded text-lg text-primary leading-none">{menu.icon || 'info'}</span>
                          <span className="font-mono text-sm flex-1">{menu.icon || 'info'}</span>
                          <span className="text-[10px] text-muted-foreground shrink-0">Pilih →</span>
                        </button>
                      </Field>
                      <Field label="Sort Order (Urutan)">
                        <input type="number" value={menu.sortOrder} onChange={(e) => updateMenu(setMenus, menu.id, { sortOrder: Number.parseInt(e.target.value || '0', 10) || 0 })} className="field-input" placeholder="10, 20, 30..." />
                      </Field>
                    </div>
                  )}
                </div>

                {/* Section 2: Appearance - ENABLE/DISABLE + COLLAPSIBLE */}
                <div className="space-y-3 pt-4 border-t border-border/50">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isEnabled(menu.id, 'appearance')}
                      onChange={() => toggleEnabled(menu.id, 'appearance')}
                      className="h-4 w-4 rounded accent-primary cursor-pointer"
                      id={`enable-appearance-${menu.id}`}
                    />
                    <label htmlFor={`enable-appearance-${menu.id}`} className="text-xs font-semibold text-foreground cursor-pointer select-none">
                      Enable Tampilan & Warna Customization
                    </label>
                  </div>
                  
                  {!isEnabled(menu.id, 'appearance') && (
                    <div className="pl-7 text-xs text-muted-foreground italic">
                      💡 Using default colors (white text, default borders)
                    </div>
                  )}
                  
                  {isEnabled(menu.id, 'appearance') && (
                    <>
                      <button
                        type="button"
                        onClick={() => toggleSection(menu.id, 'appearance')}
                        className="flex items-center gap-2 w-full text-left cursor-pointer hover:opacity-70 transition-opacity pl-7"
                      >
                        <span className={`text-sm transition-transform duration-200 ${isExpanded(menu.id, 'appearance') ? 'rotate-90' : ''}`}>▶</span>
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tampilan & Warna</div>
                        <div className="flex-1 h-px bg-border"></div>
                      </button>
                      {isExpanded(menu.id, 'appearance') && (
                        <div className="space-y-4 animate-in fade-in duration-200 pl-7">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <ColorField label="Text" value={menu.textColor} onChange={(value) => updateMenu(setMenus, menu.id, { textColor: value })} />
                            <ColorField label="Border" value={menu.borderColor} onChange={(value) => updateMenu(setMenus, menu.id, { borderColor: value })} />
                            <ColorField label="Accent" value={menu.accentColor} onChange={(value) => updateMenu(setMenus, menu.id, { accentColor: value })} />
                          </div>
                          <AssetUpload
                            label="Background Image"
                            fileFieldName={`menuBackgroundFile__${menu.id}`}
                            currentUrl={menu.backgroundUrl}
                            onClear={() => updateMenu(setMenus, menu.id, { backgroundUrl: '' })}
                            accept={IMAGE_ACCEPT_NO_SVG}
                            hint={BACKGROUND_HINT}
                            kind="image"
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Section 3: Advanced Settings - ENABLE/DISABLE + COLLAPSIBLE */}
                <div className="space-y-3 pt-4 border-t border-border/50">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isEnabled(menu.id, 'advanced')}
                      onChange={() => toggleEnabled(menu.id, 'advanced')}
                      className="h-4 w-4 rounded accent-primary cursor-pointer"
                      id={`enable-advanced-${menu.id}`}
                    />
                    <label htmlFor={`enable-advanced-${menu.id}`} className="text-xs font-semibold text-foreground cursor-pointer select-none">
                      Enable Pengaturan Lanjutan Customization
                    </label>
                  </div>
                  
                  {!isEnabled(menu.id, 'advanced') && (
                    <div className="pl-7 text-xs text-muted-foreground italic">
                      💡 Using default settings (visible, not pinned, no static page)
                    </div>
                  )}
                  
                  {isEnabled(menu.id, 'advanced') && (
                    <>
                      <button
                        type="button"
                        onClick={() => toggleSection(menu.id, 'advanced')}
                        className="flex items-center gap-2 w-full text-left cursor-pointer hover:opacity-70 transition-opacity pl-7"
                      >
                        <span className={`text-sm transition-transform duration-200 ${isExpanded(menu.id, 'advanced') ? 'rotate-90' : ''}`}>▶</span>
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Pengaturan Lanjutan</div>
                        <div className="flex-1 h-px bg-border"></div>
                      </button>
                      {isExpanded(menu.id, 'advanced') && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-200 pl-7">
                          {menu.type === 'konten' && (
                            <Field label="Pilih Konten (untuk type = konten)">
                              <select
                                value={menu.entertainmentItemId || 0}
                                onChange={(e) => updateMenu(setMenus, menu.id, { entertainmentItemId: Number.parseInt(e.target.value, 10) || 0 })}
                                className="field-input py-2"
                              >
                                <option value={0}>-- Pilih konten --</option>
                                {entertainmentItemOptions.map((option) => (
                                  <option key={option.id} value={option.id}>{option.label}</option>
                                ))}
                              </select>
                              {entertainmentItemOptions.length === 0 && (
                                <p className="mt-1 text-[10px] text-amber-400">
                                  Belum ada konten. Tambahkan dulu di menu <a href="/dashboard/entertainment" className="underline">Konten</a>.
                                </p>
                              )}
                            </Field>
                          )}
                          {menu.type === 'launch_app' && (
                            <Field label="Package Name Aplikasi" wide>
                              <input
                                type="text"
                                value={menu.targetPackage || ''}
                                onChange={(e) => updateMenu(setMenus, menu.id, { targetPackage: e.target.value.trim() })}
                                className="field-input font-mono"
                                placeholder="com.contoh.aplikasi"
                              />
                              <p className="mt-1 text-[10px] text-muted-foreground">
                                Nama paket aplikasi Android yang akan dibuka. Jika tidak terinstall, akan diarahkan ke Play Store.
                                Contoh: <span className="font-mono text-primary">com.google.android.youtube</span>
                              </p>
                            </Field>
                          )}
                          {menu.type === 'launch_app' && (
                            <div className="md:col-span-2">
                              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-accent/30 p-3 hover:bg-accent/50 transition-colors">
                                <input
                                  type="checkbox"
                                  checked={menu.useAppIcon ?? false}
                                  onChange={(e) => updateMenu(setMenus, menu.id, { useAppIcon: e.target.checked })}
                                  className="h-4 w-4 rounded accent-primary"
                                />
                                <span>
                                  <span className="block text-xs font-semibold text-foreground">Gunakan Icon Bawaan Aplikasi</span>
                                  <span className="text-[10px] text-muted-foreground">
                                    Jika aktif, icon diambil dari aplikasi yang terinstall di device. Jika belum terinstall, fallback ke icon yang dipilih di atas.
                                  </span>
                                </span>
                              </label>
                            </div>
                          )}
                          <div className="space-y-3">
                            <ToggleInline checked={menu.isPinned || false} onChange={(checked) => updateMenu(setMenus, menu.id, { isPinned: checked })} title="Pinned ⭐" description="Pin menu ke posisi teratas" />
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Section 4: Badge Configuration - ENABLE/DISABLE + COLLAPSIBLE */}
                <div className="space-y-3 pt-4 border-t border-border/50">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isEnabled(menu.id, 'badge')}
                      onChange={() => toggleEnabled(menu.id, 'badge')}
                      className="h-4 w-4 rounded accent-primary cursor-pointer"
                      id={`enable-badge-${menu.id}`}
                    />
                    <label htmlFor={`enable-badge-${menu.id}`} className="text-xs font-semibold text-foreground cursor-pointer select-none">
                      Enable Badge Customization
                    </label>
                    <div className="text-[10px] text-muted-foreground">(Label seperti "LIVE", "NEW", "HOT")</div>
                  </div>
                  
                  {!isEnabled(menu.id, 'badge') && (
                    <div className="pl-7 text-xs text-muted-foreground italic">
                      💡 No badge (default)
                    </div>
                  )}
                  
                  {isEnabled(menu.id, 'badge') && (
                    <>
                      <button
                        type="button"
                        onClick={() => toggleSection(menu.id, 'badge')}
                        className="flex items-center gap-2 w-full text-left cursor-pointer hover:opacity-70 transition-opacity pl-7"
                      >
                        <span className={`text-sm transition-transform duration-200 ${isExpanded(menu.id, 'badge') ? 'rotate-90' : ''}`}>▶</span>
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Badge (Opsional)</div>
                        <div className="flex-1 h-px bg-border"></div>
                      </button>
                      {isExpanded(menu.id, 'badge') && (
                        <div className="space-y-4 animate-in fade-in duration-200 pl-7">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Field label="Badge Text">
                              <input type="text" value={menu.badge?.text || ''} onChange={(e) => updateMenu(setMenus, menu.id, { badge: e.target.value ? { text: e.target.value, color: menu.badge?.color || '#FFD700', position: menu.badge?.position || 'top-right' } : undefined })} className="field-input" placeholder="e.g., NEW, LIVE, HOT" />
                            </Field>
                            <ColorField label="Badge" value={menu.badge?.color || '#FFD700'} onChange={(value) => updateMenu(setMenus, menu.id, { badge: menu.badge?.text ? { text: menu.badge.text, color: value, position: menu.badge?.position || 'top-right' } : undefined })} />
                            <Field label="Badge Position">
                              <select value={menu.badge?.position || 'top-right'} onChange={(e) => updateMenu(setMenus, menu.id, { badge: menu.badge?.text ? { text: menu.badge.text, color: menu.badge?.color || '#FFD700', position: e.target.value as 'top-right' | 'top-left' | 'bottom-right' } : undefined })} className="field-input py-2">
                                <option value="top-right">Top Right</option>
                                <option value="top-left">Top Left</option>
                                <option value="bottom-right">Bottom Right</option>
                              </select>
                            </Field>
                          </div>
                          {menu.badge?.text && (
                            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs text-muted-foreground">
                              <span className="font-semibold text-foreground">Preview:</span> Badge "{menu.badge.text}" akan muncul di posisi {menu.badge.position} dengan warna {menu.badge.color}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          id="sound"
          title="Sound Effect"
          description="Untuk saat ini profile mengatur enable / disable built-in splash dan selection sound di shell Android."
          expanded={topLevelExpanded.sound}
          onToggleExpanded={(expanded) => setTopLevelExpanded(prev => ({ ...prev, sound: expanded }))}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Toggle name="enableSelectionSound" checked={enableSelectionSound} onChange={setEnableSelectionSound} title="Selection Sound" description="Bunyi ketika fokus menu home berpindah." />
            <Toggle name="enableSplashSound" checked={enableSplashSound} onChange={setEnableSplashSound} title="Splash Sound" description="Bunyi ketika splash screen tampil." />
            <input type="hidden" name="selectionSoundUrl" value={selectionSoundUrl} />
            <AssetUpload
              label="Selection Sound"
              fileFieldName="selectionSoundFile"
              currentUrl={selectionSoundUrl}
              onClear={() => setSelectionSoundUrl('')}
              accept={AUDIO_ACCEPT}
              hint={AUDIO_HINT}
              kind="audio"
            />
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          id="livePreview"
          title="Live Preview"
          description="Preview cepat untuk splash dan menu berdasarkan state editor saat ini."
          expanded={topLevelExpanded.livePreview}
          onToggleExpanded={(expanded) => setTopLevelExpanded(prev => ({ ...prev, livePreview: expanded }))}
        >
          <HomeExperiencePreview
            config={{
              ...config,
              logoUrl,
              homeBackgroundUrl,
              menus,
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
        </CollapsibleSection>

        <div className="border-t border-border pt-5 space-y-3">
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Start Screen</label>
            <p className="text-[10px] text-muted-foreground mb-2">Layar pertama yang dibuka STB setelah splash selesai.</p>
            <input type="hidden" name="startScreen" value={startScreen} />
            <select
              value={startScreen}
              onChange={(e) => {
                setStartScreen(e.target.value as StartScreenValue)
                if (e.target.value !== 'entertainment') setStartScreenContentId(null)
              }}
              className="field-input py-2 w-full"
            >
              <option value="live_tv">Live TV (langsung ke player)</option>
              <option value="category_list">Category List</option>
              <option value="home_screen">Home Screen (menu utama)</option>
              <option value="entertainment">Konten / Hiburan</option>
              <option value="education">Video Edukasi</option>
            </select>
          </div>
          {startScreen === 'entertainment' && (
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Konten yang Dibuka</label>
              <p className="text-[10px] text-muted-foreground mb-2">Pilih konten spesifik yang langsung dibuka. Kosongkan untuk membuka daftar konten.</p>
              <input type="hidden" name="startScreenContentId" value={startScreenContentId ?? ''} />
              <select
                value={startScreenContentId ?? ''}
                onChange={(e) => setStartScreenContentId(e.target.value ? Number(e.target.value) : null)}
                className="field-input py-2 w-full"
              >
                <option value="">— Buka daftar konten (tidak spesifik) —</option>
                {entertainmentItemOptions.map((item) => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>

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

      {/* Icon Picker Modal */}
      {iconPickerMenuId && (
        <IconPickerModal
          value={menus.find((m) => m.id === iconPickerMenuId)?.icon || ''}
          onChange={(icon) => updateMenu(setMenus, iconPickerMenuId, { icon })}
          onClose={() => setIconPickerMenuId(null)}
        />
      )}
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

function AssetUpload({
  label,
  fileFieldName,
  currentUrl,
  onClear,
  accept,
  hint,
  kind,
}: {
  label: string
  fileFieldName: string
  currentUrl: string
  onClear: () => void
  accept: string
  hint: string
  kind: 'image' | 'audio'
}) {
  const [pendingName, setPendingName] = useState<string | null>(null)
  const hasCurrent = currentUrl.trim().length > 0

  return (
    <div className="rounded-xl border border-border bg-accent/20 p-3 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
        {hasCurrent && (
          <button
            type="button"
            onClick={() => {
              onClear()
              setPendingName(null)
            }}
            className="rounded-md border border-rose-500/20 px-2 py-1 text-[10px] font-semibold text-rose-400 hover:bg-rose-500/10"
          >
            Hapus
          </button>
        )}
      </div>

      {hasCurrent && (
        <div className="rounded-lg border border-border bg-background/40 p-2">
          {kind === 'image' ? (
            <div className="flex items-center gap-3">
              <img src={currentUrl} alt={label} className="h-12 w-12 rounded-md object-cover border border-border" />
              <div className="text-[10px] font-mono text-muted-foreground break-all">{currentUrl}</div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-lg">🔊</span>
              <audio controls src={currentUrl} className="h-8 flex-1 min-w-0" />
            </div>
          )}
        </div>
      )}

      <input
        type="file"
        name={fileFieldName}
        accept={accept}
        onChange={(e) => setPendingName(e.target.files?.[0]?.name ?? null)}
        className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary hover:file:bg-primary/20 cursor-pointer"
      />

      {pendingName && (
        <div className="text-[10px] text-emerald-400">
          Akan diupload: <span className="font-mono">{pendingName}</span>
        </div>
      )}

      <div className="text-[10px] text-muted-foreground/80">{hint}</div>
    </div>
  )
}

function IconPickerModal({
  value,
  onChange,
  onClose,
}: {
  value: string
  onChange: (icon: string) => void
  onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const [mounted, setMounted] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (mounted) {
      setTimeout(() => searchRef.current?.focus(), 50)
    }
  }, [mounted])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return MATERIAL_ICONS_LIBRARY
    return MATERIAL_ICONS_LIBRARY
      .map((group) => ({
        ...group,
        icons: group.icons.filter((icon) => icon.includes(q)),
      }))
      .filter((group) => group.icons.length > 0)
  }, [search])

  if (!mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col w-full max-w-2xl max-h-[80vh] mx-4 rounded-2xl border border-white/10 bg-[#0d1520] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/8 shrink-0">
          <div>
            <div className="text-sm font-semibold text-foreground">Pilih Icon</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Material Symbols — klik untuk memilih</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent/50 transition-colors"
          >
            Tutup ✕
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-white/8 shrink-0">
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari icon... (contoh: home, star, medical)"
            className="field-input w-full"
          />
        </div>

        {/* Selected preview */}
        {value && (
          <div className="flex items-center gap-3 px-5 py-2.5 border-b border-white/8 bg-primary/5 shrink-0">
            <span className="material-symbols-rounded text-2xl text-primary leading-none">{value}</span>
            <span className="text-xs text-muted-foreground">Terpilih: <span className="font-mono text-foreground">{value}</span></span>
          </div>
        )}

        {/* Icon grid */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {filtered.length === 0 ? (
            <div className="text-center text-xs text-muted-foreground py-8">
              Tidak ada icon ditemukan untuk &quot;{search}&quot;
            </div>
          ) : (
            filtered.map((group) => (
              <div key={group.category}>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  {group.category}
                </div>
                <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-1.5">
                  {group.icons.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      title={icon}
                      onClick={() => { onChange(icon); onClose() }}
                      className={`flex flex-col items-center gap-1 rounded-xl p-2 transition-all hover:bg-primary/10 group ${
                        value === icon ? 'bg-primary/15 ring-1 ring-primary/40' : 'bg-white/[0.03]'
                      }`}
                    >
                      <span className={`material-symbols-rounded text-xl leading-none ${
                        value === icon ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                      }`}>
                        {icon}
                      </span>
                      <span className="text-[8px] text-muted-foreground truncate w-full text-center leading-tight hidden sm:block">
                        {icon.replace(/_/g, ' ')}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

function updateMenu(
  setMenus: Dispatch<SetStateAction<HomeExperienceMenuItem[]>>,
  id: string,
  patch: Partial<HomeExperienceMenuItem>
) {
  setMenus((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)))
}

function CollapsibleSection({
  title,
  description,
  expanded,
  onToggleExpanded,
  children,
}: {
  id?: string
  title: string
  description: string
  expanded: boolean
  onToggleExpanded: (expanded: boolean) => void
  children: React.ReactNode
}) {
  // Children are always rendered into the DOM — even when the section is
  // collapsed — so that controlled form inputs inside (Toggle, AssetUpload's
  // hidden URL inputs, etc.) keep submitting their state. We only hide them
  // visually. Tearing them out of the DOM caused server-side fields to
  // silently default back to `false` / empty on save.
  return (
    <div className="rounded-2xl border border-border bg-accent/10 p-5 space-y-4">
      <button
        type="button"
        onClick={() => onToggleExpanded(!expanded)}
        className="flex w-full items-start justify-between gap-4 text-left"
      >
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="mt-1 text-[10px] text-muted-foreground">{description}</p>
        </div>
        <span className="rounded-lg border border-border px-3 py-1.5 text-[11px] font-semibold text-muted-foreground hover:bg-accent/50 transition-colors">
          {expanded ? '▼ Collapse' : '▶ Expand'}
        </span>
      </button>

      {/* Content: always present in the DOM, hidden visually when collapsed */}
      <div
        className={`space-y-4 ${expanded ? 'animate-in fade-in duration-200' : 'hidden'}`}
        aria-hidden={!expanded}
      >
        {children}
      </div>
    </div>
  )
}

export function HomeExperiencePreview({ config }: { config: HomeExperienceConfig }) {
  const visibleMenus = [...config.menus].filter((menu) => menu.enabled).sort((a, b) => {
    if (a.isPinned !== b.isPinned) return (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0)
    return a.sortOrder - b.sortOrder
  })

  const homeBackground = config.homeBackgroundUrl?.trim()
    ? config.homeBackgroundUrl
    : '/global_home_bg.webp'

  const splashBackground = config.splash.backgroundUrl?.trim()
    ? config.splash.backgroundUrl
    : '/global_home_bg.webp'

  const splashLogo = config.splash.logoUrl?.trim() || '/ic_global_iptv.png'
  const homeLogo = config.logoUrl?.trim() || '/ic_global_iptv.png'

  return (
    <div className="grid grid-cols-1 2xl:grid-cols-[380px_minmax(0,1fr)] gap-6">
      <div className="space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Splash Preview</div>
        <div
          className="relative overflow-hidden rounded-3xl border border-border aspect-[9/16] sm:aspect-[3/4] 2xl:aspect-[9/16]"
          style={{ background: `url(${splashBackground}) center/cover` }}
        >
          {/* Overlay gradient: top dark → mid teal-tinted → bottom dark, mirrors SplashScreen.kt:117-126 */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(0,0,0,0.42) 0%, rgba(9,42,42,0.24) 50%, rgba(0,0,0,0.84) 100%)',
            }}
          />

          {/* Centered logo + title + subtitle + spinner */}
          <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
            <div
              className="flex h-28 w-28 items-center justify-center rounded-full border-2 p-3 shadow-2xl"
              style={{
                backgroundColor: '#071217',
                borderColor: 'rgba(255,255,255,0.24)',
                boxShadow:
                  '0 28px 60px -10px rgba(46,230,198,0.34), 0 28px 60px -10px rgba(255,209,102,0.30)',
              }}
            >
              <img src={splashLogo} alt="Splash Logo" className="h-full w-full object-contain" />
            </div>

            <div className="mt-6 text-2xl font-extrabold tracking-wide text-white">
              {config.splash.title}
            </div>
            <div className="mt-2 text-[13px] font-semibold tracking-wider" style={{ color: '#E9F7F6' }}>
              {config.splash.subtitle}
            </div>

            <div className="mt-10 flex items-center justify-center">
              <div
                className="h-9 w-9 rounded-full border-[3px] border-white/15 animate-spin"
                style={{ borderTopColor: '#2EE6C6' }}
              />
            </div>
            <div className="mt-3 text-[12px] text-white/60">{config.splash.loadingText}</div>
          </div>

          {/* Footer */}
          <div className="absolute bottom-6 left-0 right-0 text-center">
            <div className="text-[12px] font-bold tracking-[0.2em] text-white/70">
              {config.splash.footerText}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Home Preview</div>
        <div
          className="rounded-3xl border border-border p-5 space-y-4"
          style={{
            background: `linear-gradient(180deg, rgba(6,11,20,0.85), rgba(6,11,20,0.95)), url(${homeBackground}) center/cover`,
          }}
        >
          <div className="flex items-center justify-between">
            <img src={homeLogo} alt="Logo" className="h-10 object-contain" />
            <div className="text-[10px] font-semibold uppercase tracking-wider text-white/60">Home Carousel</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {visibleMenus.map((menu) => {
                const background = menu.backgroundUrl?.trim()
                  ? menu.backgroundUrl
                  : defaultMenuBackgroundForType(menu.type)
                return (
                  <div
                    key={menu.id}
                    className="rounded-2xl border p-4 shadow-[0_12px_30px_rgba(0,0,0,0.2)] relative overflow-hidden"
                    style={{
                      borderColor: menu.borderColor,
                      background: `linear-gradient(rgba(5,10,19,0.55), rgba(5,10,19,0.85)), url(${background}) center/cover`,
                    }}
                  >
                    {menu.badge && (
                      <div
                        className={`absolute px-2 py-1 rounded text-white text-[10px] font-bold ${
                          menu.badge.position === 'top-right' ? 'top-2 right-2' :
                          menu.badge.position === 'top-left' ? 'top-2 left-2' :
                          'bottom-2 right-2'
                        }`}
                        style={{ backgroundColor: menu.badge.color }}
                      >
                        {menu.badge.text}
                      </div>
                    )}
                    {menu.isPinned && (
                      <div className="absolute top-2 left-2 text-yellow-400 text-sm">⭐</div>
                    )}
                    <div className="flex items-center gap-2">
                      <span
                        className="material-symbols-rounded text-2xl leading-none"
                        style={{ color: menu.borderColor }}
                      >
                        {menu.icon || 'info'}
                      </span>
                    </div>
                    <div className="mt-4 text-base font-bold" style={{ color: menu.textColor }}>{menu.title}</div>
                    <div className="mt-1 text-xs text-white/75">{menu.subtitle}</div>
                    <div className="mt-5 h-1 rounded-full" style={{ backgroundColor: menu.accentColor }} />
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Mirrors `defaultBackgroundForMenuType` in HomeScreen.kt — provides a
 * sensible fallback image per menu type using assets that ship in `public/`.
 */
function defaultMenuBackgroundForType(type: HomeExperienceMenuItem['type']): string {
  switch (type) {
    case 'tv':
      return '/home_bg_tv.webp'
    case 'education':
      return '/home_bg_education.webp'
    case 'entertainment':
    case 'konten':
      return '/home_bg_youtube.webp'
    case 'settings':
      return '/home_bg_settings.webp'
    case 'info_dialog':
      return '/home_bg_info.webp'
    case 'app_drawer':
      return '/home_bg_settings.webp'
    case 'launch_app':
      return '/home_bg_services.webp'
    default:
      return '/home_bg_services.webp'
  }
}
