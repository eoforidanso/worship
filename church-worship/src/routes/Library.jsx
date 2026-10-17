import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useContent } from '../store/useContent'
import { useLive, useCue } from '../store/useLive'
import { exportBundle, importBundle } from '../lib/bundle'
import { starterSongs } from '../data/hymns'

const starterIds = starterSongs().map((x) => x.id)

/**
 * Services and the song library.
 *
 * One service is open at a time; the rest are kept here whole, so last week
 * is a click away and this week can start as a copy of it. The library holds
 * songs (and anything else reused week to week) so they're typed once.
 */
export default function Library() {
  return (
    <div className="library">
      <Parish />
      <Services />
      <Songs />
    </div>
  )
}

/** The parish's name and logo — set once, used on title slides and the Logo key. */
function Parish() {
  const parish = useContent((s) => s.parish)
  const logoUrl = useContent((s) => s.logoUrl)
  const { setParish, setLogo } = useContent()
  const fileRef = useRef(null)
  const pickLogo = async (file) => {
    if (!file?.type.startsWith('image/')) return
    const { storePicture } = await import('../lib/importer')
    const id = await storePicture(file, file.name, ['logo'])
    const { urlFor } = await import('../lib/mediaStore')
    setLogo(urlFor(id), id)
  }
  return (
    <section className="parish-card">
      {logoUrl ? <img src={logoUrl} alt="Parish logo" /> : <span className="parish-logo-empty">Logo</span>}
      <div className="parish-fields">
        <input
          className="notice-title"
          placeholder="Parish name — e.g. St. Peter’s Catholic Church, Kumasi"
          value={parish?.name ?? ''}
          onChange={(e) => setParish({ name: e.target.value })}
        />
        <div className="row">
          <button className="btn btn-sm" onClick={() => fileRef.current?.click()}>
            {logoUrl ? 'Change logo' : 'Choose logo'}
          </button>
          {logoUrl && (
            <button className="btn btn-ghost btn-sm" onClick={() => setLogo(null, null)}>
              Remove
            </button>
          )}
          <span className="muted small">
            The name heads each Mass title slide; the logo is what <kbd>L</kbd> shows.
          </span>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              pickLogo(e.target.files[0])
              e.target.value = ''
            }}
          />
        </div>
      </div>
    </section>
  )
}

function Services() {
  const plan = useContent((s) => s.plan)
  const services = useContent((s) => s.services)
  const { saveService, openService, newService, deleteService } = useContent()
  const liveItemId = useLive((s) => s.itemId)
  const navigate = useNavigate()
  const fileRef = useRef(null)
  const [note, setNote] = useState('')

  const others = services
    .filter((p) => p.id !== plan.id)
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))

  // Swapping services while something is on screen would leave the projector
  // showing an item the operator can no longer see. Ask first.
  const guard = () =>
    !liveItemId ||
    window.confirm('Something is on screen. Switching services will clear the projector. Continue?')

  const switchTo = (fn) => {
    if (!guard()) return
    if (liveItemId) useLive.getState().push({ itemId: null, slideIndex: 0 })
    useCue.getState().cue(null)
    fn()
    navigate('/live')
  }

  const doExport = async (scope) => {
    setNote('Preparing file…')
    try {
      saveService()
      const r = await exportBundle(scope)
      setNote(
        `Exported ${r.services} service${r.services === 1 ? '' : 's'}` +
          (r.media ? ` with ${r.media} media file${r.media === 1 ? '' : 's'}` : '') +
          '.',
      )
    } catch (err) {
      setNote(`Export failed: ${err.message}`)
    }
  }

  const doImport = async (file) => {
    if (!file) return
    setNote(`Importing ${file.name}…`)
    try {
      const r = await importBundle(file)
      setNote(
        `Imported ${r.services.length ? r.services.join(', ') : 'no services'}` +
          (r.songs ? `, ${r.songs} library item${r.songs === 1 ? '' : 's'}` : '') +
          (r.media ? `, ${r.media} media file${r.media === 1 ? '' : 's'}` : '') +
          '. Open it from the list below.',
      )
    } catch (err) {
      setNote(`Import failed: ${err.message}`)
    }
  }

  return (
    <section className="lib-col">
      <div className="row between">
        <h3>Services</h3>
        <div className="row">
          <button className="btn btn-ghost" onClick={() => switchTo(() => newService(plan.id))}>
            New from this one
          </button>
          <button className="btn btn-ghost" onClick={() => switchTo(() => newService())}>
            + Blank
          </button>
        </div>
      </div>

      <div className="svc-card open">
        <div className="svc-main">
          <span className="badge live-badge">Open</span>
          <strong>{plan.title}</strong>
          <span className="muted small">
            {formatDate(plan.date)} · {plan.items.length} item{plan.items.length === 1 ? '' : 's'}
          </span>
        </div>
        <button
          className="btn"
          onClick={() => {
            saveService()
            setNote('Saved.')
          }}
        >
          Save
        </button>
      </div>

      <ul className="svc-list">
        {others.map((p) => (
          <li key={p.id} className="svc-card">
            <button
              className="svc-main"
              onClick={() => switchTo(() => openService(p.id))}
              title="Open this service"
            >
              <strong>{p.title}</strong>
              <span className="muted small">
                {formatDate(p.date)} · {p.items.length} item{p.items.length === 1 ? '' : 's'}
              </span>
              <span className="muted small svc-items">{p.items.map((it) => it.title).join(' · ')}</span>
            </button>
            <span className="svc-actions">
              <button
                className="icon-btn"
                title="New service from this one"
                onClick={() => switchTo(() => newService(p.id))}
              >
                ⧉
              </button>
              <button
                className="icon-btn danger"
                title="Delete"
                onClick={() =>
                  window.confirm(`Delete “${p.title}” (${formatDate(p.date)})?`) && deleteService(p.id)
                }
              >
                ×
              </button>
            </span>
          </li>
        ))}
      </ul>
      {others.length === 0 && (
        <p className="empty">No other services yet. Save this one, then start next week's from it.</p>
      )}

      <div className="lib-io">
        <h3>Files</h3>
        <p className="muted small">
          The plan lives in this browser only. Export to carry a service to the projection laptop, or to keep
          a backup before Sunday. Media goes inside the file.
        </p>
        <div className="row">
          <button className="btn" onClick={() => doExport('service')}>
            Export this service
          </button>
          <button className="btn" onClick={() => doExport('all')}>
            Back up everything
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            Import…
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => {
              doImport(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </div>
        {note && <p className="muted small">{note}</p>}
      </div>
    </section>
  )
}

function Songs() {
  const songs = useContent((s) => s.songs)
  const { addFromLibrary, removeFromLibrary, restoreStarterHymns } = useContent()
  const missingStarters = useContent((s) => {
    const have = new Set(s.songs.map((x) => x.id))
    return starterIds.filter((id) => !have.has(id)).length
  })
  const cue = useCue((s) => s.cue)
  const cuedId = useCue((s) => s.itemId)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(null)

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const list = [...songs].sort((a, b) => a.title.localeCompare(b.title))
    if (!needle) return list
    return list.filter(
      (x) =>
        x.title.toLowerCase().includes(needle) ||
        (x.subtitle ?? '').toLowerCase().includes(needle) ||
        (x.notes ?? '').toLowerCase().includes(needle) || // "Christmas", "Our Lady", "Eucharist"…
        x.slides.some((sl) => sl.body.toLowerCase().includes(needle)),
    )
  }, [songs, q])

  // Say where the song went: the plan is in the rail, and a silent add looks like no add.
  const [added, setAdded] = useState(null) // { libId, message }
  const addedTimer = useRef(null)
  const add = (id) => {
    const itemId = addFromLibrary(id, cuedId)
    if (!itemId) return
    cue(itemId)
    const items = useContent.getState().plan.items
    const i = items.findIndex((it) => it.id === itemId)
    const it = items[i]
    const message = it.lectionary?.slot
      ? `Added as the ${it.subtitle}.`
      : i > 0
        ? `Added after “${items[i - 1].title}”.`
        : 'Added at the start of the service.'
    setAdded({ libId: id, message })
    clearTimeout(addedTimer.current)
    addedTimer.current = setTimeout(() => setAdded(null), 4000)
  }

  return (
    <section className="lib-col">
      <div className="row between">
        <h3>Library</h3>
        <span className="muted small">
          {songs.length} item{songs.length === 1 ? '' : 's'}
        </span>
      </div>
      <input
        className="search"
        placeholder="Search titles, lyrics or a season — Christmas, Lent, Our Lady…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <ul className="song-list">
        {shown.map((x) => (
          <li key={x.id} className="svc-card">
            <button className="svc-main" onClick={() => setOpen(open === x.id ? null : x.id)}>
              <strong>{x.title}</strong>
              <span className="muted small">
                {[x.subtitle, `${x.slides.length} slide${x.slides.length === 1 ? '' : 's'}`]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
              {open === x.id && (
                <span className="song-preview">
                  {x.slides.map((sl) => (
                    <span key={sl.id}>
                      {sl.label && <em>{sl.label}</em>}
                      {sl.body}
                    </span>
                  ))}
                </span>
              )}
            </button>
            <span className="svc-actions">
              <button
                className={`btn btn-sm${added?.libId === x.id ? ' btn-primary' : ''}`}
                onClick={() => add(x.id)}
                title={cuedId ? 'Goes after the selected item in the plan' : 'Goes at the end of the plan'}
              >
                {added?.libId === x.id ? '✓ Added' : '+ Add to service'}
              </button>
              <button
                className="icon-btn danger"
                title="Remove from library"
                onClick={() =>
                  window.confirm(`Remove “${x.title}” from the library?`) && removeFromLibrary(x.id)
                }
              >
                ×
              </button>
            </span>
          </li>
        ))}
      </ul>
      {missingStarters > 0 && (
        <button className="btn btn-ghost btn-sm" onClick={restoreStarterHymns}>
          Restore {missingStarters} starter hymn{missingStarters === 1 ? '' : 's'}
        </button>
      )}
      {added && (
        <p className="added-note small">
          {added.message} Select an item in the plan first to choose where songs go.
        </p>
      )}
      {songs.length === 0 && (
        <p className="empty">
          Nothing saved yet. Press ☆ on any item in the service plan to keep it here for next time.
        </p>
      )}
      {songs.length > 0 && shown.length === 0 && <p className="empty">No match.</p>}
    </section>
  )
}

function formatDate(iso) {
  if (!iso) return 'No date'
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
