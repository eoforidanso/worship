import { useEffect, useRef } from 'react'
import SlideCanvas from '../components/SlideCanvas'
import { useContent, DEFAULT_THEME } from '../store/useContent'
import { useLive } from '../store/useLive'
import { useContentSync } from '../lib/useContentSync'

/**
 * The projector surface. Open it in a second window and drag it onto the
 * output display, then double-click for fullscreen.
 *
 * It renders from the same `renderSlide` the operator previews use, so there is
 * no second layout path that could drift.
 */
export default function Output() {
  useContentSync()
  const ref = useRef(null)

  const plan = useContent((s) => s.plan)
  const themes = useContent((s) => s.themes)
  const logoUrl = useContent((s) => s.logoUrl)

  const { itemId, slideIndex, blackout, cleared, showLogo, countdownTo } = useLive()

  const item = plan.items.find((i) => i.id === itemId) ?? null
  const theme = themes.find((t) => t.id === item?.themeId) ?? themes[0] ?? DEFAULT_THEME
  const slide = item?.slides[slideIndex] ?? null

  useEffect(() => {
    document.title = 'Output — Church Worship'
    document.body.classList.add('bare')
    return () => document.body.classList.remove('bare')
  }, [])

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen()
    else ref.current?.requestFullscreen?.()
  }

  return (
    <div className="output" ref={ref} onDoubleClick={toggleFullscreen} title="Double-click for fullscreen">
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
          animate
        />
      </div>
    </div>
  )
}
