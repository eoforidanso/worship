import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import ServicePlanner from '../components/ServicePlanner'
import { useLive } from '../store/useLive'
import { useContent } from '../store/useContent'
import { subscribeStatus } from '../lib/broadcast'
import { subscribePwa, applyUpdate, dismissOfflineReady } from '../lib/pwa'

const TABS = [
  { to: '/live', label: 'Live' },
  { to: '/compose', label: 'Compose' },
  { to: '/media', label: 'Media' },
  { to: '/themes', label: 'Themes' },
]

export default function Shell() {
  const navigate = useNavigate()
  const planTitle = useContent((s) => s.plan.title)
  const setPlanTitle = useContent((s) => s.setPlanTitle)

  useGlobalShortcuts()
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
 * Operator keyboard control. Ignored while a text field has focus so typing
 * lyrics never advances the projector.
 */
function useGlobalShortcuts() {
  useEffect(() => {
    const onKey = (e) => {
      const el = document.activeElement
      const typing =
        el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return

      const live = useLive.getState()
      switch (e.key) {
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
