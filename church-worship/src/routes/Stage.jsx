import { useEffect, useMemo, useState } from 'react'
import { useContent } from '../store/useContent'
import { useLive } from '../store/useLive'
import { useContentSync } from '../lib/useContentSync'
import { useLiturgicalColour } from '../lib/useLiturgicalColour'
import { formatCountdown } from '../lib/render'

/**
 * The confidence monitor the worship team sees. Plain text rather than the
 * rendered canvas — legibility across a dark room beats fidelity here, and the
 * team needs the *next* line more than they need the theme.
 */
export default function Stage() {
  useContentSync()
  useLiturgicalColour()
  const plan = useContent((s) => s.plan)
  const { itemId, slideIndex, blackout, cleared, message, countdownTo } = useLive()
  const now = useClock()

  const item = plan.items.find((i) => i.id === itemId) ?? null
  const slide = item?.slides[slideIndex] ?? null

  const next = useMemo(() => {
    if (!item) {
      const first = plan.items[0]
      return first ? { ...first.slides[0], label: `Mass begins with ${first.title}` } : null
    }
    if (slideIndex + 1 < item.slides.length) return item.slides[slideIndex + 1]
    const i = plan.items.findIndex((it) => it.id === item.id)
    const nextItem = plan.items[i + 1]
    return nextItem ? { ...nextItem.slides[0], label: `→ ${nextItem.title}` } : null
  }, [item, slideIndex, plan.items])

  useEffect(() => {
    document.title = 'Stage — Ambo'
    document.body.classList.add('bare')
    return () => document.body.classList.remove('bare')
  }, [])

  return (
    <div className="stage">
      <header className="stage-head">
        <span className="stage-item">{item ? item.title : '—'}</span>
        {item && (
          <span className="stage-pos">
            {slideIndex + 1} / {item.slides.length}
          </span>
        )}
        <span className="stage-flags">
          {blackout && <em className="badge danger">Blackout</em>}
          {cleared && <em className="badge">Cleared</em>}
        </span>
        <span className="stage-clock">
          {countdownTo != null && <strong className="stage-timer">{formatCountdown(countdownTo)}</strong>}
          {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </header>

      <div className="stage-current">
        {slide?.label && <span className="stage-label">{slide.label}</span>}
        <p style={{ fontSize: stageSize(slide?.body) }}>
          {slide?.body || (slide?.background ? '(picture)' : '—')}
        </p>
      </div>

      <div className="stage-next">
        <span className="stage-label">Next{next?.label ? ` · ${next.label}` : ''}</span>
        <p>{next ? next.body || '…' : 'End of plan'}</p>
      </div>

      {(message || item?.notes) && (
        <footer className="stage-foot">
          {message && <p className="stage-message">{message}</p>}
          {item?.notes && <p className="stage-notes">{item.notes}</p>}
        </footer>
      )}
    </div>
  )
}

/** Lyrics stay big; a whole reading on one slide steps down so it still fits. */
function stageSize(text = '') {
  const n = text.split(/\s+/).filter(Boolean).length
  if (n > 160) return '2.9vh'
  if (n > 100) return '3.5vh'
  if (n > 60) return '4.3vh'
  if (n > 30) return '5.6vh'
  return '7vh'
}

function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 500)
    return () => clearInterval(id)
  }, [])
  return now
}
