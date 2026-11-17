/**
 * The parish songbook: a large catalogue of songs brought in from another
 * program (Worship Studio, which itself carries the parish's EasyWorship
 * songs).
 *
 * It is kept apart from the small hand-kept library in `useContent` on
 * purpose. That store is written to localStorage on every change and re-read
 * by the projector and stage windows; a thousand songs would be re-saved on
 * every keystroke and crowd the 5MB budget the service plans need. The
 * songbook lives in IndexedDB instead, is loaded once into memory, and a song
 * is copied into the plan only when it is added to a service.
 *
 * Nothing here ships with the app: many of these songs are in copyright, so
 * they stay on the parish's own machine and are never part of the build.
 */

import { create } from 'zustand'

const DB_NAME = 'worship-songbook'
const STORE = 'books'
const KEY = 'main'

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function readBook() {
  const db = await openDB()
  try {
    return await new Promise((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY)
      req.onsuccess = () => resolve(req.result ?? null)
      req.onerror = () => reject(req.error)
    })
  } finally {
    db.close()
  }
}

async function writeBook(book) {
  const db = await openDB()
  try {
    await new Promise((resolve, reject) => {
      const t = db.transaction(STORE, 'readwrite')
      if (book) t.objectStore(STORE).put({ ...book, id: KEY })
      else t.objectStore(STORE).delete(KEY)
      t.oncomplete = resolve
      t.onerror = () => reject(t.error)
      t.onabort = () => reject(t.error)
    })
  } finally {
    db.close()
  }
}

// --- in memory -----------------------------------------------------------------

// Lower-cased title + lyrics per song, built once, so searching a thousand
// songs on every keystroke doesn't lower-case 600,000 characters each time.
let haystacks = new Map()
let byId = new Map()

function index(songs) {
  haystacks = new Map()
  byId = new Map()
  for (const s of songs) {
    byId.set(s.id, s)
    haystacks.set(
      s.id,
      [s.title, s.subtitle, s.notes, ...s.slides.map((sl) => sl.body)].filter(Boolean).join('\n').toLowerCase(),
    )
  }
}

export const useSongbook = create(() => ({
  songs: [],
  source: '', // where it came from, for the Library heading
  importedAt: null,
  ready: false,
}))

/** A songbook entry by id, or null. Used when a song is added to a service. */
export const songbookEntry = (id) => byId.get(id) ?? null

/** Does this songbook entry contain `needle` (already lower-cased)? */
export const songbookMatches = (id, needle) => haystacks.get(id)?.includes(needle) ?? false

function publish(book) {
  const songs = book?.songs ?? []
  index(songs)
  useSongbook.setState({
    songs,
    source: book?.source ?? '',
    importedAt: book?.importedAt ?? null,
    ready: true,
  })
}

/** Load the stored songbook at start-up. Never throws: no songbook is fine. */
export const songbookReady = readBook()
  .then(publish)
  .catch((err) => {
    console.warn('[songbook] could not be read', err)
    publish(null)
  })

/** Replace or extend the songbook. Entries with the same id are updated. */
export async function saveSongbook(songs, source) {
  const merged = new Map(useSongbook.getState().songs.map((s) => [s.id, s]))
  let added = 0
  for (const s of songs) {
    if (!merged.has(s.id)) added++
    merged.set(s.id, s)
  }
  const book = {
    songs: [...merged.values()].sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true })),
    source: source || useSongbook.getState().source,
    importedAt: Date.now(),
  }
  await writeBook(book)
  publish(book)
  return { total: book.songs.length, added, updated: songs.length - added }
}

export async function clearSongbook() {
  await writeBook(null)
  publish(null)
}

// --- reading another program's songs ----------------------------------------------

const CHORUS = /^\s*(chorus|refrain)\b/i

/** Is this slide a chorus or refrain, going by its label? */
export const isChorus = (slide) => CHORUS.test(slide?.label ?? '')

/** "CHORUS:" → "Chorus", "VERSE 2" → "Verse 2"; anything unusual is left as written. */
function tidyLabel(raw) {
  const label = String(raw ?? '')
    .replace(/\s+/g, ' ')
    .replace(/:$/, '')
    .trim()
  const m = label.match(/^(verse|chorus|refrain|bridge|ending|end|response|slide)\s*(\d+)?\s*(\([a-z]\))?$/i)
  if (m) {
    const word = m[1][0].toUpperCase() + m[1].slice(1).toLowerCase()
    return [word, m[2], m[3]].filter(Boolean).join(' ')
  }
  if (/^\d+$/.test(label)) return `Verse ${label}`
  return label.slice(0, 60)
}

/**
 * Worship Studio's song library → songbook entries.
 *
 * The file is `window.WORSHIP_SONG_LIBRARY={…}`. It is read as data — the JSON
 * between the first `{` and the last `}` is parsed, and nothing is ever run.
 */
export function parseWorshipStudioSongs(text) {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end <= start) throw new Error('No song library found in this file.')
  let data
  try {
    data = JSON.parse(text.slice(start, end + 1))
  } catch {
    throw new Error('The song library in this file could not be read.')
  }
  if (data?.format !== 'worship-studio-song-library' || !Array.isArray(data.items))
    throw new Error('This is not a Worship Studio song library.')

  const songs = []
  for (const it of data.items) {
    const pages = Array.isArray(it?.slides) ? it.slides : []
    const slides = pages
      .map((body, i) => ({
        id: `ws_${it.id}_${i + 1}`,
        label: tidyLabel(it.sections?.[i]?.displayLabel ?? it.sections?.[i]?.label),
        body: typeof body === 'string' ? body.replace(/\r\n?/g, '\n').trim() : '',
      }))
      .filter((sl) => sl.body)
    if (!it?.id || !slides.length) continue
    const title = String(it.title ?? '').trim() || 'Untitled'
    songs.push({
      id: `ws_${it.id}`,
      type: 'song',
      title,
      subtitle: [it.author, it.copyright].map((x) => String(x ?? '').trim()).filter(Boolean).join(' · '),
      themeId: 'theme_default',
      background: null,
      notes: ['Songbook', it.displayLanguage !== 'English' && it.displayLanguage, it.tags].filter(Boolean).join(' · '),
      autoAdvance: 0,
      songbook: true,
      slides,
    })
  }
  if (!songs.length) throw new Error('The song library in this file is empty.')
  return { songs, source: data.provider ? `Worship Studio (${data.provider})` : 'Worship Studio' }
}
