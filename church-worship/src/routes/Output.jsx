import { useEffect, useRef, useState } from 'react'
import SlideCanvas from '../components/SlideCanvas'
import { useContent, DEFAULT_THEME } from '../store/useContent'
import { useLive } from '../store/useLive'
import { useContentSync } from '../lib/useContentSync'
import { useLiturgicalColour } from '../lib/useLiturgicalColour'
import { footerFor } from '../lib/render'

/**
 * The projector surface. Open it in a second window and drag it onto the
 * output display, then double-click for fullscreen.
 *
 * It renders from the same `renderSlide` the operator previews use, so there is
 * no second layout path that could drift.
 */
export default function Output() {
  useContentSync()
  useLiturgicalColour()
  const ref = useRef(null)

  const plan = useContent((s) => s.plan)
  const themes = useContent((s) => s.themes)
  const logoUrl = useContent((s) => s.logoUrl)

  const { itemId, slideIndex, blackout, cleared, showLogo, countdownTo } = useLive()

  const item = plan.items.find((i) => i.id === itemId) ?? null
  const theme = themes.find((t) => t.id === item?.themeId) ?? themes[0] ?? DEFAULT_THEME
  const slide = item?.slides[slideIndex] ?? null

  useEffect(() => {
    document.title = 'Output — Ambo'
    document.body.classList.add('bare')
    return () => document.body.classList.remove('bare')
  }, [])

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen()
    else ref.current?.requestFullscreen?.()
  }

  // F toggles full screen too. The hint shows only while someone moves the
  // mouse over this window — the congregation never sees it otherwise.
  const [hint, setHint] = useState(false)
  const [full, setFull] = useState(!!document.fullscreenElement)
  useEffect(() => {
    let t
    const onMove = () => {
      setHint(true)
      clearTimeout(t)
      t = setTimeout(() => setHint(false), 2500)
    }
    const onKey = (e) => {
      if (e.key === 'f' || e.key === 'F') toggleFullscreen()
    }
    const onFs = () => setFull(!!document.fullscreenElement)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('keydown', onKey)
    document.addEventListener('fullscreenchange', onFs)
    return () => {
      clearTimeout(t)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('fullscreenchange', onFs)
    }
  }, [])

  return (
    <div className="output" ref={ref} onDoubleClick={toggleFullscreen}>
      {hint && !full && <div className="output-hint">Double-click or press F for full screen</div>}
      <div className="output-stage">
        <SlideCanvas
          slide={slide}
          theme={theme}
          background={item?.background}
          blackout={blackout}
          cleared={cleared}
          showLogo={showLogo}
          logoUrl={logoUrl}
          countdownTo={countdownTo}
          footer={footerFor(item, slide, theme)}
          animate
          fade
        />
      </div>
    </div>
  )
}
