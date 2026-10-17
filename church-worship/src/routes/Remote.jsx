import { useEffect, useState } from 'react'
import { publish, subscribe, subscribeStatus } from '../lib/broadcast'

/**
 * The phone remote. Opened on a phone on the church wifi (scan the QR code
 * on the laptop), it drives the projector: big buttons for Next, Previous
 * and Blackout, and a glimpse of what is on screen and what comes next.
 *
 * It holds no service of its own — everything comes from the operator laptop
 * through the relay — so it works on any phone with nothing installed.
 */
export default function Remote() {
  const [conn, setConn] = useState('connecting')
  const [state, setState] = useState(null)
  // Scanning the laptop's QR code pairs at once: the PIN rides in the link.
  const [pin, setPin] = useState(() => {
    const fromLink = new URLSearchParams(location.hash.slice(1)).get('pin')
    if (/^\d{4}$/.test(fromLink ?? '')) {
      savePin(fromLink)
      history.replaceState(null, '', location.pathname)
      return fromLink
    }
    return readPin()
  })
  const [draft, setDraft] = useState('')

  useEffect(() => {
    document.title = 'Remote — Church Worship'
    document.body.classList.add('bare')
    const offStatus = subscribeStatus((s) => {
      setConn(s)
      if (s === 'online') publish('hello', {}) // ask the laptop for the current slide
    })
    const off = subscribe((msg) => msg.type === 'status' && setState(msg.payload))
    return () => {
      offStatus()
      off()
      document.body.classList.remove('bare')
    }
  }, [])

  const send = (action) => {
    navigator.vibrate?.(15)
    publish('command', { action, pin })
  }

  if (!pin) {
    return (
      <div className="remote">
        <h1>Church Worship remote</h1>
        <p>Enter the 4-digit PIN shown on the laptop (Live → Phone remote).</p>
        <input
          className="remote-pin"
          inputMode="numeric"
          maxLength={4}
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value.replace(/\D/g, ''))}
        />
        <button
          className="remote-btn primary"
          disabled={draft.length !== 4}
          onClick={() => {
            savePin(draft)
            setPin(draft)
          }}
        >
          Connect
        </button>
      </div>
    )
  }

  return (
    <div className="remote">
      <header className="remote-head">
        <span className={`conn conn-${conn}`}>{conn === 'online' ? 'Connected' : 'Connecting…'}</span>
        <button
          className="remote-link"
          onClick={() => {
            savePin('')
            setPin('')
          }}
        >
          Change PIN
        </button>
      </header>

      {state?.refused && <p className="remote-warn">Wrong PIN — check the number on the laptop.</p>}
      {conn !== 'online' && (
        <p className="remote-warn">
          Can’t reach the laptop. It must be running the app with the relay (npm start), on the same wifi.
        </p>
      )}

      <section className="remote-now">
        <span className="remote-label">
          On screen{state?.position ? ` · ${state.position}` : ''}
          {state?.blackout ? ' · BLACKOUT' : state?.logo ? ' · LOGO' : state?.cleared ? ' · TEXT HIDDEN' : ''}
        </span>
        <strong>{state?.title || 'Nothing yet'}</strong>
        {state?.text && <p>{state.text}</p>}
        {state?.next && <span className="remote-label">Next: {state.next}</span>}
      </section>

      <div className="remote-pad">
        <button className="remote-btn" onClick={() => send('prev')}>
          ◀ Previous
        </button>
        <button className="remote-btn primary big" onClick={() => send('next')}>
          Next ▶
        </button>
      </div>
      <div className="remote-pad three">
        <button className={`remote-btn${state?.blackout ? ' on' : ''}`} onClick={() => send('blackout')}>
          Blackout
        </button>
        <button className={`remote-btn${state?.cleared ? ' on' : ''}`} onClick={() => send('clear')}>
          Hide text
        </button>
        <button className={`remote-btn${state?.logo ? ' on' : ''}`} onClick={() => send('logo')}>
          Logo
        </button>
      </div>
    </div>
  )
}

function readPin() {
  try {
    return localStorage.getItem('worship-remote-pair') ?? ''
  } catch {
    return ''
  }
}

function savePin(pin) {
  try {
    localStorage.setItem('worship-remote-pair', pin)
  } catch {
    /* the PIN is asked again next time */
  }
}
