/**
 * Undo, redo and snapshots for the service plan — so nothing is permanent.
 *
 *  - Every change to the plan can be undone (⌘Z / Ctrl+Z) and redone
 *    (⇧⌘Z / Ctrl+Y). Quick bursts — typing a title — count as one step.
 *    Each service has its own history; opening another service starts fresh.
 *  - Before every big action (building a Mass, clearing the plan, adding the
 *    notices, restoring) a snapshot of the whole plan is kept, and one when
 *    the app opens. The last 25 are listed under History and are kept in
 *    IndexedDB, so even yesterday's plan can be brought back.
 */

import { create } from 'zustand'
import { useContent } from '../store/useContent'

const MAX_STEPS = 100
const MAX_SNAPS = 25
const GROUP_MS = 800

const past = []
const future = []
let applying = false
let lastAt = 0
let started = false

export const useHistory = create(() => ({ canUndo: false, canRedo: false, snapshots: [] }))
const notify = () => useHistory.setState({ canUndo: past.length > 0, canRedo: future.length > 0 })

// Snapshots live in IndexedDB: whole plans with their reading text are too big
// for localStorage, which the services themselves need.
let dbp = null
function db() {
  dbp ??= new Promise((resolve, reject) => {
    const req = indexedDB.open('worship-history', 1)
    req.onupgradeneeded = () => req.result.createObjectStore('snaps', { keyPath: 'at' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbp
}
async function store(mode, fn) {
  const d = await db()
  return new Promise((resolve, reject) => {
    const t = d.transaction('snaps', mode)
    const r = fn(t.objectStore('snaps'))
    t.oncomplete = () => resolve(r?.result)
    t.onerror = () => reject(t.error)
  })
}
async function readSnaps() {
  const all = (await store('readonly', (s) => s.getAll()).catch(() => [])) ?? []
  return all.sort((a, b) => b.at - a.at)
}
async function refresh() {
  const list = await readSnaps()
  // Keep the newest MAX_SNAPS.
  for (const old of list.slice(MAX_SNAPS)) await store('readwrite', (s) => s.delete(old.at)).catch(() => {})
  useHistory.setState({ snapshots: list.slice(0, MAX_SNAPS).map(({ plan, ...meta }) => meta) })
}

/** Keep a copy of the plan as it is now. */
export async function snapshot(label) {
  const plan = useContent.getState().plan
  if (!plan?.items?.length) return // nothing to lose
  const [latest] = await readSnaps()
  // Don't stack identical copies (e.g. two builds in a row without changes).
  if (latest && JSON.stringify(latest.plan) === JSON.stringify(plan)) return
  const snap = { at: Date.now(), label, title: plan.title, count: plan.items.length, plan }
  await store('readwrite', (s) => s.put(snap)).catch(() => {})
  refresh()
}

export async function restoreSnapshot(at) {
  const snap = (await readSnaps()).find((s) => s.at === at)
  if (!snap) return
  await snapshot('Before restoring a snapshot')
  useContent.setState({ plan: snap.plan })
}

export function undo() {
  if (!past.length) return
  const current = useContent.getState().plan
  future.push(current)
  applying = true
  useContent.setState({ plan: past.pop() })
  applying = false
  notify()
}

export function redo() {
  if (!future.length) return
  past.push(useContent.getState().plan)
  applying = true
  useContent.setState({ plan: future.pop() })
  applying = false
  notify()
}

const BIG_ACTIONS = {
  insertLectionary: 'Before adding the Mass',
  clearPlan: 'Before clearing the plan',
  placeAnnouncements: 'Before adding the notices',
  newService: 'Before starting a new service',
  openService: 'Before opening another service',
}

export function startHistory() {
  if (started) return
  started = true

  useContent.subscribe((s, prev) => {
    if (s.plan === prev.plan) return
    if (applying) return
    if (s.plan.id !== prev.plan.id) {
      // Another service: its own history.
      past.length = 0
      future.length = 0
      notify()
      return
    }
    const now = Date.now()
    if (now - lastAt > GROUP_MS || !past.length) {
      past.push(prev.plan)
      if (past.length > MAX_STEPS) past.shift()
    }
    lastAt = now
    future.length = 0
    notify()
  })

  // A snapshot before each big action, taken by wrapping the store's own actions.
  const st = useContent.getState()
  const wrapped = {}
  for (const [name, label] of Object.entries(BIG_ACTIONS)) {
    const original = st[name]
    if (typeof original !== 'function') continue
    wrapped[name] = (...args) => {
      snapshot(label)
      lastAt = 0 // the action itself is one undo step of its own
      return original(...args)
    }
  }
  useContent.setState(wrapped)

  // And one when the app opens, if the last is more than an hour old.
  readSnaps().then(([latest]) => {
    if (!latest || Date.now() - latest.at > 3600000) snapshot('When the app was opened')
    else refresh()
  })
}
