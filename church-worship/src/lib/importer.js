/**
 * Bring outside content into the service: pasted text, text files, PDFs and
 * pictures.
 *
 *  - Text (pasted or .txt/.md) becomes slides, a blank line between slides —
 *    the same rule as "Paste lyrics", so a hymn sheet pasted from an email
 *    just works.
 *  - Pictures become one slide each, shown whole (never cropped).
 *  - A PDF becomes one slide per page, each page drawn as a picture, so a
 *    bulletin or a hymn sheet keeps its layout exactly.
 *
 * Pictures and PDF pages are stored in the offline media library (IndexedDB)
 * like any other media, so they project with no network and travel in
 * exported service files.
 */

import { uid } from './id'
import { putMedia } from './mediaStore'
import { useContent } from '../store/useContent'

const TEXT_TYPES = /^text\//
const TEXT_EXT = /\.(txt|md|text)$/i
const PDF = (f) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name)
const IMAGE = (f) => f.type.startsWith('image/')

/** What a file will become, or why it can't come in. */
export function kindOf(file) {
  if (PDF(file)) return 'pdf'
  if (IMAGE(file)) return 'image'
  if (TEXT_TYPES.test(file.type) || TEXT_EXT.test(file.name)) return 'text'
  if (/\.(docx?|pptx?|key|pages|odt|odp)$/i.test(file.name)) return 'office'
  return 'unknown'
}

const titleFrom = (name) =>
  name
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .trim() || 'Imported'

/** Text → slides, a blank line between slides; `[Verse 1]` on its own line labels one. */
export function textToItem(text, title) {
  const blocks = text
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)
  const slides = blocks.map((block) => {
    const lines = block.split('\n')
    const m = lines[0].match(/^\[(.+)\]$/)
    return m
      ? { id: uid('sl'), label: m[1], body: lines.slice(1).join('\n').trim() }
      : { id: uid('sl'), label: '', body: block }
  })
  const first = blocks[0]?.split('\n')[0] ?? ''
  return makeItem('text', title || first.slice(0, 48) || 'Pasted text', slides)
}

function makeItem(type, title, slides, extra = {}) {
  return {
    id: uid('it'),
    type,
    title,
    subtitle: '',
    themeId: 'theme_default',
    background: null,
    slides: slides.length ? slides : [{ id: uid('sl'), label: '', body: '' }],
    notes: '',
    autoAdvance: 0,
    ...extra,
  }
}

/** Store a picture offline and return a slide that shows it whole. */
/** Save a picture in the offline media library; returns its media id. */
export async function storePicture(blob, name, tags = ['imported']) {
  const id = uid('md')
  const file = blob instanceof File ? blob : new File([blob], name, { type: blob.type || 'image/jpeg' })
  const url = await putMedia(id, file)
  useContent.getState().addMedia({ id, name, type: 'image', url, size: file.size, tags, offline: true })
  return id
}

async function pictureSlide(blob, name, label) {
  const id = await storePicture(blob, name)
  return {
    id: uid('sl'),
    label,
    body: '',
    background: { kind: 'image', mediaId: id, fit: 'contain', fallback: '#000000' },
  }
}

// --- PDF ----------------------------------------------------------------------

let pdfjs = null
async function loadPdfjs() {
  if (pdfjs) return pdfjs
  // Loaded on first use: pdf.js is large, and most Sundays don't need it.
  const [lib, worker] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ])
  lib.GlobalWorkerOptions.workerSrc = worker.default
  pdfjs = lib
  return lib
}

/** Each page → a 1920-wide JPEG slide. */
async function pdfToSlides(file, onProgress) {
  const lib = await loadPdfjs()
  const doc = await lib.getDocument({ data: await file.arrayBuffer() }).promise
  const slides = []
  for (let n = 1; n <= doc.numPages; n++) {
    onProgress?.(`${file.name}: page ${n} of ${doc.numPages}`)
    const page = await doc.getPage(n)
    const base = page.getViewport({ scale: 1 })
    // Sharp on a 1080p projector whether the page is portrait or landscape.
    const scale = Math.min(1920 / base.width, 1080 / base.height) * 1.5
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff' // PDFs assume paper
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvasContext: ctx, viewport }).promise
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.9))
    slides.push(await pictureSlide(blob, `${file.name} — page ${n}.jpg`, `Page ${n}`))
    page.cleanup()
  }
  await doc.destroy()
  return slides
}

// --- entry points ---------------------------------------------------------------

/**
 * Turn files into plan items. Pictures dropped together become one item (a
 * slide each) so Next steps through them; every PDF and text file is its own
 * item. Returns `{ items, skipped: [{ name, reason }] }`.
 */
export async function filesToItems(files, onProgress) {
  const items = []
  const skipped = []
  const pictures = []

  for (const file of files) {
    const kind = kindOf(file)
    try {
      if (kind === 'image') {
        onProgress?.(`Saving ${file.name}`)
        pictures.push(await pictureSlide(file, file.name, titleFrom(file.name)))
      } else if (kind === 'pdf') {
        const slides = await pdfToSlides(file, onProgress)
        items.push(makeItem('media', titleFrom(file.name), slides, { subtitle: 'PDF' }))
      } else if (kind === 'text') {
        items.push(textToItem(await file.text(), titleFrom(file.name)))
      } else if (kind === 'office') {
        skipped.push({
          name: file.name,
          reason: 'Save it as a PDF first (File → Save As → PDF), then add the PDF.',
        })
      } else {
        skipped.push({ name: file.name, reason: 'Not a text file, PDF or picture.' })
      }
    } catch (err) {
      console.warn('[import]', file.name, err)
      skipped.push({ name: file.name, reason: err?.message ?? String(err) })
    }
  }

  if (pictures.length) {
    const title = pictures.length === 1 ? pictures[0].label : `Pictures (${pictures.length})`
    items.unshift(makeItem('media', title, pictures, { subtitle: pictures.length === 1 ? 'Picture' : '' }))
  }
  return { items, skipped }
}
