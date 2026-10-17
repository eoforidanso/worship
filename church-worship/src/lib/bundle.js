/**
 * Service files: export and import.
 *
 * The plan lives in this browser's localStorage and the media in its
 * IndexedDB, so on its own nothing leaves the machine. A bundle is one JSON
 * file that carries a service — or everything — to another laptop, or into a
 * folder as a backup before Sunday.
 *
 * Media bytes ride along as data URLs. That makes a bundle with video large,
 * but it is a single file that opens anywhere, with no zip library and nothing
 * left behind on the network.
 */

import { useContent } from '../store/useContent'
import { getRecord, putMedia, hydrate, storedIds, urlFor } from './mediaStore'

const FORMAT = 'church-worship'
const VERSION = 1

/** Media ids a set of items and the logo depend on. */
function referencedMedia(items, logoId) {
  const ids = new Set()
  for (const it of items) {
    if (it.background?.mediaId) ids.add(it.background.mediaId)
    for (const sl of it.slides ?? []) if (sl.background?.mediaId) ids.add(sl.background.mediaId) // imported pictures, PDF pages
  }
  if (logoId) ids.add(logoId)
  return ids
}

/**
 * @param {'service'|'all'} scope  the open service only, or every service,
 *   the whole library and all media
 */
export async function exportBundle(scope = 'service') {
  const s = useContent.getState()
  const services = scope === 'all' ? [s.plan, ...s.services.filter((p) => p.id !== s.plan.id)] : [s.plan]
  const songs = scope === 'all' ? s.songs : []
  const items = [...services.flatMap((p) => p.items), ...songs]

  const themeIds = new Set(items.map((it) => it.themeId))
  const themes = scope === 'all' ? s.themes : s.themes.filter((t) => themeIds.has(t.id))

  const mediaIds = scope === 'all' ? new Set(s.media.map((m) => m.id)) : referencedMedia(items, s.logoId)
  for (const an of s.announcements ?? []) if (an.mediaId) mediaIds.add(an.mediaId) // notice posters travel too
  const media = s.media.filter((m) => mediaIds.has(m.id)).map(({ url, ...rest }) => rest)

  const blobs = {}
  for (const id of mediaIds) {
    const rec = await getRecord(id).catch(() => null)
    if (rec?.blob) blobs[id] = { name: rec.name, type: rec.type, data: await toDataUrl(rec.blob) }
  }

  const bundle = {
    format: FORMAT,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    scope,
    services,
    songs,
    themes,
    media,
    logoId: s.logoId,
    parish: s.parish,
    prayers: s.prayers, // the parish's own Order of Mass texts travel with every file
    announcements: s.announcements,
    blobs,
  }

  const name =
    scope === 'all'
      ? `worship-backup-${today()}.worship.json`
      : `${slug(s.plan.title)}-${s.plan.date || today()}.worship.json`
  download(new Blob([JSON.stringify(bundle)], { type: 'application/json' }), name)
  if (scope === 'all') useContent.getState().markBackedUp()
  return { services: services.length, media: Object.keys(blobs).length }
}

/** Read a bundle file and merge it into this machine. */
export async function importBundle(file) {
  const bundle = JSON.parse(await file.text())
  if (bundle?.format !== FORMAT) throw new Error('This is not a Church Worship service file.')

  // Bytes first, so nothing in the merged plan points at media that isn't here.
  const have = await storedIds().catch(() => new Set())
  for (const [id, b] of Object.entries(bundle.blobs ?? {})) {
    if (have.has(id)) continue
    const blob = await (await fetch(b.data)).blob()
    await putMedia(id, new File([blob], b.name ?? id, { type: b.type || blob.type }))
  }

  const media = (bundle.media ?? []).map((m) => ({
    ...m,
    offline: m.id in (bundle.blobs ?? {}) || have.has(m.id),
  }))
  useContent.getState().importBundle({ ...bundle, media })

  // Re-attach URLs for everything just written, then reconcile the dots.
  for (const id of Object.keys(bundle.blobs ?? {})) if (!urlFor(id)) await hydrate(id)
  useContent.getState().attachMediaUrls(urlFor, await storedIds())

  return {
    services: (bundle.services ?? []).map((p) => p.title),
    songs: bundle.songs?.length ?? 0,
    media: Object.keys(bundle.blobs ?? {}).length,
  }
}

// --- helpers ---------------------------------------------------------------

function toDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
}

function download(blob, name) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

function slug(text) {
  return (
    (text || 'service')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'service'
  )
}

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
