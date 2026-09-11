/**
 * Canvas slide renderer.
 *
 * One function draws every surface in the app — planner thumbnails, the
 * composer preview, the projector output and the stage display — so what the
 * operator previews is pixel-for-pixel what the congregation sees.
 *
 * Everything is authored against a 1920x1080 design space and scaled to the
 * target canvas, so a 240px thumbnail and a 4K projector agree on layout.
 */

import { urlFor } from './mediaStore'

export const DESIGN_W = 1920
export const DESIGN_H = 1080

// --- image cache -----------------------------------------------------------

const imageCache = new Map()

/**
 * Returns a decoded image immediately if we already have it, otherwise kicks
 * off a load and returns null. Callers redraw when `onReady` fires.
 */
export function getImage(url, onReady) {
  if (!url) return null
  const hit = imageCache.get(url)
  if (hit) return hit.complete && hit.naturalWidth ? hit : null

  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => onReady?.()
  img.onerror = () => imageCache.delete(url)
  img.src = url
  imageCache.set(url, img)
  return null
}

// --- video cache -----------------------------------------------------------

const videoCache = new Map()

/**
 * Video backgrounds, on the same terms as images: the renderer owns the
 * element, so every surface gets them through one path and no caller has to
 * mount a `<video>` of its own.
 *
 * Returns a playing element once there's a frame to draw, otherwise null.
 * Surfaces that animate (output, live preview) get motion; static ones
 * (thumbnails) draw whatever frame has landed, which is the right still.
 */
export function getVideo(url, onReady) {
  if (!url) return null
  const hit = videoCache.get(url)
  if (hit) return hit.readyState >= 2 ? hit : null

  const v = document.createElement('video')
  v.crossOrigin = 'anonymous'
  v.muted = true // autoplay is only allowed muted, and slides carry no sound
  v.loop = true
  v.playsInline = true
  v.preload = 'auto'
  v.onloadeddata = () => {
    v.play().catch(() => {
      /* autoplay blocked until a gesture — the poster frame still draws */
    })
    onReady?.()
  }
  v.onerror = () => videoCache.delete(url)
  v.src = url
  videoCache.set(url, v)
  return null
}

// --- text layout -----------------------------------------------------------

/** Greedy word wrap. Explicit newlines are always honoured as hard breaks. */
function layoutLines(ctx, text, maxWidth) {
  const out = []
  for (const hard of text.split('\n')) {
    if (!hard.trim()) {
      out.push('')
      continue
    }
    let line = ''
    for (const word of hard.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word
      if (ctx.measureText(candidate).width <= maxWidth || !line) {
        line = candidate
      } else {
        out.push(line)
        line = word
      }
    }
    if (line) out.push(line)
  }
  return out
}

/**
 * Shrink the font until the wrapped text fits the text box. Caps at 12
 * iterations so a pathological slide can't stall the render loop.
 */
function fitText(ctx, text, theme, boxW, boxH, scale) {
  let size = theme.fontSize * scale
  const min = 12 * scale
  for (let i = 0; i < 12; i++) {
    ctx.font = `${theme.fontWeight} ${size}px ${theme.fontFamily}`
    const lines = layoutLines(ctx, text, boxW)
    const height = lines.length * size * theme.lineHeight
    if (height <= boxH || size <= min) return { lines, size }
    size = Math.max(min, size * Math.sqrt(boxH / height) * 0.98)
  }
  ctx.font = `${theme.fontWeight} ${size}px ${theme.fontFamily}`
  return { lines: layoutLines(ctx, text, boxW), size }
}

// --- background ------------------------------------------------------------

/** Draw an image cropped to fill (object-fit: cover), never distorted. */
function drawCover(ctx, img, w, h) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight)
  const dw = img.naturalWidth * scale
  const dh = img.naturalHeight * scale
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh)
}

function drawBackground(ctx, bg, w, h, onReady) {
  if (!bg || bg.kind === 'color') {
    ctx.fillStyle = bg?.value ?? '#000000'
    ctx.fillRect(0, 0, w, h)
    return
  }

  // Media is addressed by id and resolved to this session's object URL.
  // `bg.value` is the fallback for remote URLs and for plans saved before
  // media moved into IndexedDB — but a `blob:` value is always a dead
  // reference from an earlier session, so it counts as absent rather than
  // sending us down the image path to draw nothing.
  const stored = bg.mediaId ? urlFor(bg.mediaId) : null
  const legacy = bg.value?.startsWith('blob:') ? null : bg.value
  const src = stored ?? legacy ?? null

  // No bytes for this background — fall back to the flat colour rather than
  // projecting a black rectangle where a photo should be. The text still draws
  // on top, so a missing file never costs the congregation the words.
  if (!src) {
    ctx.fillStyle = bg.fallback ?? '#0b1020'
    ctx.fillRect(0, 0, w, h)
    return
  }

  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, w, h)

  if (bg.kind === 'image') {
    const img = getImage(src, onReady)
    if (img) drawCover(ctx, img, w, h)
  } else if (bg.kind === 'video') {
    // `bg.element` lets a caller supply its own element; otherwise the
    // renderer owns one, so every surface draws video through this path.
    const v = bg.element ?? getVideo(src, onReady)
    if (v && v.readyState >= 2 && v.videoWidth) {
      const scale = Math.max(w / v.videoWidth, h / v.videoHeight)
      const dw = v.videoWidth * scale
      const dh = v.videoHeight * scale
      ctx.drawImage(v, (w - dw) / 2, (h - dh) / 2, dw, dh)
    }
  }

  if (bg.dim) {
    ctx.fillStyle = `rgba(0,0,0,${bg.dim})`
    ctx.fillRect(0, 0, w, h)
  }
}

// --- main entry ------------------------------------------------------------

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} opts
 * @param {object|null} opts.slide    the slide to draw, or null for none
 * @param {object}      opts.theme
 * @param {object|null} opts.background overrides the theme background
 * @param {boolean}     opts.blackout  black screen, nothing else
 * @param {boolean}     opts.cleared   keep the background, hide the text
 * @param {string|null} opts.logoUrl   drawn centred when `showLogo`
 * @param {boolean}     opts.showLogo
 * @param {number|null} opts.countdownTo epoch ms; replaces the slide text
 * @param {function}    opts.onReady   called when a lazily loaded asset lands
 */
export function renderSlide(ctx, opts) {
  const {
    slide,
    theme,
    background,
    blackout = false,
    cleared = false,
    logoUrl = null,
    showLogo = false,
    countdownTo = null,
    onReady,
  } = opts

  const w = ctx.canvas.width
  const h = ctx.canvas.height
  const scale = w / DESIGN_W

  ctx.save()
  ctx.clearRect(0, 0, w, h)

  if (blackout) {
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, w, h)
    ctx.restore()
    return
  }

  drawBackground(ctx, background ?? theme.background, w, h, onReady)

  if (showLogo) {
    const img = getImage(logoUrl, onReady)
    if (img) {
      const max = Math.min(w, h) * 0.5
      const s = Math.min(max / img.naturalWidth, max / img.naturalHeight)
      const dw = img.naturalWidth * s
      const dh = img.naturalHeight * s
      ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh)
    }
    ctx.restore()
    return
  }

  const text = countdownTo != null ? formatCountdown(countdownTo) : cleared ? '' : (slide?.body ?? '')
  if (!text.trim()) {
    ctx.restore()
    return
  }

  const pad = theme.padding * scale
  const boxW = w - pad * 2
  const boxH = h - pad * 2
  const display = theme.uppercase ? text.toUpperCase() : text

  const { lines, size } = fitText(ctx, display, theme, boxW, boxH, scale)
  const lineH = size * theme.lineHeight
  const blockH = lines.length * lineH

  const x = theme.align === 'left' ? pad : theme.align === 'right' ? w - pad : w / 2
  let y
  if (theme.valign === 'top') y = pad
  else if (theme.valign === 'bottom') y = h - pad - blockH
  else y = (h - blockH) / 2

  ctx.textAlign = theme.align
  ctx.textBaseline = 'top'

  if (theme.shadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.65)'
    ctx.shadowBlur = size * 0.18
    ctx.shadowOffsetY = size * 0.05
  }

  lines.forEach((line, i) => {
    const ly = y + i * lineH + (lineH - size) / 2
    if (theme.outline) {
      ctx.lineWidth = Math.max(1, size * 0.045)
      ctx.strokeStyle = 'rgba(0,0,0,0.85)'
      ctx.lineJoin = 'round'
      ctx.strokeText(line, x, ly)
    }
    ctx.fillStyle = theme.color
    ctx.fillText(line, x, ly)
  })

  ctx.restore()
}

export function formatCountdown(target) {
  const ms = Math.max(0, target - Date.now())
  const total = Math.round(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
