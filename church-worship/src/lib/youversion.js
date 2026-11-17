/**
 * The Twi Bible, from YouVersion.
 *
 * The Twi editions (Asante, Akuapem) are in copyright and licensed through
 * YouVersion, so they cannot ship with the app the way the two English
 * Bibles do. The parish connects its own free YouVersion App Key once; the
 * readings are then fetched verse by verse and kept on this computer, so a
 * Mass prepared on Thursday still projects on a Sunday with no internet.
 *
 * - The App Key lives in this browser only (localStorage). It is never put in
 *   a service file, a backup, or anything sent anywhere but YouVersion.
 * - Fetched verses are kept in IndexedDB, per edition.
 * - Only editions the key is licensed for are offered.
 */

const API = 'https://api.youversion.com/v1'
const KEY_PREF = 'worship-yv-key'
const VERSION_PREF = 'worship-yv-version'

// Ambo's book names → the USFM codes YouVersion uses.
const USFM = {
  Genesis: 'GEN', Exodus: 'EXO', Leviticus: 'LEV', Numbers: 'NUM', Deuteronomy: 'DEU', Joshua: 'JOS',
  Judges: 'JDG', Ruth: 'RUT', '1 Samuel': '1SA', '2 Samuel': '2SA', '1 Kings': '1KI', '2 Kings': '2KI',
  '1 Chronicles': '1CH', '2 Chronicles': '2CH', Ezra: 'EZR', Nehemiah: 'NEH', Tobit: 'TOB', Judith: 'JDT',
  Esther: 'EST', Job: 'JOB', Psalms: 'PSA', Proverbs: 'PRO', Ecclesiastes: 'ECC', 'Song of Songs': 'SNG',
  Wisdom: 'WIS', Sirach: 'SIR', Isaiah: 'ISA', Jeremiah: 'JER', Lamentations: 'LAM', Baruch: 'BAR',
  Ezekiel: 'EZK', Daniel: 'DAN', Hosea: 'HOS', Joel: 'JOL', Amos: 'AMO', Obadiah: 'OBA', Jonah: 'JON',
  Micah: 'MIC', Nahum: 'NAM', Habakkuk: 'HAB', Zephaniah: 'ZEP', Haggai: 'HAG', Zechariah: 'ZEC',
  Malachi: 'MAL', '1 Maccabees': '1MA', '2 Maccabees': '2MA', Matthew: 'MAT', Mark: 'MRK', Luke: 'LUK',
  John: 'JHN', Acts: 'ACT', Romans: 'ROM', '1 Corinthians': '1CO', '2 Corinthians': '2CO', Galatians: 'GAL',
  Ephesians: 'EPH', Philippians: 'PHP', Colossians: 'COL', '1 Thessalonians': '1TH', '2 Thessalonians': '2TH',
  '1 Timothy': '1TI', '2 Timothy': '2TI', Titus: 'TIT', Philemon: 'PHM', Hebrews: 'HEB', James: 'JAS',
  '1 Peter': '1PE', '2 Peter': '2PE', '1 John': '1JN', '2 John': '2JN', '3 John': '3JN', Jude: 'JUD',
  Revelation: 'REV',
}

const read = (k) => {
  try {
    return localStorage.getItem(k) ?? ''
  } catch {
    return ''
  }
}
const write = (k, v) => {
  try {
    if (v) localStorage.setItem(k, v)
    else localStorage.removeItem(k)
  } catch {
    /* private mode: the connection lasts for this visit only */
  }
}

let key = read(KEY_PREF)

export const isConnected = () => !!key

/** The chosen Twi edition `{ id, title, abbreviation, copyright }`, or null. */
export function savedVersion() {
  try {
    const v = JSON.parse(read(VERSION_PREF) || 'null')
    return v && Number.isSafeInteger(v.id) ? v : null
  } catch {
    return null
  }
}

// --- talking to YouVersion ---------------------------------------------------------

const MESSAGES = {
  400: 'YouVersion could not accept this Bible reference.',
  401: 'The YouVersion App Key is not valid. Check it and connect again.',
  403: 'Your YouVersion app is not licensed for this Bible. Enable it in the YouVersion Platform portal.',
  404: 'This passage is not in this Bible.',
  429: 'YouVersion is asking us to slow down. Wait a minute, then try again.',
}

async function request(route, params = {}, useKey = key) {
  if (!useKey) throw new Error('Connect your YouVersion App Key first (Readings → Twi Bible, above the readings).')
  const url = new URL(API + route)
  for (const [name, value] of Object.entries(params))
    for (const v of Array.isArray(value) ? value : [value]) url.searchParams.append(name, String(v))
  let res
  try {
    res = await fetch(url, {
      headers: { 'X-YVP-App-Key': useKey, Accept: 'application/json' },
      signal: AbortSignal.timeout?.(25000),
    })
  } catch {
    const err = new Error('YouVersion can’t be reached. Check the internet connection and try again.')
    err.offline = true
    throw err
  }
  if (!res.ok) {
    const err = new Error(MESSAGES[res.status] ?? 'YouVersion is unavailable just now. Try again later.')
    err.status = res.status
    throw err
  }
  if (res.status === 204) return { data: [] }
  return res.json()
}

async function collection(route, params) {
  const all = []
  let token
  for (let page = 0; page < 50; page++) {
    const r = await request(route, { ...params, ...(token ? { page_token: token } : {}) })
    if (!Array.isArray(r.data)) throw new Error('YouVersion returned an incomplete list.')
    all.push(...r.data)
    token = r.next_page_token
    if (!token) break
  }
  return all
}

const plain = (s) =>
  String(s ?? '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/** Twi (Asante, Akuapem) — not Fante, which shares the "ak" language tag. */
function isTwi(v) {
  const name = String(v.title ?? '')
  if (/\b(fante|fanti|mfantse)\b/i.test(name) && !/\btwi\b/i.test(name)) return false
  return (
    /^(tw|twi|ak|aka)(-|$)/i.test(v.language_tag ?? '') ||
    /\b(twi|asante|ashanti|akuapem|akwapem|akuapim)\b/i.test(name)
  )
}

/** Check a key with YouVersion and keep it on this computer. Throws if it is refused. */
export async function connect(candidate) {
  candidate = String(candidate ?? '').trim()
  if (!candidate || candidate.length > 2048 || /\s/.test(candidate))
    throw new Error('Paste the App Key from your YouVersion Platform account.')
  await request('/bibles', { 'language_ranges[]': 'en', page_size: 1 }, candidate)
  key = candidate
  write(KEY_PREF, key)
}

/** Forget the key and the chosen edition. Verses already saved stay for offline use. */
export function disconnect() {
  key = ''
  write(KEY_PREF, '')
  write(VERSION_PREF, '')
}

/** The Twi editions this key is licensed for: `[{ id, title, language_tag }]`. */
export async function twiVersions() {
  const all = await collection('/bibles', {
    'language_ranges[]': '*',
    'fields[]': ['id', 'title', 'language_tag'],
    page_size: '*',
  })
  return all
    .map((v) => ({ id: Number(v.id), title: String(v.title ?? `Bible ${v.id}`), language_tag: String(v.language_tag ?? '') }))
    .filter((v) => Number.isSafeInteger(v.id) && v.id > 0 && isTwi(v))
    .sort((a, b) => a.title.localeCompare(b.title))
}

/** Choose an edition. Its attribution is fetched and kept: slides must credit the publisher. */
export async function chooseVersion(id) {
  const v = await request(`/bibles/${Number(id)}`)
  const version = {
    id: Number(id),
    title: plain(v.title) || `Bible ${id}`,
    abbreviation: plain(v.abbreviation),
    copyright: plain(v.copyright || v.promotional_content),
  }
  write(VERSION_PREF, JSON.stringify(version))
  return version
}

// --- verses, kept for offline --------------------------------------------------------

const DB_NAME = 'worship-youversion'
const STORE = 'verses'
let dbPromise = null
const openDB = () =>
  (dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  }))

const cacheGet = (k) =>
  openDB()
    .then(
      (db) =>
        new Promise((resolve) => {
          const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(k)
          req.onsuccess = () => resolve(req.result ?? null)
          req.onerror = () => resolve(null)
        }),
    )
    .catch(() => null)

const cachePut = (k, value) =>
  openDB()
    .then((db) => db.transaction(STORE, 'readwrite').objectStore(STORE).put(value, k))
    .catch(() => {})

const pending = new Map()

/** One verse's text; '' when this edition doesn't have it (joined to its neighbour, say). */
function verse(versionId, book, chapter, n) {
  const id = `${USFM[book]}.${chapter}.${n}`
  const k = `${versionId}:${id}`
  if (pending.has(k)) return pending.get(k)
  const p = (async () => {
    const saved = await cacheGet(k)
    if (saved != null) return saved
    let text = ''
    try {
      const r = await request(`/bibles/${versionId}/passages/${encodeURIComponent(id)}`, {
        format: 'text',
        include_headings: false,
        include_notes: false,
      })
      // Some editions lead a verse with its own number; the slides add none.
      text = plain(r.content).replace(new RegExp(`^${n}[.\\s]+(?=\\S)`), '')
    } catch (err) {
      if (err.status !== 404) throw err
    }
    await cachePut(k, text)
    return text
  })()
  pending.set(k, p)
  p.catch(() => {}).finally(() => pending.delete(k))
  return p
}

/** How many verses each chapter of a book has in this edition. */
const indexes = new Map()
async function lastVerse(versionId, book, chapter) {
  const k = `${versionId}:index`
  if (!indexes.has(k)) {
    indexes.set(
      k,
      (async () => {
        const saved = await cacheGet(k)
        if (saved) return saved
        const r = await request(`/bibles/${versionId}/index`)
        const out = {}
        for (const b of r.books ?? [])
          for (const c of b.chapters ?? []) {
            const nums = (c.verses ?? []).flatMap((v) => String(v.id).split('-').map(Number)).filter((x) => x > 0)
            if (nums.length) out[`${b.id}.${c.id}`] = Math.max(...nums)
          }
        if (!Object.keys(out).length) throw new Error('YouVersion did not return this Bible’s chapters.')
        await cachePut(k, out)
        return out
      })(),
    )
    indexes.get(k).catch(() => indexes.delete(k))
  }
  const n = (await indexes.get(k))[`${USFM[book]}.${chapter}`]
  if (!n) throw new Error(`${book} ${chapter} is not in this Twi Bible.`)
  return n
}

/** Run `fn` over `items`, a few at a time, keeping order. */
async function pooled(items, fn, size = 4) {
  const out = new Array(items.length)
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) {
        const i = next++
        out[i] = await fn(items[i])
      }
    }),
  )
  return out
}

/**
 * The verses of a parsed citation, in the shape `fetchPassage` returns them.
 * @param books  `parseCitation` output: `[{ book, ranges: [{ c1, v1, c2, v2, heb }] }]`
 * @param END    the "to the end of the chapter" marker used by the parser
 */
export async function youVersionVerses(books, END) {
  const version = savedVersion()
  if (!version) throw new Error('Choose your Twi Bible first (Readings → Twi Bible, above the readings).')
  const wanted = []
  let group = 0
  for (const b of books) {
    if (!USFM[b.book]) throw new Error(`${b.book} is not available in the Twi Bible.`)
    for (const r of b.ranges) {
      const [sc, ec] = [r.heb ?? r.c1, r.heb ?? r.c2]
      for (let c = sc; c <= ec; c++) {
        const from = c === sc ? r.v1 : 1
        const open = c !== ec || r.v2 >= END - 50
        const to = open ? await lastVerse(version.id, b.book, c) : r.v2
        for (let v = from; v <= to; v++) wanted.push({ book: b.book, c, v, group })
      }
      group++
    }
  }
  if (wanted.length > 400) throw new Error('That is a very long passage for the Twi Bible. Choose a shorter one.')
  const texts = await pooled(wanted, (w) => verse(version.id, w.book, w.c, w.v))
  return wanted
    .map((w, i) => ({ ref: `${w.c}:${w.v}`, text: texts[i], group: w.group, book: w.book }))
    .filter((v) => v.text)
}
