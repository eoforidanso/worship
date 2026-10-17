import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useContent } from '../store/useContent'
import { useLive, useCue } from '../store/useLive'
import { urlFor } from '../lib/mediaStore'
import { ORDER, SECTIONS } from '../data/orderOfMass'
import { filesToItems, textToItem } from '../lib/importer'

const TYPE_META = {
  song: { icon: '♪', label: 'Song' },
  scripture: { icon: '✝', label: 'Scripture' },
  text: { icon: '¶', label: 'Text' },
  // Older plans may still hold these; they are no longer offered as new items.
  media: { icon: '▣', label: 'Pictures' },
  countdown: { icon: '◷', label: 'Countdown' },
}
const ADDABLE = ['song', 'scripture', 'text']

/** Which part of the Mass an item belongs to, for the headings in the plan. */
function sectionOf(item) {
  const id = item.lectionary?.slot ?? item.lectionary?.part
  if (!id || id === 'title') return null
  const part = ORDER.find((p) => p.id === id)
  return part ? SECTIONS[part.section] : SECTIONS[1] // readings and psalms
}

export default function ServicePlanner({ onEdit }) {
  const items = useContent((s) => s.plan.items)
  const moveItem = useContent((s) => s.moveItem)
  const addItem = useContent((s) => s.addItem)
  const clearPlan = useContent((s) => s.clearPlan)
  const insertItems = useContent((s) => s.insertItems)
  const [importing, setImporting] = useState(false)
  const [dropping, setDropping] = useState(false)
  const [dropped, setDropped] = useState(null) // files dropped on the plan, for the panel

  // Imports land after the selected item, and the first one is selected.
  const placeItems = (newItems) => {
    if (!newItems.length) return
    insertItems(newItems, cuedId)
    cue(newItems[0].id)
  }
  const importFiles = async (files, report) => {
    const { items: made, skipped } = await filesToItems(files, report)
    placeItems(made)
    return { made, skipped }
  }

  const liveItemId = useLive((s) => s.itemId)
  const goTo = useLive((s) => s.goTo)
  const cuedId = useCue((s) => s.itemId)
  const cue = useCue((s) => s.cue)
  const navigate = useNavigate()
  const { pathname } = useLocation()

  // A click cues the item. In the composer it opens it there instead; either
  // way nothing reaches the projector until a slide is chosen.
  const pick = (id) => {
    cue(id)
    if (pathname.startsWith('/compose')) navigate(`/compose/${id}`)
    else if (!pathname.startsWith('/live')) navigate('/live')
  }

  // A small activation distance keeps a plain click from starting a drag.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const onDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return
    const from = items.findIndex((i) => i.id === active.id)
    const to = items.findIndex((i) => i.id === over.id)
    moveItem(from, to)
  }

  const handleAdd = (type) => {
    const id = addItem(type, cuedId) // after the selected item, not lost at the bottom
    cue(id)
    onEdit?.(id)
  }

  return (
    <div
      className={`planner${dropping ? ' dropping' : ''}`}
      onDragOver={(e) => {
        if (![...e.dataTransfer.types].includes('Files')) return
        e.preventDefault()
        setDropping(true)
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setDropping(false)
      }}
      onDrop={(e) => {
        if (!e.dataTransfer.files.length) return
        e.preventDefault()
        setDropping(false)
        setImporting(true) // the panel opens and reports progress
        setDropped([...e.dataTransfer.files])
      }}
    >
      <div className="planner-head">
        <h2>Service plan</h2>
        <span className="row">
          <span className="muted">{items.length} items</span>
          {items.length > 0 && (
            <button
              className="icon-btn"
              title="Clear the plan"
              onClick={() => {
                if (
                  !window.confirm(
                    'Remove every item from this service? Saved services and the library are not touched.',
                  )
                )
                  return
                useLive.getState().push({ itemId: null, slideIndex: 0 })
                cue(null)
                clearPlan()
              }}
            >
              Clear
            </button>
          )}
        </span>
      </div>

      {items.length === 0 && (
        <div className="planner-empty">
          <button className="btn btn-primary full" onClick={() => navigate('/readings')}>
            ✠ Add this day’s Mass
          </button>
          <p className="muted small">The Order of Mass and the readings for the service date, in one step.</p>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <ul className="plan-list">
            {items.map((item, i) => {
              const section = sectionOf(item)
              // Compare with the last item that had a section, so a song added
              // mid-Mass doesn't make its section's heading appear twice.
              const prev = items
                .slice(0, i)
                .map(sectionOf)
                .filter(Boolean)
                .at(-1)
              const heading = section && section !== prev ? section : null
              return (
                <Fragment key={item.id}>
                  {heading && (
                    <li className="plan-section" aria-hidden="true">
                      {heading}
                    </li>
                  )}
                  <PlanRow
                    item={item}
                    live={item.id === liveItemId}
                    cued={item.id === cuedId && item.id !== liveItemId}
                    onPick={() => pick(item.id)}
                    onGoLive={() => goTo(item.id, 0)}
                    onEdit={() => onEdit?.(item.id)}
                  />
                </Fragment>
              )
            })}
          </ul>
        </SortableContext>
      </DndContext>

      <LibraryQuickAdd afterId={cuedId} onAdded={(id) => cue(id)} />

      {importing && (
        <ImportPanel
          onFiles={importFiles}
          onText={(t) => placeItems([textToItem(t)])}
          onClose={() => setImporting(false)}
          incoming={dropped}
          onTaken={() => setDropped(null)}
        />
      )}

      <div className="planner-add">
        {ADDABLE.map((type) => (
          <button key={type} className="btn btn-ghost" onClick={() => handleAdd(type)}>
            <span aria-hidden="true">{TYPE_META[type].icon}</span> {TYPE_META[type].label}
          </button>
        ))}
        <button className={`btn btn-ghost${importing ? ' on' : ''}`} onClick={() => setImporting((v) => !v)}>
          ⊕ Paste or file
        </button>
        {items.length > 0 && (
          <button className="btn btn-ghost" onClick={() => navigate('/readings')}>
            ✠ Mass &amp; readings
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Paste text or a picture, choose files, or drop them anywhere on the plan:
 * text files, PDFs (a slide per page) and pictures (a slide each).
 */
function ImportPanel({ onFiles, onText, onClose, incoming, onTaken }) {
  const [text, setText] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)

  const run = async (files) => {
    if (!files.length) return
    setBusy(true)
    setStatus('Importing…')
    try {
      const { made, skipped } = await onFiles(files, setStatus)
      const slides = made.reduce((n, it) => n + it.slides.length, 0)
      setStatus(
        [
          made.length
            ? `Added ${made.length} item${made.length === 1 ? '' : 's'} (${slides} slide${slides === 1 ? '' : 's'}).`
            : '',
          ...skipped.map((s) => `${s.name}: ${s.reason}`),
        ]
          .filter(Boolean)
          .join(' '),
      )
    } catch (err) {
      setStatus(`Couldn't import: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  // Files dropped on the plan arrive here — once each, even if the effect
  // runs twice (React's development double-mount).
  const taken = useRef(null)
  useEffect(() => {
    if (!incoming?.length || taken.current === incoming) return
    taken.current = incoming
    onTaken()
    run(incoming)
  }, [incoming]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="import-panel">
      <textarea
        rows={4}
        value={text}
        placeholder={'Paste text or a picture here.\nA blank line starts a new slide.'}
        onChange={(e) => setText(e.target.value)}
        onPaste={(e) => {
          const files = [...e.clipboardData.files]
          if (files.length) {
            e.preventDefault() // a copied picture: import it rather than paste its name
            run(files)
          }
        }}
      />
      <div className="row">
        <button
          className="btn btn-primary btn-sm"
          disabled={!text.trim() || busy}
          onClick={() => {
            onText(text)
            setText('')
            setStatus('Added the text.')
          }}
        >
          Add text
        </button>
        <button className="btn btn-sm" disabled={busy} onClick={() => fileRef.current?.click()}>
          Choose files…
        </button>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>
          Close
        </button>
        <input
          ref={fileRef}
          type="file"
          hidden
          multiple
          accept=".txt,.md,text/plain,application/pdf,.pdf,image/*"
          onChange={(e) => {
            run([...e.target.files])
            e.target.value = ''
          }}
        />
      </div>
      <p className="muted small">
        {status ||
          'Text files, PDFs (a slide per page) and pictures. You can also drop files anywhere on the plan.'}
      </p>
    </div>
  )
}

/** Type-ahead over the song library, so a song goes in without leaving Live. */
function LibraryQuickAdd({ afterId, onAdded }) {
  const songs = useContent((s) => s.songs)
  const addFromLibrary = useContent((s) => s.addFromLibrary)
  const [q, setQ] = useState('')

  const hits = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return []
    return songs
      .filter(
        (x) =>
          x.title.toLowerCase().includes(needle) ||
          (x.subtitle ?? '').toLowerCase().includes(needle) ||
          x.slides.some((sl) => sl.body.toLowerCase().includes(needle)),
      )
      .slice(0, 6)
  }, [songs, q])

  if (!songs.length) return null

  const add = (libId) => {
    const id = addFromLibrary(libId, afterId)
    setQ('')
    if (id) onAdded?.(id)
  }

  return (
    <div className="quick-add">
      <input
        className="search"
        placeholder={`Add from library (${songs.length})…`}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && hits[0]) add(hits[0].id)
          if (e.key === 'Escape') setQ('')
        }}
      />
      {hits.length > 0 && (
        <ul className="quick-hits">
          {hits.map((x) => (
            <li key={x.id}>
              <button onClick={() => add(x.id)}>
                <span>{TYPE_META[x.type]?.icon ?? '¶'}</span>
                <span className="plan-text">
                  <span className="plan-title-text">{x.title}</span>
                  {x.subtitle && <span className="muted small">{x.subtitle}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {q.trim() && hits.length === 0 && <p className="muted small">No match in the library.</p>}
    </div>
  )
}

function PlanRow({ item, live, cued, onPick, onGoLive, onEdit }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })
  const removeItem = useContent((s) => s.removeItem)
  const duplicateItem = useContent((s) => s.duplicateItem)
  const saveToLibrary = useContent((s) => s.saveToLibrary)
  const meta = TYPE_META[item.type] ?? TYPE_META.text

  // Keep the item on screen in the plan as the Mass moves on.
  const rowRef = useRef(null)
  useEffect(() => {
    // Selected or newly added items scroll into view too, so an add is never invisible.
    if (live || cued) rowRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [live, cued])
  const ref = (el) => {
    rowRef.current = el
    setNodeRef(el)
  }

  return (
    <li
      ref={ref}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`plan-row${live ? ' on-air' : ''}${cued ? ' cued' : ''}${isDragging ? ' dragging' : ''}${item.placeholder ? ' placeholder' : ''}`}
    >
      <button className="grip" {...attributes} {...listeners} aria-label={`Reorder ${item.title}`}>
        ⠿
      </button>

      <button className="plan-row-main" onDoubleClick={onEdit} onClick={onPick}>
        <span className="plan-icon" aria-hidden="true">
          {meta.icon}
        </span>
        <span className="plan-text">
          <span className="plan-title-text">
            {item.title}
            <ItemOfflineDot item={item} />
          </span>
          <span className="muted small plan-sub">
            {item.placeholder
              ? 'Select, then add a song from the library'
              : [
                  item.lectionary && ORDER.some((p) => p.id === item.lectionary.part) ? '' : item.subtitle,
                  item.slides.length > 1 ? `${item.slides.length} slides` : '',
                  item.autoAdvance > 0 ? `loops ${item.autoAdvance}s` : '',
                ]
                  .filter(Boolean)
                  .join(' · ')}
          </span>
        </span>
      </button>

      {(cued || live) && (
        <span className="plan-actions">
          <button className="icon-btn live-btn" onClick={onGoLive} title="Go live">
            ▶
          </button>
          <button
            className="icon-btn"
            onClick={() => saveToLibrary(item.id)}
            title={item.libraryId ? 'Update in library' : 'Save to library'}
          >
            {item.libraryId ? '★' : '☆'}
          </button>
          <button className="icon-btn" onClick={onEdit} title="Edit">
            ✎
          </button>
          <button className="icon-btn" onClick={() => duplicateItem(item.id)} title="Duplicate">
            ⧉
          </button>
          <button
            className="icon-btn danger"
            onClick={() => {
              if (live) {
                if (!window.confirm(`“${item.title}” is on screen right now. Remove it anyway?`)) return
                useLive.getState().push({ itemId: null, slideIndex: 0 })
              }
              removeItem(item.id)
            }}
            title="Remove"
          >
            ×
          </button>
        </span>
      )}
    </li>
  )
}

/**
 * Whether this item will actually project with no network.
 *
 * Only shown when there's something to say — an item with a plain colour
 * background is unconditionally fine and doesn't need a badge arguing
 * otherwise. Green is deliberately silent for the common case.
 */
function ItemOfflineDot({ item }) {
  const bg = item.background
  if (!bg || bg.kind === 'color') return null

  const resolved = bg.mediaId ? urlFor(bg.mediaId) : bg.value
  if (resolved && !bg.mediaId && /^https?:/i.test(bg.value ?? '')) {
    return <span className="dot dot-remote" title="Background is online only — needs the network" />
  }
  if (!resolved) {
    return <span className="dot dot-missing" title="Background unavailable offline" />
  }
  return null
}
