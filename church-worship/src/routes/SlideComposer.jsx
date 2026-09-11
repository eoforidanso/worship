import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import SlideCanvas from '../components/SlideCanvas'
import { useContent, DEFAULT_THEME } from '../store/useContent'
import { useLive } from '../store/useLive'

export default function SlideComposer() {
  const { itemId } = useParams()
  const navigate = useNavigate()

  const plan = useContent((s) => s.plan)
  const themes = useContent((s) => s.themes)
  const media = useContent((s) => s.media)
  const { updateItem, addSlide, updateSlide, removeSlide, moveSlide, importLyrics } = useContent()

  const item = plan.items.find((i) => i.id === itemId) ?? null
  const [selected, setSelected] = useState(0)
  const [bulk, setBulk] = useState('')
  const [showBulk, setShowBulk] = useState(false)

  // Fall back to the first item so /compose with no id is still useful.
  useEffect(() => {
    if (!itemId && plan.items.length) navigate(`/compose/${plan.items[0].id}`, { replace: true })
  }, [itemId, plan.items, navigate])

  useEffect(() => setSelected(0), [itemId])

  if (!item) return <p className="empty pad">No item selected. Add one from the service plan.</p>

  const theme = themes.find((t) => t.id === item.themeId) ?? themes[0] ?? DEFAULT_THEME
  const slide = item.slides[Math.min(selected, item.slides.length - 1)] ?? null

  const applyBulk = () => {
    importLyrics(item.id, bulk)
    setBulk('')
    setShowBulk(false)
    setSelected(0)
  }

  return (
    <div className="composer">
      <div className="composer-slides">
        <div className="composer-slides-head">
          <h3>Slides</h3>
          <button className="btn btn-ghost" onClick={() => addSlide(item.id, selected)}>
            + Add
          </button>
        </div>
        <ul>
          {item.slides.map((sl, i) => (
            <li key={sl.id} className={i === selected ? 'sel' : ''}>
              <button className="slide-pick" onClick={() => setSelected(i)}>
                <SlideCanvas slide={sl} theme={theme} background={item.background} />
                <span>{sl.label || `Slide ${i + 1}`}</span>
              </button>
              <span className="slide-pick-actions">
                <button className="icon-btn" onClick={() => moveSlide(item.id, i, i - 1)} disabled={i === 0}>
                  ↑
                </button>
                <button
                  className="icon-btn"
                  onClick={() => moveSlide(item.id, i, i + 1)}
                  disabled={i === item.slides.length - 1}
                >
                  ↓
                </button>
                <button
                  className="icon-btn danger"
                  onClick={() => removeSlide(item.id, sl.id)}
                  disabled={item.slides.length === 1}
                >
                  ×
                </button>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="composer-main">
        <SlideCanvas slide={slide} theme={theme} background={item.background} className="composer-preview" />

        {slide && (
          <>
            <label className="field">
              <span>Label</span>
              <input
                value={slide.label}
                placeholder="Verse 1, Chorus, …"
                onChange={(e) => updateSlide(item.id, slide.id, { label: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Slide text</span>
              <textarea
                rows={6}
                value={slide.body}
                onChange={(e) => updateSlide(item.id, slide.id, { body: e.target.value })}
              />
            </label>
          </>
        )}

        <div className="row">
          <button className="btn" onClick={() => setShowBulk((v) => !v)}>
            {showBulk ? 'Cancel import' : 'Paste lyrics…'}
          </button>
          <button className="btn btn-primary" onClick={() => useLive.getState().goTo(item.id, selected)}>
            Go live from here
          </button>
        </div>

        {showBulk && (
          <div className="bulk">
            <p className="muted small">
              A blank line starts a new slide. Put <code>[Verse 1]</code> on its own first line to label
              one. This replaces the existing slides.
            </p>
            <textarea
              rows={10}
              value={bulk}
              placeholder={'[Verse 1]\nAmazing grace how sweet the sound\n\n[Chorus]\nMy chains are gone'}
              onChange={(e) => setBulk(e.target.value)}
            />
            <button className="btn btn-primary" onClick={applyBulk} disabled={!bulk.trim()}>
              Replace slides
            </button>
          </div>
        )}
      </div>

      <div className="composer-inspector">
        <h3>Item</h3>
        <label className="field">
          <span>Title</span>
          <input value={item.title} onChange={(e) => updateItem(item.id, { title: e.target.value })} />
        </label>
        <label className="field">
          <span>Subtitle</span>
          <input
            value={item.subtitle}
            placeholder="Author, translation, …"
            onChange={(e) => updateItem(item.id, { subtitle: e.target.value })}
          />
        </label>
        <label className="field">
          <span>Theme</span>
          <select value={item.themeId} onChange={(e) => updateItem(item.id, { themeId: e.target.value })}>
            {themes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>

        <h3>Background</h3>
        <div className="row">
          <button className="btn btn-ghost" onClick={() => updateItem(item.id, { background: null })}>
            Use theme
          </button>
          <input
            type="color"
            aria-label="Background colour"
            value={item.background?.kind === 'color' ? item.background.value : theme.background.value}
            onChange={(e) => updateItem(item.id, { background: { kind: 'color', value: e.target.value } })}
          />
        </div>

        <div className="bg-grid">
          {media.slice(0, 12).map((m) => (
            <button
              key={m.id}
              className="bg-chip"
              title={m.name}
              onClick={() =>
                // mediaId, not the URL: object URLs are per-session, so a
                // URL-keyed background would be dead on the next reload.
                // `value` is kept only for remote media, where the URL is the
                // durable reference — storing a blob: URL would persist a
                // pointer that's guaranteed to be dangling by then.
                updateItem(item.id, {
                  background: {
                    kind: m.type,
                    mediaId: m.id,
                    ...(m.url?.startsWith('blob:') ? {} : { value: m.url }),
                    dim: 0.35,
                  },
                })
              }
            >
              {m.type === 'video' ? <video src={m.url} muted /> : <img src={m.url} alt="" />}
            </button>
          ))}
        </div>
        {media.length === 0 && (
          <p className="muted small">Add images or video in the Media tab to use as backgrounds.</p>
        )}

        <label className="field">
          <span>Notes (stage display only)</span>
          <textarea
            rows={4}
            value={item.notes}
            onChange={(e) => updateItem(item.id, { notes: e.target.value })}
          />
        </label>
      </div>
    </div>
  )
}
