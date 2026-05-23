import { access, mkdir, readFile, rm } from 'fs/promises'
import { spawn, type ChildProcessWithoutNullStreams } from 'child_process'
import { slugifyChannelName } from '@/lib/playableStreams'

type RelayProcess = {
  process: ChildProcessWithoutNullStreams
  manifestPath: string
  lastAccessed: number
  cleanupTimer: NodeJS.Timeout
}

type StartRelayOptions = {
  channelId: number
  name: string
  streamUrl: string
  segmentBaseUrl: string
}

const relayProcesses = new Map<number, RelayProcess>()

const FFMPEG_BIN = process.env.IPTV_ON_DEMAND_FFMPEG_BIN || process.env.FFMPEG_BIN || '/usr/bin/ffmpeg'
const LOCALADDR = process.env.IPTV_ON_DEMAND_LOCALADDR || process.env.LOCALADDR || '10.0.0.199'
const OUTPUT_ROOT = process.env.IPTV_ON_DEMAND_OUTPUT_ROOT || process.env.OUTPUT_ROOT || '/var/www/html/landingpage/relay'
const HLS_TIME = process.env.IPTV_ON_DEMAND_HLS_TIME || '2'
const HLS_LIST_SIZE = process.env.IPTV_ON_DEMAND_HLS_LIST_SIZE || '6'
const FIFO_SIZE = process.env.IPTV_ON_DEMAND_FIFO_SIZE || process.env.FIFO_SIZE || '50000'
const LOGLEVEL = process.env.IPTV_ON_DEMAND_LOGLEVEL || process.env.LOGLEVEL || 'warning'
const IDLE_TIMEOUT_MS = Number.parseInt(process.env.IPTV_ON_DEMAND_IDLE_TIMEOUT_MS || '600000', 10)

export async function getOnDemandHlsManifest(options: StartRelayOptions): Promise<string> {
  if (!options.streamUrl.trim().toLowerCase().startsWith('udp://')) {
    throw new Error('On-demand HLS relay only supports UDP streams.')
  }

  const relay = await ensureRelay(options)
  relay.lastAccessed = Date.now()

  await waitForManifest(relay.manifestPath)
  const manifest = await readFile(relay.manifestPath, 'utf-8')
  return rewriteManifestSegments(manifest, options.segmentBaseUrl, getOutputSlug(options.channelId, options.name))
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

  const outputSlug = getOutputSlug(options.channelId, options.name)
  const outputDir = `${OUTPUT_ROOT.replace(/\/$/, '')}/${outputSlug}`
  const manifestPath = `${outputDir}/index.m3u8`

  await mkdir(outputDir, { recursive: true })
  await rm(manifestPath, { force: true })

  const inputUrl = appendUdpOptions(options.streamUrl)
  const ffmpeg = spawn(FFMPEG_BIN, [
    '-hide_banner',
    '-loglevel',
    LOGLEVEL,
    '-y',
    '-i',
    inputUrl,
    '-c',
    'copy',
    '-f',
    'hls',
    '-hls_time',
    HLS_TIME,
    '-hls_list_size',
    HLS_LIST_SIZE,
    '-hls_flags',
    'delete_segments+append_list+omit_endlist',
    manifestPath,
  ])

  ffmpeg.stderr.on('data', (chunk) => {
    if (LOGLEVEL !== 'quiet') {
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
    manifestPath,
    lastAccessed: Date.now(),
    cleanupTimer: scheduleCleanup(options.channelId),
  }

  relayProcesses.set(options.channelId, relay)
  return relay
}

function scheduleCleanup(channelId: number): NodeJS.Timeout {
  const timeout = Number.isFinite(IDLE_TIMEOUT_MS) && IDLE_TIMEOUT_MS > 0 ? IDLE_TIMEOUT_MS : 600000

  return setInterval(() => {
    const relay = relayProcesses.get(channelId)
    if (!relay) return

    if (Date.now() - relay.lastAccessed < timeout) return

    relay.process.kill('SIGTERM')
    clearInterval(relay.cleanupTimer)
    relayProcesses.delete(channelId)
  }, Math.min(timeout, 60000))
}

function appendUdpOptions(streamUrl: string): string {
  const separator = streamUrl.includes('?') ? '&' : '?'
  return `${streamUrl}${separator}localaddr=${encodeURIComponent(LOCALADDR)}&reuse=1&overrun_nonfatal=1&fifo_size=${encodeURIComponent(FIFO_SIZE)}`
}

function getOutputSlug(channelId: number, name: string): string {
  return `${slugifyChannelName(name)}-${channelId}`
}

async function waitForManifest(manifestPath: string): Promise<void> {
  const startedAt = Date.now()

  while (Date.now() - startedAt < 8000) {
    if (await fileExists(manifestPath)) return
    await new Promise((resolve) => setTimeout(resolve, 250))
  }

  throw new Error('Timed out waiting for HLS manifest.')
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

function rewriteManifestSegments(manifest: string, segmentBaseUrl: string, outputSlug: string): string {
  const baseUrl = segmentBaseUrl.replace(/\/$/, '')

  return manifest
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#') || /^https?:\/\//i.test(trimmed)) {
        return line
      }

      const prefixLength = line.length - line.trimStart().length
      const prefix = line.slice(0, prefixLength)
      return `${prefix}${baseUrl}/${outputSlug}/${encodeURIComponent(trimmed)}`
    })
    .join('\n')
}
