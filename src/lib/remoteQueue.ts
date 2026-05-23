export type Command = {
  command: string
  value?: string
}

// Global object to persist queue across hot reloads and multiple requests in Node.js
const globalForQueue = global as unknown as {
  deviceQueues?: Map<string, Command[]>
}

if (!globalForQueue.deviceQueues) {
  globalForQueue.deviceQueues = new Map()
}

export const deviceQueues = globalForQueue.deviceQueues

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
