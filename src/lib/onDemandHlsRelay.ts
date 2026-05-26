import { access, mkdir, readFile, rm } from 'fs/promises'
import { spawn, type ChildProcessWithoutNullStreams } from 'child_process'
import { slugifyChannelName } from '@/lib/playableStreams'
import { type OnDemandHlsRelayConfig } from '@/lib/settings'
import { getEffectiveOnDemandHlsRelayConfigForChannel } from '@/lib/playlistRelay'

type RelayProcess = {
  process: ChildProcessWithoutNullStreams
  outputSlug: string
  outputRoot: string
  manifestPath: string
  lastAccessed: number
  cleanupTimer: NodeJS.Timeout
}

type StartRelayOptions = {
  channelId: number
  name: string
  streamUrl: string
}

const relayProcesses = new Map<number, RelayProcess>()

export async function getOnDemandHlsManifest(options: StartRelayOptions): Promise<string> {
  if (!options.streamUrl.trim().toLowerCase().startsWith('udp://')) {
    throw new Error('On-demand HLS relay only supports UDP streams.')
  }

  const relay = await ensureRelay(options)
  relay.lastAccessed = Date.now()

  const manifest = await waitForPlayableManifest(relay.manifestPath)
  return rewriteManifestSegments(manifest)
}

export async function getOnDemandHlsSegment(channelId: number, fileName: string): Promise<Buffer> {
  const relay = relayProcesses.get(channelId)
  if (!relay || relay.process.killed || relay.process.exitCode !== null) {
    throw new Error('On-demand relay is not active for this channel.')
  }

  if (!isSafeSegmentFileName(fileName)) {
    throw new Error('Invalid HLS segment file name.')
  }

  relay.lastAccessed = Date.now()
  return readFile(`${relay.outputRoot.replace(/\/$/, '')}/${relay.outputSlug}/${fileName}`)
}

async function ensureRelay(options: StartRelayOptions): Promise<RelayProcess> {
  const existing = relayProcesses.get(options.channelId)
  if (existing && !existing.process.killed && existing.process.exitCode === null) {
    return existing
  }

  if (existing) {
    clearInterval(existing.cleanupTimer)
    relayProcesses.delete(options.channelId)
  }

  const relaySettings = await getEffectiveOnDemandHlsRelayConfigForChannel(options.channelId)
  if (!relaySettings.enabled) {
    throw new Error('On-demand HLS relay is disabled for this playlist.')
  }

  const config = relaySettings.config
  const outputSlug = getOutputSlug(options.channelId, options.name)
  const outputRoot = config.outputRoot.replace(/\/$/, '')
  const outputDir = `${outputRoot}/${outputSlug}`
  const manifestPath = `${outputDir}/index.m3u8`

  await mkdir(outputDir, { recursive: true })
  await rm(manifestPath, { force: true })

  const inputUrl = appendUdpOptions(options.streamUrl, config)
  const ffmpeg = spawn(config.ffmpegBin, [
    '-hide_banner',
    '-loglevel',
    config.logLevel,
    '-y',
    '-i',
    inputUrl,
    '-c',
    'copy',
    '-f',
    'hls',
    '-hls_time',
    config.hlsTime,
    '-hls_list_size',
    config.hlsListSize,
    '-hls_flags',
    'delete_segments+append_list+omit_endlist',
    manifestPath,
  ])

  ffmpeg.stderr.on('data', (chunk) => {
    if (config.logLevel !== 'quiet') {
      console.warn(`On-demand relay ${options.channelId}: ${chunk.toString().trim()}`)
    }
  })

  ffmpeg.on('error', (error) => {
    console.error(`Unable to start on-demand relay ${options.channelId}:`, error)
    const current = relayProcesses.get(options.channelId)
    if (current?.process === ffmpeg) {
      clearInterval(current.cleanupTimer)
      relayProcesses.delete(options.channelId)
    }
  })

  ffmpeg.on('exit', () => {
    const current = relayProcesses.get(options.channelId)
    if (current?.process === ffmpeg) {
      clearInterval(current.cleanupTimer)
      relayProcesses.delete(options.channelId)
    }
  })

  const relay: RelayProcess = {
    process: ffmpeg,
    outputSlug,
    outputRoot,
    manifestPath,
    lastAccessed: Date.now(),
    cleanupTimer: scheduleCleanup(options.channelId, config.idleTimeoutMs),
  }

  relayProcesses.set(options.channelId, relay)
  return relay
}

function scheduleCleanup(channelId: number, idleTimeoutMs: number): NodeJS.Timeout {
  const timeout = Number.isFinite(idleTimeoutMs) && idleTimeoutMs > 0 ? idleTimeoutMs : 600000

  return setInterval(() => {
    const relay = relayProcesses.get(channelId)
    if (!relay) return

    if (Date.now() - relay.lastAccessed < timeout) return

    relay.process.kill('SIGTERM')
    clearInterval(relay.cleanupTimer)
    relayProcesses.delete(channelId)
  }, Math.min(timeout, 60000))
}

function appendUdpOptions(streamUrl: string, config: OnDemandHlsRelayConfig): string {
  const separator = streamUrl.includes('?') ? '&' : '?'
  return `${streamUrl}${separator}localaddr=${encodeURIComponent(config.localAddr)}&reuse=1&overrun_nonfatal=1&fifo_size=${encodeURIComponent(config.fifoSize)}`
}

function getOutputSlug(channelId: number, name: string): string {
  return `${slugifyChannelName(name)}-${channelId}`
}

async function waitForPlayableManifest(manifestPath: string): Promise<string> {
  const startedAt = Date.now()

  while (Date.now() - startedAt < 12000) {
    if (await fileExists(manifestPath)) {
      const manifest = await readFile(manifestPath, 'utf-8')
      if (manifestHasSegment(manifest)) {
        return manifest
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }

  throw new Error('Timed out waiting for playable HLS segments.')
}

function manifestHasSegment(manifest: string): boolean {
  return manifest
    .split(/\r?\n/)
    .some((line) => {
      const trimmed = line.trim()
      return trimmed.length > 0 && !trimmed.startsWith('#')
    })
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

function rewriteManifestSegments(manifest: string): string {
  return manifest
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#') || /^https?:\/\//i.test(trimmed)) {
        return line
      }

      const prefixLength = line.length - line.trimStart().length
      const prefix = line.slice(0, prefixLength)
      return `${prefix}segments/${encodeURIComponent(trimmed)}`
    })
    .join('\n')
}

function isSafeSegmentFileName(fileName: string): boolean {
  return /^[a-zA-Z0-9._-]+$/.test(fileName) && !fileName.includes('..')
}
