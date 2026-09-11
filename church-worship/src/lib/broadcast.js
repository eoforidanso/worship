/**
 * Real-time transport for live control.
 *
 * Two channels run side by side:
 *  - BroadcastChannel  — same-browser windows (operator, projector output, stage).
 *    Always available, zero setup.
 *  - WebSocket         — other machines on the network (a projector laptop, a
 *    stage tablet). Optional: if `server/index.js` isn't running we silently
 *    fall back to BroadcastChannel only.
 *
 * Messages are plain JSON `{ type, payload, origin }`. `origin` lets a sender
 * ignore the echo of its own message.
 */

const CHANNEL = 'worship-live'
const WS_URL =
  import.meta.env.VITE_WS_URL ??
  `ws://${window.location.hostname}:8080`

const origin = Math.random().toString(36).slice(2)
const listeners = new Set()

let bc = null
try {
  bc = new BroadcastChannel(CHANNEL)
  bc.onmessage = (e) => dispatch(e.data)
} catch {
  // Safari private mode / very old browsers — WebSocket only.
}

function dispatch(msg) {
  if (!msg || msg.origin === origin) return
  for (const fn of listeners) fn(msg)
}

// --- WebSocket with backoff reconnect -------------------------------------

let ws = null
let retry = 0
let retryTimer = null
const statusListeners = new Set()
let status = 'connecting'

function setStatus(next) {
  if (status === next) return
  status = next
  for (const fn of statusListeners) fn(status)
}

/**
 * A `ws://` relay is unreachable from an `https://` page — the browser blocks
 * it as mixed content. That's the hosted/demo case (GitHub Pages), where there
 * is no relay to reach anyway, so don't retry forever against a wall.
 * BroadcastChannel still syncs the windows on this machine.
 */
const relayReachable =
  typeof window === 'undefined' ||
  window.location.protocol !== 'https:' ||
  WS_URL.startsWith('wss://')

function connect() {
  if (typeof WebSocket === 'undefined') return setStatus('offline')
  if (!relayReachable) return setStatus('offline')
  try {
    ws = new WebSocket(WS_URL)
  } catch {
    return scheduleRetry()
  }

  ws.onopen = () => {
    retry = 0
    setStatus('online')
  }
  ws.onmessage = (e) => {
    try {
      dispatch(JSON.parse(e.data))
    } catch {
      /* ignore malformed frames */
    }
  }
  ws.onclose = () => {
    ws = null
    setStatus('offline')
    scheduleRetry()
  }
  ws.onerror = () => ws?.close()
}

function scheduleRetry() {
  if (retryTimer) return
  // 1s, 2s, 4s … capped at 15s.
  const delay = Math.min(1000 * 2 ** retry++, 15000)
  retryTimer = setTimeout(() => {
    retryTimer = null
    connect()
  }, delay)
}

connect()

// --- Public API ------------------------------------------------------------

export function publish(type, payload) {
  const msg = { type, payload, origin, t: Date.now() }
  bc?.postMessage(msg)
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg))
}

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function subscribeStatus(fn) {
  statusListeners.add(fn)
  fn(status)
  return () => statusListeners.delete(fn)
}
