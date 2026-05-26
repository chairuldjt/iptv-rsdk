import prisma from '@/lib/db'
import { redirect } from 'next/navigation'
import ConfirmForm from '@/components/ConfirmForm'
import VideoRepoForm from '@/components/VideoRepoForm'
import VideoLibraryCard from '@/components/VideoLibraryCard'
import VideoRepositoryToastBridge from '@/components/VideoRepositoryToastBridge'
import VideoBroadcastManager from '@/components/VideoBroadcastManager'
import {
  FALLBACK_VIDEO_BROADCAST_CONFIG,
  clearScopedVideoBroadcast,
  getDeviceVideoBroadcast,
  getGlobalVideoBroadcast,
  getGroupVideoBroadcast,
  setDeviceVideoBroadcast,
  setGlobalVideoBroadcast,
  setGroupVideoBroadcast,
  type ResolvedVideoBroadcastConfig,
  type VideoBroadcastConfig,
  type VideoBroadcastScope,
  videoBroadcastFromFormData,
} from '@/lib/videoBroadcast'
import { getDeviceGroupAssignments, getDeviceGroups } from '@/lib/deviceGroups'
import { pushCommand } from '@/lib/remoteQueue'
import {
  createFolderAction,
  deleteFolderAction,
  deleteVideoAction,
  renameFolderAction,
  toggleFolderPublishedAction,
  toggleVideoPublishedAction,
} from './actions'

export const revalidate = 0

type FolderFilter = number | 'unfiled' | null
type SourceFilter = 'all' | 'upload' | 'url'

async function saveVideoBroadcastAction(formData: FormData) {
  'use server'
  const scope = normalizeVideoBroadcastScope((formData.get('scope') as string) || 'global')
  const targetId = ((formData.get('targetId') as string) || '').trim()
  const returnQuery = ((formData.get('returnQuery') as string) || '').trim()
  const config = videoBroadcastFromFormData(formData)

  if (scope === 'group' && targetId) {
    await setGroupVideoBroadcast(targetId, config)
  } else if (scope === 'device' && targetId) {
    await setDeviceVideoBroadcast(targetId, config)
  } else if (scope === 'global') {
    await setGlobalVideoBroadcast(config)
  } else {
    redirect(buildBroadcastRedirect(returnQuery, scope, targetId, 'broadcast-reset'))
  }

  redirect(buildBroadcastRedirect(returnQuery, scope, targetId, 'broadcast-saved'))
}

async function resetVideoBroadcastAction(formData: FormData) {
  'use server'
  const scope = normalizeVideoBroadcastScope((formData.get('scope') as string) || 'global')
  const targetId = ((formData.get('targetId') as string) || '').trim()
  const returnQuery = ((formData.get('returnQuery') as string) || '').trim()

  if (scope === 'global') {
    await setGlobalVideoBroadcast(FALLBACK_VIDEO_BROADCAST_CONFIG)
  } else if (targetId) {
    await clearScopedVideoBroadcast(scope, targetId)
  } else {
    redirect(buildBroadcastRedirect(returnQuery, scope, targetId, 'broadcast-reset'))
  }

  redirect(buildBroadcastRedirect(returnQuery, scope, targetId, 'broadcast-reset'))
}

async function playVideoBroadcastNowAction(formData: FormData) {
  'use server'
  const scope = normalizeVideoBroadcastScope((formData.get('scope') as string) || 'global')
  const targetId = ((formData.get('targetId') as string) || '').trim()
  const returnQuery = ((formData.get('returnQuery') as string) || '').trim()
  const config = videoBroadcastFromFormData(formData)

  const payload = await resolveLiveBroadcastPayload(config)
  if (!payload) {
    redirect(buildBroadcastRedirect(returnQuery, scope, targetId, 'broadcast-reset'))
  }

  const recipientIds = await resolveBroadcastRecipientIds(scope, targetId)
  for (const deviceId of recipientIds) {
    pushCommand(deviceId, 'PLAY_VIDEO_BROADCAST', JSON.stringify(payload))
  }

  redirect(buildBroadcastRedirect(returnQuery, scope, targetId, 'broadcast-live'))
}

export default async function VideosPage({
  searchParams,
}: {
  searchParams: Promise<{
    edit?: string
    compose?: string
    notice?: string
    folder?: string
    q?: string
    source?: string
    manageFolder?: string
    broadcastScope?: string
    broadcastId?: string
    broadcastModal?: string
  }>
}) {
  const resolvedSearchParams = await searchParams
  const editId = resolvedSearchParams.edit ? parseInt(resolvedSearchParams.edit, 10) : null
  const composeMode = resolvedSearchParams.compose || ''
  const selectedFolder = parseFolderFilter(resolvedSearchParams.folder)
  const sourceFilter = parseSourceFilter(resolvedSearchParams.source)
  const searchQuery = (resolvedSearchParams.q || '').trim()
  const broadcastScope = normalizeVideoBroadcastScope(resolvedSearchParams.broadcastScope)
  const broadcastTargetId = (resolvedSearchParams.broadcastId || '').trim()
  const showVideoModal = composeMode === 'video' || Boolean(editId)
  const showBroadcastModal = resolvedSearchParams.broadcastModal === '1'

  const [folders, videos, allVideoCount, unfiledCount, allPublishedCount, unfiledPublishedCount, broadcastVideos, groups, assignments, devices, broadcastConfig] = await Promise.all([
    prisma.educationFolder.findMany({
      orderBy: { name: 'asc' },
      include: {
        videos: { select: { isPublished: true } },
        _count: { select: { videos: true } },
      },
    }),
    prisma.educationVideo.findMany({
      where: selectedFolder === 'unfiled'
        ? { folderId: null }
        : typeof selectedFolder === 'number'
          ? { folderId: selectedFolder }
          : undefined,
      orderBy: [{ folder: { name: 'asc' } }, { updatedAt: 'desc' }],
      include: { folder: true },
    }),
    prisma.educationVideo.count(),
    prisma.educationVideo.count({ where: { folderId: null } }),
    prisma.educationVideo.count({
      where: {
        isPublished: true,
        OR: [
          { folderId: null },
          { folder: { isPublished: true } },
        ],
      },
    }),
    prisma.educationVideo.count({ where: { folderId: null, isPublished: true } }),
    prisma.educationVideo.findMany({
      where: {
        isPublished: true,
        OR: [
          { folderId: null },
          { folder: { isPublished: true } },
        ],
      },
      orderBy: [{ folder: { name: 'asc' } }, { title: 'asc' }],
      select: {
        id: true,
        title: true,
        videoUrl: true,
        isPublished: true,
        folder: { select: { name: true } },
      },
    }),
    getDeviceGroups(),
    getDeviceGroupAssignments(),
    prisma.device.findMany({
      orderBy: [{ deviceName: 'asc' }, { deviceId: 'asc' }],
      select: {
        deviceId: true,
        deviceName: true,
        isActive: true,
      },
    }),
    loadVideoBroadcastConfig(broadcastScope, broadcastTargetId),
  ])

  const selectedFolderEntity = typeof selectedFolder === 'number'
    ? folders.find((folder) => folder.id === selectedFolder) ?? null
    : null

  const visibleVideos = videos.filter((video) => {
    const matchesSearch = !searchQuery || [
      video.title,
      video.videoUrl,
      video.folder?.name || 'Tanpa Folder',
    ].some((value) => value.toLowerCase().includes(searchQuery.toLowerCase()))
    const isUpload = video.videoUrl.startsWith('/uploads/videos/')
    const matchesSource =
      sourceFilter === 'all' ||
      (sourceFilter === 'upload' && isUpload) ||
      (sourceFilter === 'url' && !isUpload)

    return matchesSearch && matchesSource
  })

  const editingVideo = editId
    ? videos.find((video) => video.id === editId) ?? visibleVideos.find((video) => video.id === editId) ?? null
    : null

  const uploadCount = videos.filter((video) => video.videoUrl.startsWith('/uploads/videos/')).length
  const urlCount = videos.length - uploadCount
  const publishedCount = videos.filter((video) => isVideoLinkedToEducation(video)).length
  const currentFolderLabel = selectedFolderEntity?.name || (selectedFolder === 'unfiled' ? 'Tanpa Folder' : 'Semua Video')
  const folderParam = getFolderParam(selectedFolder)
  const hasFilters = Boolean(searchQuery) || sourceFilter !== 'all'
  const hasFolderData = folders.length > 0
  const broadcastGroup = broadcastScope === 'group' ? groups.find((group) => group.id === broadcastTargetId) ?? null : null
  const broadcastDevice = broadcastScope === 'device' ? devices.find((device) => device.deviceId === broadcastTargetId) ?? null : null
  const currentBroadcastScopeLabel =
    broadcastScope === 'global'
      ? 'Global Broadcast'
      : broadcastScope === 'group'
        ? `Group Broadcast: ${broadcastGroup?.name || broadcastTargetId || 'Pilih Group'}`
        : `Device Broadcast: ${broadcastDevice?.deviceName || broadcastTargetId || 'Pilih Device'}`
  const deviceOptions = devices.map((device) => ({
    deviceId: device.deviceId,
    deviceName: device.deviceName,
    isActive: device.isActive,
    groupName: groups.find((group) => group.id === (assignments[device.deviceId] || ''))?.name || null,
  }))
  const videoModalOpenHref = buildVideosHref({
    folder: selectedFolder,
    q: searchQuery,
    source: sourceFilter,
    broadcastScope,
    broadcastId: broadcastTargetId,
    compose: 'video',
  })
  const videoModalCloseHref = buildVideosHref({
    folder: selectedFolder,
    q: searchQuery,
    source: sourceFilter,
    broadcastScope,
    broadcastId: broadcastTargetId,
  })
  const broadcastModalOpenHref = buildVideosHref({
    folder: selectedFolder,
    q: searchQuery,
    source: sourceFilter,
    broadcastScope,
    broadcastId: broadcastTargetId,
    broadcastModal: true,
  })
  const broadcastModalCloseHref = videoModalCloseHref

  return (
    <div className="video-repository-page mx-auto flex w-full max-w-[1660px] flex-col gap-6 animate-fade-in xl:h-full xl:overflow-hidden">
      <VideoRepositoryToastBridge />
      <style dangerouslySetInnerHTML={{ __html: `
        @media (min-width: 1280px) {
          .desktop-scroll-column {
            height: calc(100vh - 22rem) !important;
            overflow-y: auto !important;
          }
          .desktop-scroll-column-hidden {
            height: calc(100vh - 22rem) !important;
          }
        }
      `}} />

      {/* Header section (Locked/Fixed at top in desktop) */}
      <div className="flex flex-col gap-1.5 shrink-0">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">EDUCATION MEDIA LIBRARY</span>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-white">Video Repository</h2>
            <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
              Kelola galeri edukasi sekaligus video broadcast live untuk device, group, atau seluruh armada.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={broadcastModalOpenHref}
              className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/15"
            >
              Video Broadcast
            </a>
            <a
              href={videoModalOpenHref}
              className="btn bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 text-xs rounded-xl shadow-[0_4px_12px_rgba(99,102,241,0.2)] cursor-pointer transition-all"
            >
              Tambah Video
            </a>
          </div>
        </div>
      </div>

      {/* Stats Cards Section (Locked/Fixed at top in desktop) */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4 shrink-0">
        <Stat label="TOTAL" value={videos.length} sublabel="Video" icon="collection" />
        <Stat label="LINKED" value={publishedCount} sublabel="Video" icon="link" />
        <Stat label="UPLOAD" value={uploadCount} sublabel="Video" icon="upload" />
        <Stat label="URL" value={urlCount} sublabel="Eksternal" icon="globe" />
      </section>

      {/* 3-Column Layout (Scrolls independently in desktop) */}
      <div className="flex flex-col xl:flex-row gap-6 xl:flex-1 xl:h-0 xl:overflow-hidden w-full">

        
        {/* Left Column: Folders */}
        <aside className="desktop-scroll-column w-full xl:w-[260px] shrink-0 pr-1 flex flex-col xl:min-h-0 min-h-0">
          <section className="rounded-[24px] border border-white/8 bg-slate-900/40 backdrop-blur-xl p-4 shadow-2xl flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Folders</p>
                <a
                  href="#tambah-folder-input"
                  className="flex h-6 w-6 items-center justify-center rounded-lg border border-white/8 bg-white/[0.02] text-slate-400 hover:border-white/12 hover:bg-white/[0.04] hover:text-white transition-all text-xs cursor-pointer font-bold select-none focus:outline-none"
                  title="Tambah Folder"
                >
                  +
                </a>
              </div>

              {!hasFolderData && (
                <div className="rounded-xl border border-dashed border-white/8 bg-white/[0.01] px-3 py-3.5 text-xs leading-relaxed text-slate-500">
                  Belum ada folder custom. Video baru tetap bisa ditambahkan ke kategori Tanpa Folder.
                </div>
              )}

              <div className="space-y-2 overflow-y-auto max-h-[320px] xl:max-h-[none] pr-0.5">
                <FolderLink
                  href={buildVideosHref({ folder: null, q: searchQuery, source: sourceFilter, broadcastScope, broadcastId: broadcastTargetId })}
                  active={selectedFolder === null}
                  label="Semua Video"
                  count={allVideoCount}
                  publishedCount={allPublishedCount}
                  published
                />
                <FolderLink
                  href={buildVideosHref({ folder: 'unfiled', q: searchQuery, source: sourceFilter, broadcastScope, broadcastId: broadcastTargetId })}
                  active={selectedFolder === 'unfiled'}
                  label="Tanpa Folder"
                  count={unfiledCount}
                  publishedCount={unfiledPublishedCount}
                  published
                />
                {folders.map((folder) => (
                  <FolderLink
                    key={folder.id}
                    href={buildVideosHref({ folder: folder.id, q: searchQuery, source: sourceFilter, broadcastScope, broadcastId: broadcastTargetId })}
                    active={selectedFolder === folder.id}
                    label={folder.name}
                    count={folder._count.videos}
                    publishedCount={folder.videos.filter((video) => video.isPublished).length}
                    published={folder.isPublished}
                  />
                ))}
              </div>
            </div>

            {/* Gear Button: Kelola Folder */}
            <div className="mt-4 pt-3 border-t border-white/6 shrink-0">
              <a
                href={buildVideosHref({ folder: selectedFolder, q: searchQuery, source: sourceFilter, broadcastScope, broadcastId: broadcastTargetId }) + (selectedFolder ? '&manageFolder=true' : '')}
                className={`w-full flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition-all select-none cursor-pointer ${
                  selectedFolder && selectedFolder !== 'unfiled'
                    ? 'border-white/8 bg-white/[0.02] text-slate-300 hover:border-white/12 hover:bg-white/[0.04] hover:text-white'
                    : 'border-white/4 bg-transparent text-slate-600 cursor-not-allowed pointer-events-none'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Kelola Folder
              </a>
            </div>
          </section>
        </aside>

        {/* Middle Column: Videos Workspace */}
        <section className="desktop-scroll-column-hidden relative flex-1 min-w-0 flex flex-col gap-4 xl:min-h-0 min-h-0">
          
          {/* Header Card (Fixed at top of Workspace column) */}
          <div className="relative z-20 overflow-visible rounded-[24px] border border-white/8 bg-slate-900/40 p-4 shadow-2xl backdrop-blur-xl shrink-0">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              
              {/* Workspace Title Info */}
              <div className="min-w-0">
                <h3 className="truncate text-xl font-bold text-white tracking-tight">{currentFolderLabel}</h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  {visibleVideos.length} dari {videos.length} video ditampilkan
                </p>
              </div>

              {/* Search, Filter, Sort Row */}
              <div className="flex flex-wrap items-center gap-2.5">
                
                {/* Search Box */}
                <form action="/dashboard/videos" className="relative w-full sm:w-auto sm:min-w-[200px]">
                  {folderParam && <input type="hidden" name="folder" value={folderParam} />}
                  {sourceFilter !== 'all' && <input type="hidden" name="source" value={sourceFilter} />}
                  <input type="hidden" name="broadcastScope" value={broadcastScope} />
                  {broadcastScope !== 'global' && broadcastTargetId && <input type="hidden" name="broadcastId" value={broadcastTargetId} />}
                  <div className="relative">
                    <input
                      type="search"
                      name="q"
                      defaultValue={searchQuery}
                      placeholder="Cari video, folder, atau URL..."
                      className="w-full rounded-xl border border-white/8 bg-slate-950/45 pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none transition-all focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                    />
                    <div className="absolute inset-y-0 left-3 flex items-center text-slate-500 pointer-events-none">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>
                </form>

                {/* Filter Dropdown */}
                <details className="group relative z-20 select-none">
                  <summary className="btn bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10 hover:text-white px-3.5 py-2 text-xs rounded-xl flex items-center gap-1.5 list-none cursor-pointer focus:outline-none select-none">
                    Filter
                    <svg className="w-3.5 h-3.5 transition-transform group-open:rotate-180 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </summary>
                  <div className="absolute right-0 top-full z-40 mt-2 w-40 rounded-xl border border-white/8 bg-slate-950/95 p-1.5 shadow-2xl space-y-1">
                    <a
                      href={buildVideosHref({ folder: selectedFolder, q: searchQuery, source: 'all', broadcastScope, broadcastId: broadcastTargetId })}
                      className={`block rounded-lg px-2.5 py-2 text-xs font-semibold hover:bg-white/5 transition-colors ${
                        sourceFilter === 'all' ? 'text-indigo-400 bg-white/5' : 'text-slate-300'
                      }`}
                    >
                      Semua Media
                    </a>
                    <a
                      href={buildVideosHref({ folder: selectedFolder, q: searchQuery, source: 'upload', broadcastScope, broadcastId: broadcastTargetId })}
                      className={`block rounded-lg px-2.5 py-2 text-xs font-semibold hover:bg-white/5 transition-colors ${
                        sourceFilter === 'upload' ? 'text-indigo-400 bg-white/5' : 'text-slate-300'
                      }`}
                    >
                      Upload Lokal
                    </a>
                    <a
                      href={buildVideosHref({ folder: selectedFolder, q: searchQuery, source: 'url', broadcastScope, broadcastId: broadcastTargetId })}
                      className={`block rounded-lg px-2.5 py-2 text-xs font-semibold hover:bg-white/5 transition-colors ${
                        sourceFilter === 'url' ? 'text-indigo-400 bg-white/5' : 'text-slate-300'
                      }`}
                    >
                      URL Eksternal
                    </a>
                  </div>
                </details>

                {/* Sort Dropdown */}
                <details className="group relative z-20 select-none">
                  <summary className="btn bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10 hover:text-white px-3.5 py-2 text-xs rounded-xl flex items-center gap-1.5 list-none cursor-pointer focus:outline-none select-none">
                    Terbaru
                    <svg className="w-3.5 h-3.5 transition-transform group-open:rotate-180 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </summary>
                  <div className="absolute right-0 top-full z-40 mt-2 w-32 rounded-xl border border-white/8 bg-slate-950/95 p-1.5 shadow-2xl">
                    <div className="rounded-lg px-2.5 py-2 text-xs font-bold text-indigo-400 bg-white/5 text-center">
                      Terbaru
                    </div>
                  </div>
                </details>

                {/* Reset Filters */}
                {hasFilters && (
                  <a
                    href={buildVideosHref({ folder: selectedFolder, q: '', source: 'all', broadcastScope, broadcastId: broadcastTargetId })}
                    className="btn btn-ghost px-2.5 py-2 text-xs hover:text-white"
                  >
                    Reset
                  </a>
                )}

              </div>
            </div>
          </div>

          {/* Scrollable Videos List (Scrolls independently in desktop) */}
          <div className="relative z-0 xl:flex-1 xl:overflow-y-auto flex flex-col gap-4 min-h-0 pr-1">
            {visibleVideos.length === 0 ? (
              <EmptyVideoState hasFilters={hasFilters} />
            ) : (
              visibleVideos.map((video) => (
                <VideoLibraryCard
                  key={video.id}
                  video={{
                    id: video.id,
                    title: video.title,
                    videoUrl: video.videoUrl,
                    thumbnailUrl: video.thumbnailUrl,
                    isPublished: video.isPublished,
                    updatedAt: video.updatedAt.toISOString(),
                    folder: video.folder ? { name: video.folder.name, isPublished: video.folder.isPublished } : null,
                  }}
                  selectedFolder={selectedFolder}
                  editHref={buildVideosHref({
                    folder: selectedFolder,
                    q: searchQuery,
                    source: sourceFilter,
                    broadcastScope,
                    broadcastId: broadcastTargetId,
                    edit: video.id,
                  })}
                  onTogglePublished={toggleVideoPublishedAction}
                  onDelete={deleteVideoAction}
                />
              ))
            )}
          </div>

          {/* Pagination Footer (Fixed at bottom of Workspace column) */}
          {visibleVideos.length > 0 && (
            <div className="flex items-center justify-between border-t border-white/6 pt-4 text-xs text-slate-400 font-semibold shrink-0">
              <div>
                Menampilkan {visibleVideos.length} dari {visibleVideos.length} video
              </div>
              <div className="flex items-center gap-1.5 select-none">
                <button
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/8 bg-white/[0.02] text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all"
                  disabled
                >
                  &lt;
                </button>
                <button className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold transition-all shadow-[0_4px_12px_rgba(99,102,241,0.25)]">
                  1
                </button>
                <button
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/8 bg-white/[0.02] text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all"
                  disabled
                >
                  &gt;
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Right Column: Forms (Scrolls independently in desktop) */}
        <aside className="desktop-scroll-column w-full xl:w-[360px] shrink-0 pr-1 flex flex-col gap-4 xl:min-h-0 min-h-0">
          <section className="overflow-hidden rounded-[24px] border border-white/8 bg-slate-900/40 backdrop-blur-xl p-5 shadow-2xl shrink-0 space-y-4">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-white">QUICK ACTIONS</h3>
              <p className="mt-1 text-xs text-slate-400">Buka editor video atau panel broadcast tanpa memenuhi workspace utama.</p>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <a
                href={videoModalOpenHref}
                className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 text-xs font-semibold text-white hover:bg-white/[0.04]"
              >
                Tambah / Edit Video
              </a>
              <a
                href={broadcastModalOpenHref}
                className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/15"
              >
                Atur Video Broadcast
              </a>
            </div>
          </section>

          <section className="overflow-hidden rounded-[24px] border border-white/8 bg-slate-900/40 backdrop-blur-xl p-5 shadow-2xl shrink-0 space-y-4">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-white">BROADCAST SUMMARY</h3>
              <p className="mt-1 text-xs text-slate-400">Ringkasan config aktif untuk scope yang sedang dipilih.</p>
            </div>
            <div className="rounded-2xl border border-primary/15 bg-primary/10 px-3.5 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Scope Aktif</div>
              <div className="mt-1 text-sm font-semibold text-white">{currentBroadcastScopeLabel}</div>
              <div className="mt-1 text-[11px] text-slate-300">
                Effective source: <span className="font-semibold text-white">{broadcastConfig.scopeApplied}</span>
              </div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/20 p-3.5 text-xs text-slate-300 space-y-1.5">
              <div><span className="text-slate-500">Status:</span> {broadcastConfig.enabled && broadcastConfig.videoUrl ? 'Aktif' : 'Tidak aktif'}</div>
              <div><span className="text-slate-500">Video:</span> <span className="font-semibold text-white">{broadcastConfig.videoTitle || 'Belum dipilih'}</span></div>
              <div><span className="text-slate-500">Repeat:</span> {broadcastConfig.repeatCount}x</div>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400">
              `Tampilkan Sekarang` akan mendorong command live ke device target. Saat app restart, config ini juga tetap dipakai sebagai fallback startup broadcast.
            </p>
          </section>
          
          {/* Card 1: Tambah Folder Form */}
          <section className="overflow-hidden rounded-[24px] border border-white/8 bg-slate-900/40 backdrop-blur-xl p-5 shadow-2xl shrink-0">
            <div className="mb-4">
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-white">TAMBAH FOLDER</h3>
            </div>
            <form action={createFolderAction} className="space-y-3">
              <input
                id="tambah-folder-input"
                type="text"
                name="folderName"
                required
                placeholder="Contoh: Edukasi Pasien"
                className="w-full rounded-xl border border-white/8 bg-slate-950/45 px-3 py-2.5 text-xs text-white placeholder:text-slate-500 outline-none transition-all focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
              />
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="btn bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-6 text-xs rounded-xl shadow-[0_4px_12px_rgba(99,102,241,0.2)] cursor-pointer transition-all"
                >
                  Buat
                </button>
              </div>
            </form>
          </section>
        </aside>
      </div>

      {/* Kelola Folder Modal */}
      {resolvedSearchParams.manageFolder === 'true' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-[24px] border border-white/8 bg-slate-900 p-6 shadow-2xl space-y-5 animate-slide-up">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Settings</p>
                <h3 className="text-lg font-bold text-white mt-0.5">Kelola Folder</h3>
              </div>
              <a
                href={buildVideosHref({ folder: selectedFolder, q: searchQuery, source: sourceFilter, broadcastScope, broadcastId: broadcastTargetId })}
                className="text-slate-450 hover:text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Tutup
              </a>
            </div>

            {selectedFolderEntity ? (
              <div className="space-y-4">
                <div className="text-xs font-semibold text-slate-400">
                  FOLDER AKTIF: <span className="text-white font-bold">{selectedFolderEntity.name}</span>
                </div>

                {/* Status Sinkronisasi */}
                <form action={toggleFolderPublishedAction} className="rounded-xl border border-white/6 bg-white/[0.02] p-4 space-y-3">
                  <input type="hidden" name="folderId" value={selectedFolderEntity.id} />
                  <input type="hidden" name="currentStatus" value={selectedFolderEntity.isPublished ? 'true' : 'false'} />
                  <div>
                    <p className="text-xs font-bold text-white">Status sinkronisasi</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-455">
                      {selectedFolderEntity.isPublished ? 'Folder ini dikirim ke galeri STB.' : 'Folder ini disembunyikan dari galeri STB.'}
                    </p>
                  </div>
                  <button className={`cursor-pointer rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                    selectedFolderEntity.isPublished
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                      : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
                  }`}>
                    {selectedFolderEntity.isPublished ? 'Aktif' : 'Nonaktif'}
                  </button>
                </form>

                {/* Ubah Nama Folder */}
                <form action={renameFolderAction} className="space-y-3">
                  <input type="hidden" name="folderId" value={selectedFolderEntity.id} />
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      Nama Folder
                    </label>
                    <input
                      type="text"
                      name="folderName"
                      defaultValue={selectedFolderEntity.name}
                      required
                      className="w-full rounded-xl border border-white/8 bg-slate-950/45 px-3 py-2 text-xs text-white outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                  <button className="w-full btn bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 text-xs rounded-xl shadow-[0_4px_12px_rgba(99,102,241,0.2)] cursor-pointer">
                    Simpan Nama Folder
                  </button>
                </form>

                {/* Hapus Folder */}
                <div className="border-t border-white/6 pt-4">
                  <ConfirmForm
                    action={deleteFolderAction}
                    title="Hapus Folder?"
                    description="Folder ini akan dihapus. Video di dalamnya tidak ikut terhapus dan akan dipindah ke Tanpa Folder."
                    confirmLabel="Hapus Folder"
                  >
                    <input type="hidden" name="folderId" value={selectedFolderEntity.id} />
                    <button className="w-full btn bg-rose-500/10 text-rose-450 border border-rose-500/20 hover:bg-rose-500/20 hover:text-rose-350 py-2 text-xs rounded-xl cursor-pointer">
                      Hapus Folder
                    </button>
                  </ConfirmForm>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs leading-relaxed text-amber-200/80">
                Pilih salah satu folder custom terlebih dahulu di menu sebelah kiri sebelum Anda dapat mengelolanya.
              </div>
            )}
          </div>
        </div>
      )}

      {showVideoModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="w-full max-w-2xl rounded-[28px] border border-white/8 bg-slate-950/95 p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300">
                  {editingVideo ? 'EDIT VIDEO' : 'TAMBAH VIDEO'}
                </div>
                <h3 className="mt-1 text-xl font-bold text-white">
                  {editingVideo ? editingVideo.title : 'Video Baru'}
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Form dipisah ke modal supaya workspace repository tetap fokus ke pencarian, folder, dan review video.
                </p>
              </div>
              <a
                href={videoModalCloseHref}
                className="rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/[0.05] hover:text-white"
              >
                Tutup
              </a>
            </div>

            <VideoRepoForm
              key={editingVideo?.id ?? `modal-new-${selectedFolder || 'all'}`}
              folders={folders.map((folder) => ({ id: folder.id, name: folder.name }))}
              selectedFolderId={typeof selectedFolder === 'number' ? selectedFolder : null}
              editingVideo={editingVideo}
            />
          </div>
        </div>
      )}

      {showBroadcastModal && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="w-full max-w-3xl rounded-[28px] border border-white/8 bg-slate-950/95 p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300">VIDEO BROADCAST</div>
                <h3 className="mt-1 text-xl font-bold text-white">Kelola Broadcast & Trigger Live</h3>
                <p className="mt-1 text-xs text-slate-400">
                  Gunakan modal ini untuk menyimpan config fallback sekaligus mengirim trigger live tanpa restart aplikasi.
                </p>
              </div>
              <a
                href={broadcastModalCloseHref}
                className="rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/[0.05] hover:text-white"
              >
                Tutup
              </a>
            </div>

            <VideoBroadcastManager
              scope={broadcastScope}
              targetId={broadcastTargetId}
              currentScopeLabel={currentBroadcastScopeLabel}
              config={broadcastConfig}
              videos={broadcastVideos.map((video) => ({
                id: video.id,
                title: video.title,
                folderName: video.folder?.name || null,
                isPublished: video.isPublished,
              }))}
              groups={groups}
              devices={deviceOptions}
              onSaveAction={saveVideoBroadcastAction}
              onResetAction={resetVideoBroadcastAction}
              onPlayNowAction={playVideoBroadcastNowAction}
            />
          </div>
        </div>
      )}

    </div>
  )
}

function FolderLink({
  href,
  active,
  label,
  count,
  publishedCount,
  published,
}: {
  href: string
  active: boolean
  label: string
  count: number
  publishedCount: number
  published: boolean
}) {
  return (
    <a
      href={href}
      className={`flex items-center justify-between gap-3 rounded-2xl border px-3.5 py-3 text-xs transition-all duration-200 cursor-pointer ${
        active
          ? 'border-indigo-500/30 bg-indigo-950/40 text-white shadow-[0_4px_12px_rgba(0,0,0,0.1)]'
          : published
            ? 'border-white/6 bg-white/[0.02] text-slate-350 hover:border-white/10 hover:bg-white/[0.04] hover:text-white'
            : 'border-white/6 bg-white/[0.01] text-slate-500 hover:border-white/10 hover:bg-white/[0.03] hover:text-slate-300'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className={`shrink-0 ${active ? 'text-indigo-400' : 'text-slate-500'}`}>
          <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13.5H9m4.06-7.19l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
          </svg>
        </span>
        <div className="min-w-0">
          <span className="block truncate font-bold text-white">{label}</span>
          <span className={`mt-0.5 block text-[10px] font-semibold ${active ? 'text-indigo-400' : 'text-slate-500'}`}>
            {published ? `${publishedCount} linked` : 'folder hidden'}
          </span>
        </div>
      </div>
      <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold font-mono ${
        active 
          ? 'border-indigo-500/20 bg-indigo-500/10 text-indigo-400' 
          : 'border-white/6 bg-white/[0.02] text-slate-400'
      }`}>
        {count}
      </span>
    </a>
  )
}

function Stat({
  label,
  value,
  sublabel,
  icon,
}: {
  label: string
  value: number
  sublabel: string
  icon: 'collection' | 'link' | 'upload' | 'globe'
}) {
  let themeClass = ''
  switch (icon) {
    case 'collection':
      themeClass = 'bg-purple-500/10 text-purple-400 border-purple-500/20'
      break
    case 'link':
      themeClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      break
    case 'upload':
      themeClass = 'bg-sky-500/10 text-sky-400 border-sky-500/20'
      break
    case 'globe':
      themeClass = 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      break
  }

  return (
    <div className="flex items-center gap-4 p-4 rounded-[20px] border border-white/8 bg-slate-900/40 backdrop-blur-xl">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${themeClass}`}>
        {renderStatIcon(icon)}
      </div>
      <div>
        <div className="text-2xl font-black text-white leading-none font-mono">{value}</div>
        <div className="mt-1 text-[10px] font-semibold text-slate-400 leading-none">
          <span className="font-bold text-slate-300 mr-1 uppercase">{label}</span>
          <span>{sublabel}</span>
        </div>
      </div>
    </div>
  )
}

function EmptyVideoState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex min-h-[300px] items-center justify-center rounded-[24px] border border-dashed border-white/8 bg-[linear-gradient(180deg,rgba(16,23,39,0.4),rgba(10,14,24,0.6))] px-6 text-center shadow-xl">
      <div className="max-w-md">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13.5H9m4.06-7.19l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
          </svg>
        </div>
        <h4 className="mt-4 text-base font-bold text-white">{hasFilters ? 'Tidak ada hasil yang cocok' : 'Repository video masih kosong'}</h4>
        <p className="mt-2 text-xs leading-relaxed text-slate-400">
          {hasFilters
            ? 'Coba ubah kata kunci pencarian atau ganti filter sumber video untuk melihat hasil lain.'
            : 'Tambahkan video baru dari panel di kanan. Anda bisa memakai URL eksternal atau upload file langsung ke server.'}
        </p>
      </div>
    </div>
  )
}

function renderStatIcon(icon: 'collection' | 'link' | 'upload' | 'globe') {
  switch (icon) {
    case 'collection':
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 13.5H9m4.06-7.19l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
        </svg>
      )
    case 'link':
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 016.364 6.364l-1.757 1.758a4.5 4.5 0 01-6.364-6.364m2.12-2.12a4.5 4.5 0 00-6.364-6.364L5.432 3.72a4.5 4.5 0 106.364 6.364" />
        </svg>
      )
    case 'upload':
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V3.75m0 0l-3.75 3.75M12 3.75l3.75 3.75M3.75 15.75v2.25A2.25 2.25 0 006 20.25h12A2.25 2.25 0 0020.25 18v-2.25" />
        </svg>
      )
    case 'globe':
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 016.364 6.364l-1.757 1.758a4.5 4.5 0 01-6.364-6.364m2.12-2.12a4.5 4.5 0 00-6.364-6.364L5.432 3.72a4.5 4.5 0 106.364 6.364" />
        </svg>
      )
  }
}

function parseFolderFilter(value?: string): FolderFilter {
  if (!value) return null
  if (value === 'unfiled') return 'unfiled'
  const parsed = parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function parseSourceFilter(value?: string): SourceFilter {
  if (value === 'upload' || value === 'url') return value
  return 'all'
}

function getFolderParam(folder: FolderFilter): string {
  if (folder === 'unfiled') return 'unfiled'
  if (typeof folder === 'number') return String(folder)
  return ''
}

function buildVideosHref({
  folder,
  q,
  source,
  broadcastScope,
  broadcastId,
  edit,
  compose,
  broadcastModal,
}: {
  folder: FolderFilter
  q: string
  source: SourceFilter
  broadcastScope: VideoBroadcastScope
  broadcastId: string
  edit?: number
  compose?: string
  broadcastModal?: boolean
}) {
  const params = new URLSearchParams()
  const folderParam = getFolderParam(folder)
  if (folderParam) params.set('folder', folderParam)
  if (q) params.set('q', q)
  if (source !== 'all') params.set('source', source)
  params.set('broadcastScope', broadcastScope)
  if (broadcastScope !== 'global' && broadcastId) params.set('broadcastId', broadcastId)
  if (typeof edit === 'number' && Number.isFinite(edit)) params.set('edit', String(edit))
  if (compose) params.set('compose', compose)
  if (broadcastModal) params.set('broadcastModal', '1')

  const query = params.toString()
  return query ? `/dashboard/videos?${query}` : '/dashboard/videos'
}

function isVideoLinkedToEducation(video: { isPublished: boolean; folder: { isPublished: boolean } | null }) {
  return video.isPublished && (!video.folder || video.folder.isPublished)
}

async function loadVideoBroadcastConfig(
  scope: VideoBroadcastScope,
  targetId: string
): Promise<ResolvedVideoBroadcastConfig> {
  const config =
    scope === 'group' && targetId
      ? await getGroupVideoBroadcast(targetId)
      : scope === 'device' && targetId
        ? await getDeviceVideoBroadcast(targetId)
        : scope === 'global'
          ? await getGlobalVideoBroadcast()
          : null

  const safeConfig: VideoBroadcastConfig = config ?? FALLBACK_VIDEO_BROADCAST_CONFIG
  if (!safeConfig.videoId) {
    return {
      ...safeConfig,
      videoTitle: '',
      videoUrl: '',
      thumbnailUrl: '',
      scopeApplied: scope === 'global' ? 'global' : 'fallback',
    }
  }

  const video = await prisma.educationVideo.findUnique({
    where: { id: safeConfig.videoId },
    include: { folder: true },
  })

  const isPlayable = Boolean(
    video &&
      video.isPublished &&
      (!video.folder || video.folder.isPublished)
  )

  return {
    ...safeConfig,
    enabled: safeConfig.enabled && isPlayable,
    videoTitle: video?.title || '',
    videoUrl: video?.videoUrl || '',
    thumbnailUrl: video?.thumbnailUrl || '',
    scopeApplied: config ? scope : 'fallback',
  }
}

function normalizeVideoBroadcastScope(value?: string): VideoBroadcastScope {
  return value === 'group' || value === 'device' ? value : 'global'
}

function buildBroadcastRedirect(
  returnQuery: string,
  scope: VideoBroadcastScope,
  targetId: string,
  notice: string
) {
  const params = new URLSearchParams(returnQuery)
  params.set('broadcastScope', scope)
  if (scope === 'global') {
    params.delete('broadcastId')
  } else if (targetId) {
    params.set('broadcastId', targetId)
  }
  params.set('notice', notice)
  return `/dashboard/videos?${params.toString()}`
}

async function resolveLiveBroadcastPayload(config: VideoBroadcastConfig) {
  if (!config.enabled || !config.videoId) return null

  const video = await prisma.educationVideo.findUnique({
    where: { id: config.videoId },
    include: { folder: true },
  })

  const isPlayable = Boolean(
    video &&
      video.isPublished &&
      (!video.folder || video.folder.isPublished)
  )

  if (!video || !isPlayable) return null

  return {
    enabled: true,
    videoTitle: video.title,
    videoUrl: video.videoUrl,
    thumbnailUrl: video.thumbnailUrl || '',
    repeatCount: config.repeatCount,
    scopeApplied: 'live',
  }
}

async function resolveBroadcastRecipientIds(scope: VideoBroadcastScope, targetId: string): Promise<string[]> {
  if (scope === 'device') {
    return targetId ? [targetId] : []
  }

  if (scope === 'group') {
    if (!targetId) return []
    const assignments = await getDeviceGroupAssignments()
    const deviceIds = Object.entries(assignments)
      .filter(([, groupId]) => groupId === targetId)
      .map(([deviceId]) => deviceId)

    if (deviceIds.length === 0) return []

    const activeDevices = await prisma.device.findMany({
      where: {
        deviceId: { in: deviceIds },
        isActive: true,
      },
      select: { deviceId: true },
    })
    return activeDevices.map((device) => device.deviceId)
  }

  const devices = await prisma.device.findMany({
    where: { isActive: true },
    select: { deviceId: true },
  })
  return devices.map((device) => device.deviceId)
}
