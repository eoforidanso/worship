import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useContent } from '../store/useContent'
import { useLive } from '../store/useLive'

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
    </div>
  )
}

function PlanRow({ item, live, onGoLive, onEdit }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })
  const removeItem = useContent((s) => s.removeItem)
  const duplicateItem = useContent((s) => s.duplicateItem)
  const meta = TYPE_META[item.type] ?? TYPE_META.text

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`plan-row${live ? ' live' : ''}${isDragging ? ' dragging' : ''}`}
    >
      <button className="grip" {...attributes} {...listeners} aria-label={`Reorder ${item.title}`}>
        ⠿
      </button>

      <button className="plan-row-main" onDoubleClick={onEdit} onClick={onGoLive}>
        <span className="plan-icon" aria-hidden="true">
          {meta.icon}
        </span>
        <span className="plan-text">
          <span className="plan-title-text">{item.title}</span>
          <span className="muted small">
            {item.subtitle ? `${item.subtitle} · ` : ''}
            {item.slides.length} slide{item.slides.length === 1 ? '' : 's'}
          </span>
        </span>
      </button>

      <span className="plan-actions">
        <button className="icon-btn" onClick={onEdit} title="Edit">
          ✎
        </button>
        <button className="icon-btn" onClick={() => duplicateItem(item.id)} title="Duplicate">
          ⧉
        </button>
        <button className="icon-btn danger" onClick={() => removeItem(item.id)} title="Remove">
          ×
        </button>
      </span>
    </li>
  )
}
