import { useEffect, useMemo, useState } from 'react'
import SlideCanvas from './SlideCanvas'
import { useContent, DEFAULT_THEME } from '../store/useContent'
import { useLive, useCue } from '../store/useLive'
import { footerFor } from '../lib/render'

/**
 * What the projector will show — always beside the planning tabs.
 *
 * It follows the item selected in the plan: the slide exactly as the Output
 * window will draw it, ◀ ▶ through its slides, and Go live. When nothing is
 * selected it shows what is on screen now. No switching tabs to find out
 * what something will look like.
 */
export default function PreviewDock({ onClose }) {
  const items = useContent((s) => s.plan.items)
  const themes = useContent((s) => s.themes)
  const logoUrl = useContent((s) => s.logoUrl)
  const cuedId = useCue((s) => s.itemId)
  const live = useLive()

  const item = useMemo(
    () => items.find((i) => i.id === cuedId) ?? items.find((i) => i.id === live.itemId) ?? null,
    [items, cuedId, live.itemId],
  )
  const isLive = item && item.id === live.itemId
  const [index, setIndex] = useState(0)
  useEffect(() => setIndex(isLive ? live.slideIndex : 0), [item?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isLive) setIndex(live.slideIndex)
  }, [isLive, live.slideIndex])

  const theme = themes.find((t) => t.id === item?.themeId) ?? themes[0] ?? DEFAULT_THEME
  const count = item?.slides.length ?? 0
  const i = Math.min(index, Math.max(0, count - 1))
  const slide = item?.slides[i] ?? null

  return (
    <aside className="dock">
      <div className="dock-head">
        <h3>{isLive ? 'On screen now' : 'Preview'}</h3>
        <button className="icon-btn" onClick={onClose} title="Hide the preview">
          ✕
        </button>
      </div>
      {item ? (
        <>
          <SlideCanvas
            slide={slide}
            theme={theme}
            background={item.background}
            footer={footerFor(item, slide, theme)}
            logoUrl={logoUrl}
            className={isLive ? 'preview-live' : ''}
          />
          <div className="dock-title">
            <strong>{item.title}</strong>
            <span className="muted small">
              {count > 1 ? `Slide ${i + 1} of ${count}` : '1 slide'}
              {item.subtitle ? ` · ${item.subtitle}` : ''}
            </span>
          </div>
          <div className="row dock-nav">
            <button className="btn btn-sm" disabled={i === 0} onClick={() => setIndex(i - 1)}>
              ◀
            </button>
            <button className="btn btn-sm" disabled={i >= count - 1} onClick={() => setIndex(i + 1)}>
              ▶
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => live.goTo(item.id, i)}>
              {isLive && live.slideIndex === i ? 'On screen' : 'Go live'}
            </button>
          </div>
          {count > 1 && (
            <ol className="dock-strip">
              {item.slides.map((sl, n) => (
                <li key={sl.id}>
                  <button
                    className={n === i ? 'on' : ''}
                    onClick={() => setIndex(n)}
                    title={sl.label || `Slide ${n + 1}`}
                  >
                    <SlideCanvas slide={sl} theme={theme} background={item.background} />
                  </button>
                </li>
              ))}
            </ol>
          )}
        </>
      ) : (
        <p className="muted small">Select an item in the plan to see it exactly as the projector will.</p>
      )}
    </aside>
  )
}
