/**
 * Phone remote, operator side.
 *
 * A phone on the church wifi opens /remote and sends commands ("next",
 * "blackout", …) through the relay. The operator window carries them out —
 * but only if they carry this laptop's PIN, so nobody else on the wifi can
 * drive the projector — and broadcasts a short status line back so the phone
 * shows what is on screen.
 *
 * If more than one operator window is open, only one (the first) obeys the
 * phone, so a press never advances twice.
 */

import { publish, subscribe } from './broadcast'
import { useLive } from '../store/useLive'
import { useContent } from '../store/useContent'

const PIN_KEY = 'worship-remote-pin'

/** This laptop's remote PIN: four digits, kept so a paired phone keeps working. */
export function remotePin() {
  try {
    let pin = localStorage.getItem(PIN_KEY)
    if (!/^\d{4}$/.test(pin ?? '')) {
      pin = String(Math.floor(1000 + Math.random() * 9000))
      localStorage.setItem(PIN_KEY, pin)
    }
    return pin
  } catch {
    return '0000'
  }
}

export function newRemotePin() {
  try {
    localStorage.removeItem(PIN_KEY)
  } catch {
    /* fall through */
  }
  return remotePin()
}

let leader = false
let started = false

const ACTIONS = {
  next: (l) => l.next(),
  prev: (l) => l.prev(),
  blackout: (l) => l.toggleBlackout(),
  clear: (l) => l.toggleClear(),
  logo: (l) => l.toggleLogo(),
}

/** What the phone shows: the part, the slide, a glimpse of the words, what's next. */
function status() {
  const live = useLive.getState()
  const { items } = useContent.getState().plan
  const i = items.findIndex((it) => it.id === live.itemId)
  const item = items[i]
  const slide = item?.slides[live.slideIndex]
  const next = item
    ? live.slideIndex + 1 < item.slides.length
      ? `${item.title} · slide ${live.slideIndex + 2}`
      : items[i + 1]?.title
    : items[0]?.title
  return {
    title: item?.title ?? '',
    position: item ? `${live.slideIndex + 1} of ${item.slides.length}` : '',
    text: (slide?.body ?? '').replace(/\s+/g, ' ').slice(0, 160),
    next: next ?? '',
    blackout: live.blackout,
    cleared: live.cleared,
    logo: live.showLogo,
  }
}

export function startRemoteControl() {
  if (started || typeof window === 'undefined') return
  started = true

  const becomeLeader = () => {
    leader = true
    publish('status', status())
  }
  // Web Locks give us "first operator window wins"; without them, every window obeys.
  if (navigator.locks?.request)
    navigator.locks.request('worship-remote-leader', () => (becomeLeader(), new Promise(() => {})))
  else becomeLeader()

  subscribe((msg) => {
    if (!leader) return
    if (msg.type === 'hello') publish('status', status())
    if (msg.type !== 'command') return
    if (msg.payload?.pin !== remotePin()) {
      publish('status', { ...status(), refused: true })
      return
    }
    ACTIONS[msg.payload.action]?.(useLive.getState())
  })

  // Keep the phone current whenever what's on screen changes.
  useLive.subscribe(() => leader && publish('status', status()))
}
