import { useEffect, useRef } from 'react'
import { renderSlide } from '../lib/render'

/**
 * A 16:9 canvas that draws one slide. Used for planner thumbnails, the
 * composer preview, the projector output and the stage display.
 *
 * `animate` turns on a requestAnimationFrame loop — needed for countdowns and
 * video backgrounds. Static surfaces (thumbnails) leave it off and redraw only
 * when their props change, which keeps a 30-thumbnail planner cheap.
 */
export default function SlideCanvas({
  slide,
  theme,
  background,
  blackout = false,
  cleared = false,
  logoUrl = null,
  showLogo = false,
  countdownTo = null,
  animate = false,
  className = '',
  style,
}) {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  // Props are read through a ref so the rAF loop never needs re-subscribing.
  const propsRef = useRef(null)
  propsRef.current = { slide, theme, background, blackout, cleared, logoUrl, showLogo, countdownTo }

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    const ctx = canvas.getContext('2d')

    let raf = 0
    let disposed = false

    const draw = () => {
      if (disposed) return
      renderSlide(ctx, { ...propsRef.current, onReady: draw })
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
    const draw = () => renderSlide(ctx, { ...propsRef.current, onReady: draw })
    draw()
  }, [animate, slide, theme, background, blackout, cleared, logoUrl, showLogo, countdownTo])

  return (
    <div ref={wrapRef} className={`slide-canvas ${className}`} style={style}>
      <canvas ref={canvasRef} />
    </div>
  )
}
