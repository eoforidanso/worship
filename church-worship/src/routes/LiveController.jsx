import { useMemo, useState } from 'react'
import SlideCanvas from '../components/SlideCanvas'
import { useContent, DEFAULT_THEME } from '../store/useContent'
import { useLive } from '../store/useLive'

export default function LiveController() {
  const plan = useContent((s) => s.plan)
  const themes = useContent((s) => s.themes)
  const logoUrl = useContent((s) => s.logoUrl)

  const live = useLive()
  const { itemId, slideIndex, blackout, cleared, showLogo, countdownTo, message } = live

  const item = useMemo(() => plan.items.find((i) => i.id === itemId) ?? null, [plan.items, itemId])
  const theme = themes.find((t) => t.id === item?.themeId) ?? themes[0] ?? DEFAULT_THEME
  const slide = item?.slides[slideIndex] ?? null

  const nextSlide = useMemo(() => {
    if (!item) return null
    if (slideIndex + 1 < item.slides.length) return item.slides[slideIndex + 1]
    const i = plan.items.findIndex((it) => it.id === item.id)
    return plan.items[i + 1]?.slides[0] ?? null
  }, [item, slideIndex, plan.items])

  return (
    <div className="live">
      <section className="live-previews">
        <figure>
          <figcaption>
            Live
            {blackout && <em className="badge danger">Blackout</em>}
            {cleared && <em className="badge">Cleared</em>}
            {showLogo && <em className="badge">Logo</em>}
          </figcaption>
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
            className="preview-live"
          />
        </figure>

        <figure>
          <figcaption>Next</figcaption>
          <SlideCanvas slide={nextSlide} theme={theme} background={item?.background} className="preview-next" />
        </figure>
      </section>

      <Transport />

      <section className="slide-strip">
        <h3>
          {item ? item.title : 'Nothing selected'}
          {item?.subtitle && <span className="muted small"> — {item.subtitle}</span>}
        </h3>
        <div className="thumb-grid">
          {item?.slides.map((sl, i) => (
            <button
              key={sl.id}
              className={`thumb${i === slideIndex ? ' current' : ''}`}
              onClick={() => live.goTo(item.id, i)}
            >
              <SlideCanvas slide={sl} theme={theme} background={item.background} />
              <span className="thumb-label">{sl.label || `Slide ${i + 1}`}</span>
            </button>
          ))}
        </div>
        {!item && <p className="empty">Pick an item from the service plan on the left.</p>}
      </section>
    </div>
  )
}

function Transport() {
  const live = useLive()
  const [seconds, setSeconds] = useState(300)
  const [draft, setDraft] = useState(live.message)

  return (
    <section className="transport">
      <div className="transport-group">
        <button className="btn btn-lg" onClick={live.prev}>
          ◀ Previous
        </button>
        <button className="btn btn-lg btn-primary" onClick={live.next}>
          Next ▶
        </button>
      </div>

      <div className="transport-group">
        <button className={`btn${live.blackout ? ' on' : ''}`} onClick={live.toggleBlackout}>
          Blackout <kbd>B</kbd>
        </button>
        <button className={`btn${live.cleared ? ' on' : ''}`} onClick={live.toggleClear}>
          Clear text <kbd>C</kbd>
        </button>
        <button className={`btn${live.showLogo ? ' on' : ''}`} onClick={live.toggleLogo}>
          Logo <kbd>L</kbd>
        </button>
      </div>

      <div className="transport-group">
        <label className="field inline">
          <span>Countdown</span>
          <input
            type="number"
            min="10"
            step="10"
            value={seconds}
            onChange={(e) => setSeconds(Number(e.target.value))}
          />
        </label>
        <button className="btn" onClick={() => live.startCountdown(seconds)}>
          Start
        </button>
        <button className="btn" onClick={live.stopCountdown} disabled={live.countdownTo == null}>
          Stop
        </button>
      </div>

      <div className="transport-group grow">
        <input
          className="stage-msg"
          placeholder="Message to the stage display…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && live.setMessage(draft)}
        />
        <button className="btn" onClick={() => live.setMessage(draft)}>
          Send
        </button>
        <button
          className="btn"
          onClick={() => {
            setDraft('')
            live.setMessage('')
          }}
        >
          Clear
        </button>
      </div>
    </section>
  )
}
