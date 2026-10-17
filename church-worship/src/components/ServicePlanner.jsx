import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useContent } from '../store/useContent'
import { useLive, useCue } from '../store/useLive'
import { urlFor } from '../lib/mediaStore'

const TYPE_META = {
  song: { icon: '♪', label: 'Song' },
  scripture: { icon: '✝', label: 'Scripture' },
  text: { icon: '¶', label: 'Text' },
  media: { icon: '▶', label: 'Media' },
  countdown: { icon: '◷', label: 'Countdown' },
}

export default function ServicePlanner({ onEdit }) {
  const items = useContent((s) => s.plan.items)
  const moveItem = useContent((s) => s.moveItem)
  const addItem = useContent((s) => s.addItem)

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
    const id = addItem(type)
    cue(id)
    onEdit?.(id)
  }

  return (
    <div className="planner">
      <div className="planner-head">
        <h2>Service plan</h2>
        <span className="muted">{items.length} items</span>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <ul className="plan-list">
            {items.map((item) => (
              <PlanRow
                key={item.id}
                item={item}
                live={item.id === liveItemId}
                cued={item.id === cuedId && item.id !== liveItemId}
                onPick={() => pick(item.id)}
                onGoLive={() => goTo(item.id, 0)}
                onEdit={() => onEdit?.(item.id)}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      {items.length === 0 && <p className="empty">Add a song, scripture or text to get started.</p>}

      <div className="planner-add">
        {Object.entries(TYPE_META).map(([type, meta]) => (
          <button key={type} className="btn btn-ghost" onClick={() => handleAdd(type)}>
            <span aria-hidden="true">{meta.icon}</span> {meta.label}
          </button>
        ))}
      </div>

      <button className="btn readings-btn" onClick={() => navigate('/readings')}>
        ✠ Readings of the day
      </button>

      <LibraryQuickAdd afterId={cuedId} onAdded={(id) => cue(id)} />
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

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`plan-row${live ? ' on-air' : ''}${cued ? ' cued' : ''}${isDragging ? ' dragging' : ''}`}
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
          <span className="muted small">
            {item.subtitle ? `${item.subtitle} · ` : ''}
            {item.slides.length} slide{item.slides.length === 1 ? '' : 's'}
            {item.autoAdvance > 0 && ` · loops ${item.autoAdvance}s`}
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
