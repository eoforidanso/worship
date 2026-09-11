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
let state = { needRefresh: false, offlineReady: false }

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

/** Activate the waiting build and reload. Operator-initiated only. */
export function applyUpdate() {
  updateSW(true)
}

export function dismissOfflineReady() {
  setState({ offlineReady: false })
}
