import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import ServicePlanner from '../components/ServicePlanner'
import { useLive, useCue } from '../store/useLive'
import { useContent } from '../store/useContent'
import { subscribeStatus } from '../lib/broadcast'
import { subscribePwa, applyUpdate, dismissOfflineReady, promptInstall, installHelp } from '../lib/pwa'
import { describeDay } from '../lib/lectionary'

const TABS = [
  { to: '/live', label: 'Live' },
  { to: '/readings', label: 'Readings' },
  { to: '/prayers', label: 'Prayers' },
  { to: '/announcements', label: 'Announcements' },
  { to: '/library', label: 'Services' },
  { to: '/compose', label: 'Compose' },
  { to: '/media', label: 'Media' },
  { to: '/themes', label: 'Themes' },
]

export default function Shell() {
  const navigate = useNavigate()
  const planTitle = useContent((s) => s.plan.title)
  const setPlanTitle = useContent((s) => s.setPlanTitle)
  const planDate = useContent((s) => s.plan.date)
  const planId = useContent((s) => s.plan.id)
  const setPlanDate = useContent((s) => s.setPlanDate)

  useGlobalShortcuts()
  useAutoAdvance()
  const status = useConnectionStatus()

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <input
            className="plan-title"
            value={planTitle}
            onChange={(e) => setPlanTitle(e.target.value)}
            aria-label="Service title"
          />
          <input
            className="plan-date"
            type="date"
            value={planDate ?? ''}
            onChange={(e) => setPlanDate(e.target.value)}
            aria-label="Service date"
          />
          <LiturgicalDay date={planDate} planId={planId} onOpen={() => navigate('/readings')} />
        </div>

        <nav className="tabs">
          {TABS.map((t) => (
            <NavLink key={t.to} to={t.to} className={({ isActive }) => (isActive ? 'tab active' : 'tab')}>
              {t.label}
            </NavLink>
          ))}
        </nav>

        <div className="topbar-right">
          <span className={`conn conn-${status}`} title={`Sync: ${status}`}>
            {status === 'online' ? 'Network sync' : 'Local only'}
          </span>
          <InstallButton />
          <button className="btn" onClick={() => openWindow('/stage', 'stage')}>
            Stage
          </button>
          <button className="btn btn-primary" onClick={() => openWindow('/output', 'output')}>
            Output
          </button>
        </div>
      </header>

      <OfflineNotice />

      <div className="body">
        <aside className="rail">
          <ServicePlanner onEdit={(id) => navigate(`/compose/${id}`)} />
        </aside>
        <main className="main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

/** What the Church celebrates on the service date, from the built-in calendar. */
function LiturgicalDay({ date, planId, onOpen }) {
  const [info, setInfo] = useState(null)
  const setAutoTitle = useContent((s) => s.setAutoTitle)
  useEffect(() => {
    let live = true
    setInfo(null)
    if (date)
      describeDay(date)
        .then((d) => {
          if (!live) return
          setInfo(d)
          if (d) setAutoTitle(d.name) // only while the service hasn't been named by hand
        })
        .catch(() => {})
    return () => {
      live = false
    }
  }, [date, planId, setAutoTitle]) // a new service on the same date gets named too
  if (!info) return null
  return (
    <button className="lit-day" onClick={onOpen} title={`${info.name} · ${info.cycle} — open the readings`}>
      <span className={`lit-dot lit-${info.color}`} />
      <span className="lit-day-name">{info.name}</span>
      <span className="muted">{info.cycle}</span>
    </button>
  )
}

/**
 * Install the app on this computer: its own window and dock/Start-menu icon,
 * opening straight onto Live, working with no network. One click where the
 * browser allows it; otherwise the steps for this browser.
 */
function InstallButton() {
  const [{ canInstall, installed }, setPwa] = useState({ canInstall: false, installed: false })
  const [help, setHelp] = useState(false)
  useEffect(() => subscribePwa(setPwa), [])
  if (installed) return null
  return (
    <span className="install">
      <button
        className="btn"
        title="Install as an app on this computer"
        onClick={() => (canInstall ? promptInstall() : setHelp((v) => !v))}
      >
        ⤓ Install app
      </button>
      {help && (
        <span className="install-help" role="dialog">
          <strong>Install Church Worship</strong>
          <span>{installHelp()}</span>
          <span className="muted small">
            Installed, it opens in its own window from the dock or Start menu, straight onto Live, and runs
            with no internet.
          </span>
          <button className="btn btn-sm" onClick={() => setHelp(false)}>
            OK
          </button>
        </span>
      )}
    </span>
  )
}

function openWindow(path, name) {
  // These bypass the router, so they need the deploy base themselves.
  window.open(`${import.meta.env.BASE_URL}${path}`.replace(/\/{2,}/g, '/'), name, 'width=1280,height=720')
}

/**
 * Operator-only chrome: confirmation that the app is cached, and an update
 * that waits to be asked for. Neither ever appears on /output or /stage.
 */
function OfflineNotice() {
  const [{ needRefresh, offlineReady }, setPwa] = useState({
    needRefresh: false,
    offlineReady: false,
  })
  useEffect(() => subscribePwa(setPwa), [])

  if (needRefresh) {
    return (
      <div className="notice notice-update" role="status">
        <span>A newer version is ready. It won't load until you say so.</span>
        <button className="btn btn-primary" onClick={applyUpdate}>
          Reload now
        </button>
      </div>
    )
  }

  if (offlineReady) {
    return (
      <div className="notice" role="status">
        <span>Ready to work offline — this service will run with the network down.</span>
        <button className="btn" onClick={dismissOfflineReady}>
          Dismiss
        </button>
      </div>
    )
  }

  return null
}

function useConnectionStatus() {
  const [status, setStatus] = useState('offline')
  useEffect(() => subscribeStatus(setStatus), [])
  return status
}

/**
 * Items with `autoAdvance` set (announcements, a pre-service loop) step
 * through their slides on a timer and wrap round, never leaving the item. It
 * runs here in the shell, not on the Live tab, so switching tabs mid-loop
 * doesn't stop it; it pauses while the screen is blacked out, cleared or on
 * the logo.
 */
function useAutoAdvance() {
  const { itemId, slideIndex, blackout, cleared, showLogo } = useLive()
  const item = useContent((s) => s.plan.items.find((it) => it.id === itemId) ?? null)
  const seconds = item?.autoAdvance ?? 0
  const count = item?.slides.length ?? 0

  useEffect(() => {
    if (!itemId || seconds <= 0 || count < 2 || blackout || cleared || showLogo) return
    const t = setTimeout(() => {
      const live = useLive.getState()
      if (live.itemId === itemId) live.push({ slideIndex: (live.slideIndex + 1) % count })
    }, seconds * 1000)
    return () => clearTimeout(t)
  }, [itemId, slideIndex, seconds, count, blackout, cleared, showLogo])
}

/**
 * Operator keyboard control. Ignored while a text field has focus so typing
 * lyrics never advances the projector.
 */
function useGlobalShortcuts() {
  useEffect(() => {
    const onKey = (e) => {
      const el = document.activeElement
      const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return

      const live = useLive.getState()

      // 1–9: put that slide of the cued item on screen.
      if (/^[1-9]$/.test(e.key)) {
        const id = useCue.getState().itemId ?? live.itemId
        const item = useContent.getState().plan.items.find((it) => it.id === id)
        const i = Number(e.key) - 1
        if (item && i < item.slides.length) {
          e.preventDefault()
          live.goTo(item.id, i)
        }
        return
      }

      switch (e.key) {
        case 'Enter': {
          // Take the cued item live — but only from the plan, never from a
          // focused button, where Enter already means "press this".
          if (el && el.tagName === 'BUTTON') return
          const id = useCue.getState().itemId
          if (id && id !== live.itemId) {
            e.preventDefault()
            live.goTo(id, 0)
          }
          break
        }
        case 'ArrowRight':
        case 'ArrowDown':
        case 'PageDown':
        case ' ':
          e.preventDefault()
          live.next()
          break
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault()
          live.prev()
          break
        case 'b':
        case 'B':
          e.preventDefault()
          live.toggleBlackout()
          break
        case 'l':
        case 'L':
          e.preventDefault()
          live.toggleLogo()
          break
        case 'c':
        case 'C':
          e.preventDefault()
          live.toggleClear()
          break
        case 'Escape':
          e.preventDefault()
          live.reset()
          break
        default:
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
