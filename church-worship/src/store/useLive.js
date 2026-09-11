import { create } from 'zustand'
import { publish, subscribe } from '../lib/broadcast'
import { useContent } from './useContent'

/**
 * What the congregation is looking at right now.
 *
 * Deliberately not persisted: a reload should never silently re-project the
 * last slide. Every mutation goes out over `broadcast` so the projector and
 * stage windows follow along; incoming messages are applied with `apply()`,
 * which does not re-publish.
 */

const initial = {
  itemId: null,
  slideIndex: 0,
  blackout: false,
  showLogo: false,
  cleared: false, // background stays, text is hidden
  message: '', // operator note shown on the stage display only
  countdownTo: null, // epoch ms, or null
}

// Only these keys go over the wire. The store also holds action functions, and
// structuredClone — which BroadcastChannel uses — throws on those.
const STATE_KEYS = Object.keys(initial)

const snapshot = (state) => {
  const out = {}
  for (const k of STATE_KEYS) out[k] = state[k]
  return out
}

export const useLive = create((set, get) => ({
  ...initial,

  /** Apply remote state without echoing it back out. */
  apply: (patch) => set(snapshot(patch)),

  /** Apply locally and tell every other window. */
  push: (patch) => {
    set(patch)
    publish('live', snapshot(get()))
  },

  goTo: (itemId, slideIndex = 0) =>
    get().push({ itemId, slideIndex, blackout: false, cleared: false, showLogo: false }),

  next: () => {
    const { itemId, slideIndex } = get()
    const { items } = useContent.getState().plan
    const i = items.findIndex((it) => it.id === itemId)
    if (i === -1) {
      if (items.length) get().goTo(items[0].id, 0)
      return
    }
    if (slideIndex + 1 < items[i].slides.length) {
      get().push({ slideIndex: slideIndex + 1 })
    } else if (i + 1 < items.length) {
      get().goTo(items[i + 1].id, 0)
    }
  },

  prev: () => {
    const { itemId, slideIndex } = get()
    const { items } = useContent.getState().plan
    const i = items.findIndex((it) => it.id === itemId)
    if (i === -1) return
    if (slideIndex > 0) {
      get().push({ slideIndex: slideIndex - 1 })
    } else if (i > 0) {
      const prevItem = items[i - 1]
      get().goTo(prevItem.id, Math.max(0, prevItem.slides.length - 1))
    }
  },

  toggleBlackout: () => get().push({ blackout: !get().blackout, showLogo: false }),
  toggleLogo: () => get().push({ showLogo: !get().showLogo, blackout: false }),
  toggleClear: () => get().push({ cleared: !get().cleared }),
  setMessage: (message) => get().push({ message }),
  startCountdown: (seconds) => get().push({ countdownTo: Date.now() + seconds * 1000 }),
  stopCountdown: () => get().push({ countdownTo: null }),

  reset: () => get().push({ ...initial }),
}))

// Follow whatever the operator window sends.
subscribe((msg) => {
  if (msg.type === 'live') useLive.getState().apply(msg.payload)
})
