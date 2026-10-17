import { useEffect, useRef } from 'react'
import { renderSlide } from '../lib/render'
import { useRedraw } from '../lib/redraw'

/**
 * A 16:9 canvas that draws one slide. Used for planner thumbnails, the
 * composer preview, the projector output and the stage display.
 *
 * `animate` turns on a requestAnimationFrame loop — needed for countdowns and
 * video backgrounds. Static surfaces (thumbnails) leave it off and redraw only
 * when their props change, which keeps a 30-thumbnail planner cheap.
 *
 * `fade` (animated surfaces only) cross-dissolves from the last frame to the
 * new one whenever what's on screen changes — slide, blackout, clear, logo.
 * A hard cut on a projector reads as a glitch; a short dissolve reads as
 * intent.
 */

const FADE_MS = 350

/**
 * A slide that fails to draw (a corrupt picture, a bad value) shows black —
 * never a half-drawn frame — and is reported once, not sixty times a second.
 */
let lastFault = ''
function safeRender(ctx, opts) {
  try {
    renderSlide(ctx, opts)
    return true
  } catch (err) {
    const msg = String(err?.message ?? err)
    if (msg !== lastFault) console.error('[slide]', err)
    lastFault = msg
    ctx.restore?.()
    ctx.setTransform?.(1, 0, 0, 1, 0, 0)
    ctx.globalAlpha = 1
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    return false
  }
}

const frameKey = (p) =>
  [
    // Slide id, not its text: an edit to the live slide should land at once,
    // not dissolve on every keystroke.
    p.slide?.id ?? '',
    p.blackout,
    p.cleared,
    p.showLogo,
    p.slide?.background?.mediaId ?? p.background?.mediaId ?? p.background?.value ?? '',
    p.theme?.id ?? '',
    p.theme?.liturgical ? `${p.litColour}:${p.litSeason}` : '',
  ].join('|')

export default function SlideCanvas({
  slide,
  theme,
  background,
  blackout = false,
  cleared = false,
  logoUrl = null,
  showLogo = false,
  countdownTo = null,
  footer = '',
  animate = false,
  fade = false,
  className = '',
  style,
}) {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  // Props are read through a ref so the rAF loop never needs re-subscribing.
  const propsRef = useRef(null)
  const { tick, litColour, litSeason } = useRedraw()
  propsRef.current = {
    slide,
    theme,
    background,
    blackout,
    cleared,
    logoUrl,
    showLogo,
    countdownTo,
    footer,
    litColour,
    litSeason,
  }
  const fadeRef = useRef(fade)
  fadeRef.current = fade

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    const ctx = canvas.getContext('2d')

    let raf = 0
    let disposed = false

    // Cross-fade state: a snapshot of the outgoing frame, faded out on top.
    const snap = document.createElement('canvas')
    let lastKey = null
    let fadeStart = 0

    const draw = () => {
      if (disposed) return
      const key = frameKey(propsRef.current)
      if (animate && fadeRef.current && lastKey !== null && key !== lastKey && canvas.width > 1) {
        snap.width = canvas.width
        snap.height = canvas.height
        snap.getContext('2d').drawImage(canvas, 0, 0)
        fadeStart = performance.now()
      }
      lastKey = key
      if (!safeRender(ctx, { ...propsRef.current, onReady: draw })) return
      if (fadeStart) {
        const t = (performance.now() - fadeStart) / FADE_MS
        if (t >= 1 || snap.width !== canvas.width) {
          fadeStart = 0
        } else {
          ctx.save()
          ctx.globalAlpha = 1 - t
          ctx.drawImage(snap, 0, 0)
          ctx.restore()
        }
      }
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = wrap.clientWidth
      const h = Math.round((w * 9) / 16)
      const pw = Math.max(1, Math.round(w * dpr))
      const ph = Math.max(1, Math.round(h * dpr))
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw
        canvas.height = ph
      }
      canvas.style.height = `${h}px`
      draw()
    }

    const ro = new ResizeObserver(resize)
    ro.observe(wrap)
    resize()

    if (animate) {
      const loop = () => {
        draw()
        raf = requestAnimationFrame(loop)
      }
      raf = requestAnimationFrame(loop)
    }

    return () => {
      disposed = true
      ro.disconnect()
      if (raf) cancelAnimationFrame(raf)
    }
  }, [animate])

  // Static surfaces still need a redraw when their content changes.
  useEffect(() => {
    if (animate) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const draw = () => safeRender(ctx, { ...propsRef.current, onReady: draw })
    draw()
  }, [
    animate,
    slide,
    theme,
    background,
    blackout,
    cleared,
    logoUrl,
    showLogo,
    countdownTo,
    footer,
    tick,
    litColour,
    litSeason,
  ])

  return (
    <div ref={wrapRef} className={`slide-canvas ${className}`} style={style}>
      <canvas ref={canvasRef} />
    </div>
  )
}
