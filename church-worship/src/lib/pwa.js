/**
 * Service worker registration.
 *
 * Registering caches every surface, so the app keeps opening with no network
 * and no server running at all — the venue case this exists for.
 *
 * Updates are never applied on their own. A new build waits until the operator
 * asks for it (Shell renders the banner), because an unannounced reload during
 * a service is worse than running a build that's a week old.
 *
 * Mirrors the subscribe shape of `broadcast.js` so callers look the same.
 */

import { registerSW } from 'virtual:pwa-register'

const listeners = new Set()
let state = {
  needRefresh: false,
  offlineReady: false,
  canInstall: false, // the browser has offered a one-click install (Chrome, Edge)
  installed: isStandalone(),
}

/** Running as the installed app rather than in a browser tab. */
function isStandalone() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.matchMedia?.('(display-mode: window-controls-overlay)').matches ||
    window.navigator.standalone === true // iOS Safari
  )
}

function setState(patch) {
  state = { ...state, ...patch }
  for (const fn of listeners) fn(state)
}

const updateSW = registerSW({
  onNeedRefresh() {
    setState({ needRefresh: true })
  },
  onOfflineReady() {
    setState({ offlineReady: true })
  },
})

export function subscribePwa(fn) {
  listeners.add(fn)
  fn(state)
  return () => listeners.delete(fn)
}

// --- installing ------------------------------------------------------------------

// Chrome and Edge offer the install through this event; keep it for our button
// instead of letting the browser show its own mini-bar.
let deferredPrompt = null
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e
    setState({ canInstall: true })
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    setState({ canInstall: false, installed: true })
  })
  window.matchMedia?.('(display-mode: standalone)').addEventListener?.('change', (e) => {
    if (e.matches) setState({ installed: true })
  })
}

/** Show the browser's install dialog. Resolves true if the user installed. */
export async function promptInstall() {
  if (!deferredPrompt) return false
  deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice
  deferredPrompt = null
  setState({ canInstall: false })
  return outcome === 'accepted'
}

/** Where to look when there is no one-click install (Safari, Firefox, iPad). */
export function installHelp() {
  const ua = navigator.userAgent
  const iOS =
    /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const safari = /Safari/.test(ua) && !/Chrome|Chromium|Edg|OPR|Firefox/.test(ua)
  if (iOS) return 'Tap the Share button, then “Add to Home Screen”.'
  if (safari) return 'In Safari’s menu bar choose File → Add to Dock.'
  if (/Firefox/.test(ua))
    return 'Firefox can’t install web apps. Open this page in Chrome, Edge or Safari to install it.'
  if (/Edg/.test(ua))
    return 'Use the “App available” icon at the right of the address bar, or … → Apps → Install this site as an app.'
  return 'Use the install icon at the right of the address bar, or ⋮ → Cast, save and share → Install page as app.'
}

/** Activate the waiting build and reload. Operator-initiated only. */
export function applyUpdate() {
  updateSW(true)
}

export function dismissOfflineReady() {
  setState({ offlineReady: false })
}
