import { useMemo, useState } from 'react'
import SlideCanvas from '../components/SlideCanvas'
import { useContent, DEFAULT_THEME } from '../store/useContent'
import { useLive, useCue } from '../store/useLive'
import { footerFor } from '../lib/render'

const themeFor = (themes, item) => themes.find((t) => t.id === item?.themeId) ?? themes[0] ?? DEFAULT_THEME

export default function LiveController() {
  const plan = useContent((s) => s.plan)
  const themes = useContent((s) => s.themes)
  const logoUrl = useContent((s) => s.logoUrl)

  const live = useLive()
  const { itemId, slideIndex, blackout, cleared, showLogo, countdownTo, message } = live

  const cuedId = useCue((s) => s.itemId)

  const item = useMemo(() => plan.items.find((i) => i.id === itemId) ?? null, [plan.items, itemId])
  const theme = themeFor(themes, item)
  const slide = item?.slides[slideIndex] ?? null

  // The grid shows the cued item; it is only live once a slide is clicked.
  const shown = plan.items.find((i) => i.id === cuedId) ?? item
  const shownTheme = themeFor(themes, shown)
  const shownIsLive = shown != null && shown.id === itemId

  // Next is what the Next key will put up: the following slide, or the first
  // slide of the following item — drawn in *that* item's theme and background.
  const next = useMemo(() => {
    if (!item) return null
    if (slideIndex + 1 < item.slides.length) return { item, slide: item.slides[slideIndex + 1] }
    const i = plan.items.findIndex((it) => it.id === item.id)
    const nextItem = plan.items[i + 1]
    return nextItem ? { item: nextItem, slide: nextItem.slides[0] } : null
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
            footer={footerFor(item, slide, theme)}
            animate
            fade
            className="preview-live"
          />
          <p className="live-caption muted small">
            {item ? (
              <>
                <strong>{item.title}</strong> · slide {slideIndex + 1} of {item.slides.length}
                {item.autoAdvance > 0 && <> · auto-advancing every {item.autoAdvance}s</>}
              </>
            ) : (
              'Nothing on screen'
            )}
          </p>
        </figure>

        <figure>
          <figcaption>Next</figcaption>
          <SlideCanvas
            slide={next?.slide ?? null}
            theme={themeFor(themes, next?.item)}
            background={next?.item.background}
            footer={footerFor(next?.item, next?.slide, themeFor(themes, next?.item))}
            className="preview-next"
          />
          <p className="live-caption muted small">
            {next
              ? next.item.id === item?.id
                ? next.slide.label || 'Next slide'
                : `→ ${next.item.title}`
              : 'End of service'}
          </p>
        </figure>
      </section>

      <Transport />

      <section className="slide-strip">
        <h3 className="strip-head">
          <span>
            {shown ? shown.title : 'Nothing selected'}
            {shown?.subtitle && <span className="muted small"> — {shown.subtitle}</span>}
          </span>
          {shown && !shownIsLive && (
            <>
              <em className="badge cue">Cued — not on screen</em>
              <button className="btn btn-primary btn-sm" onClick={() => live.goTo(shown.id, 0)}>
                Go live <kbd>Enter</kbd>
              </button>
            </>
          )}
        </h3>
        <div className="thumb-grid">
          {shown?.slides.map((sl, i) => (
            <button
              key={sl.id}
              className={`thumb${shownIsLive && i === slideIndex ? ' current' : ''}`}
              onClick={() => live.goTo(shown.id, i)}
            >
              <SlideCanvas
                slide={sl}
                theme={shownTheme}
                background={shown.background}
                footer={footerFor(shown, sl, shownTheme)}
              />
              <span className="thumb-label">
                {i < 9 && <kbd>{i + 1}</kbd>}
                {sl.label || `Slide ${i + 1}`}
              </span>
            </button>
          ))}
        </div>
        {!shown && <p className="empty">Pick an item from the service plan on the left.</p>}
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
