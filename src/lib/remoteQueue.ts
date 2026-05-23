export type Command = {
  command: string
  value?: string
}

// Global object to persist queue, screens and requests across hot reloads and multiple requests in Node.js
const globalForQueue = global as unknown as {
  deviceQueues?: Map<string, Command[]>
  deviceScreens?: Map<string, string>
  activeScreenRequests?: Set<string>
}

if (!globalForQueue.deviceQueues) {
  globalForQueue.deviceQueues = new Map()
}
if (!globalForScreens().deviceScreens) {
  globalForQueue.deviceScreens = new Map()
}
if (!globalForScreens().activeScreenRequests) {
  globalForQueue.activeScreenRequests = new Set()
}

// Helper function to safely read global state with fallbacks
function globalForScreens() {
  return globalForQueue
}

export const deviceQueues = globalForQueue.deviceQueues
export const deviceScreens = globalForQueue.deviceScreens!
export const activeScreenRequests = globalForQueue.activeScreenRequests!

export function pushCommand(deviceId: string, command: string, value?: string) {
  if (!deviceQueues.has(deviceId)) {
    deviceQueues.set(deviceId, [])
  }
  const queue = deviceQueues.get(deviceId)!
  queue.push({ command, value })
  
  // Keep queue size small to prevent leaks
  if (queue.length > 10) {
    queue.shift()
  }
}

export function popCommands(deviceId: string): Command[] {
  const queue = deviceQueues.get(deviceId)
  if (!queue || queue.length === 0) return []
  
  // Pop all commands
  const commands = [...queue]
  deviceQueues.set(deviceId, [])
  return commands
}
