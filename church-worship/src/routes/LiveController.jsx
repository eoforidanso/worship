import { useEffect, useMemo, useState } from 'react'
import SlideCanvas from '../components/SlideCanvas'
import { useContent, DEFAULT_THEME } from '../store/useContent'
import { useLive, useCue } from '../store/useLive'
import { footerFor } from '../lib/render'
import { remotePin, newRemotePin } from '../lib/remote'

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
    // Before the Mass starts, Next puts up the first item.
    if (!item) return plan.items[0] ? { item: plan.items[0], slide: plan.items[0].slides[0] } : null
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
              : plan.items.length
                ? 'End of service'
                : 'The plan is empty'}
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

/**
 * How to connect a phone: the address on this network, a QR code that also
 * carries the PIN, and the PIN itself. Needs the relay (npm start).
 */
function PhoneRemote() {
  const [open, setOpen] = useState(false)
  const [info, setInfo] = useState(null) // { url, qr } | { error }
  const [pin, setPin] = useState(() => remotePin())

  useEffect(() => {
    if (!open) return
    let live = true
    ;(async () => {
      if (location.protocol === 'https:') {
        return live && setInfo({ error: 'hosted' })
      }
      try {
        const res = await fetch(`http://${location.hostname}:8080/info`)
        const { addresses } = await res.json()
        const host = addresses[0]
        if (!host) return live && setInfo({ error: 'nonet' })
        const port = location.port ? `:${location.port}` : ''
        const base = `http://${host}${port}${import.meta.env.BASE_URL}remote`.replace(/([^:])\/{2,}/g, '$1/')
        const QR = await import('qrcode')
        const qr = await QR.toDataURL(`${base}#pin=${pin}`, { margin: 1, width: 220 })
        if (live) setInfo({ url: base, qr, others: addresses.slice(1) })
      } catch {
        if (live) setInfo({ error: 'relay' })
      }
    })()
    return () => {
      live = false
    }
  }, [open, pin])

  return (
    <span className="install">
      <button className={`btn${open ? ' on' : ''}`} onClick={() => setOpen((v) => !v)}>
        📱 Phone remote
      </button>
      {open && (
        <span className="install-help remote-help" role="dialog">
          <strong>Drive the projector from a phone</strong>
          {!info && <span className="muted">Looking for the relay…</span>}
          {info?.error === 'hosted' && (
            <span>
              The phone remote works when the app runs on this laptop: open a terminal in the app folder and
              run <code>npm start</code>, then use the address it prints.
            </span>
          )}
          {info?.error === 'relay' && (
            <span>
              Start the relay: in the app folder run <code>npm start</code> (instead of{' '}
              <code>npm run dev</code>), then open this again.
            </span>
          )}
          {info?.error === 'nonet' && (
            <span>This laptop isn’t on a network. Join the church wifi first.</span>
          )}
          {info?.url && (
            <>
              <img src={info.qr} alt="QR code for the phone remote" className="remote-qr" />
              <span>
                Scan with the phone’s camera, or open <code>{info.url}</code>
              </span>
              <span>
                PIN <strong className="remote-pin-show">{pin}</strong>{' '}
                <button className="btn btn-ghost btn-sm" onClick={() => setPin(newRemotePin())}>
                  New PIN
                </button>
              </span>
              <span className="muted small">The phone must be on the same wifi as this laptop.</span>
            </>
          )}
          <button className="btn btn-sm" onClick={() => setOpen(false)}>
            Close
          </button>
        </span>
      )}
    </span>
  )
}

function Transport() {
  const live = useLive()
  const [seconds, setSeconds] = useState(300)
  const [draft, setDraft] = useState(live.message)

  return (
    <section className="transport">
      <div className="transport-group">
        <button className="btn btn-lg transport-prev" onClick={live.prev}>
          ◀ Previous
        </button>
        <button className="btn btn-lg btn-primary transport-next" onClick={live.next}>
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
        <PhoneRemote />
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
