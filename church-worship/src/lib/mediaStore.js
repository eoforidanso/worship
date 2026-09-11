/**
 * Offline media store.
 *
 * Media files live in IndexedDB as Blobs — the whole file, whatever its size.
 * This is the difference between "the app runs offline" and "the service runs
 * offline": a background that vanishes on reload is a blank projector in front
 * of the congregation.
 *
 * Why IndexedDB and not localStorage: localStorage is a ~5MB budget for the
 * entire origin and only holds strings, so files had to be base64'd into it —
 * which is where the old 2MB cut-off came from. IndexedDB stores Blobs
 * natively against a quota that is a share of free disk (hundreds of GB on a
 * typical laptop), so videos and high-res backgrounds simply fit.
 *
 * Blobs are addressed by media id, never by URL. Object URLs are minted fresh
 * each session and are meaningless after a reload, so anything that needs to
 * survive — a slide background, the logo — stores the id and resolves it here.
 */

const DB_NAME = 'worship-media'
const DB_VERSION = 1
const STORE = 'blobs'

let dbPromise = null

function openDB() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function tx(mode, fn) {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const t = db.transaction(STORE, mode)
        const store = t.objectStore(STORE)
        let result
        try {
          result = fn(store)
        } catch (err) {
          reject(err)
          return
        }
        t.oncomplete = () => resolve(result?.result ?? result)
        t.onerror = () => reject(t.error)
        t.onabort = () => reject(t.error)
      }),
  )
}

// --- object URLs -----------------------------------------------------------

// id -> object URL, valid for this document only.
const urls = new Map()

/** The URL for a hydrated media id, or null if it isn't in memory yet. */
export function urlFor(id) {
  return urls.get(id) ?? null
}

function mint(id, blob) {
  const existing = urls.get(id)
  if (existing) URL.revokeObjectURL(existing)
  const url = URL.createObjectURL(blob)
  urls.set(id, url)
  return url
}

// --- reads / writes --------------------------------------------------------

/**
 * Store a file and mint a URL for it. `onProgress` reports 0..1 while the
 * bytes are read, so a 400MB video doesn't look like a frozen UI.
 */
export async function putMedia(id, file, onProgress) {
  const blob = await readWithProgress(file, onProgress)
  await tx('readwrite', (store) =>
    store.put({
      id,
      blob,
      name: file.name,
      type: file.type,
      size: file.size,
      addedAt: Date.now(),
    }),
  )
  return mint(id, blob)
}

/** Load one blob and mint its URL. Returns null when it isn't stored. */
export async function hydrate(id) {
  const rec = await tx('readonly', (store) => store.get(id))
  if (!rec?.blob) return null
  return mint(id, rec.blob)
}

/**
 * Load every stored blob and mint URLs. Called once at boot, before the first
 * paint of anything that draws media.
 */
export async function hydrateAll() {
  const recs = await tx('readonly', (store) => store.getAll())
  const ids = []
  for (const rec of recs ?? []) {
    if (!rec?.blob) continue
    mint(rec.id, rec.blob)
    ids.push(rec.id)
  }
  return ids
}

export async function deleteMedia(id) {
  const url = urls.get(id)
  if (url) {
    URL.revokeObjectURL(url)
    urls.delete(id)
  }
  await tx('readwrite', (store) => store.delete(id))
}

/** Ids currently held in the database, for reconciling against the plan. */
export async function storedIds() {
  const keys = await tx('readonly', (store) => store.getAllKeys())
  return new Set(keys ?? [])
}

// --- quota -----------------------------------------------------------------

/** Bytes used and available, or null where the browser won't say. */
export async function storageEstimate() {
  if (!navigator.storage?.estimate) return null
  const { usage, quota } = await navigator.storage.estimate()
  return { usage, quota }
}

/**
 * Ask the browser not to evict this origin under disk pressure. Without it a
 * quiet eviction between Thursday's prep and Sunday's service would take the
 * media with it. Best-effort: browsers may grant it silently or refuse.
 */
export async function requestPersistence() {
  if (!navigator.storage?.persist) return false
  if (await navigator.storage.persisted()) return true
  return navigator.storage.persist().catch(() => false)
}

// --- helpers ---------------------------------------------------------------

function readWithProgress(file, onProgress) {
  // A File is already a Blob; we only read it through FileReader to get
  // progress events for the import UI.
  if (!onProgress) return Promise.resolve(file.slice())
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total)
    }
    reader.onload = () => {
      onProgress(1)
      resolve(new Blob([reader.result], { type: file.type }))
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(file)
  })
}
