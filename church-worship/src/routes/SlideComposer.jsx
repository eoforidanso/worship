import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import SlideCanvas from '../components/SlideCanvas'
import { useContent, DEFAULT_THEME } from '../store/useContent'
import { useLive } from '../store/useLive'
import { footerFor } from '../lib/render'
import { TRANSLATIONS, lookup, versesToSlides } from '../lib/scripture'
import { textToScreens } from '../lib/massBuilder'

export default function SlideComposer() {
  const { itemId } = useParams()
  const navigate = useNavigate()

  const plan = useContent((s) => s.plan)
  const themes = useContent((s) => s.themes)
  const media = useContent((s) => s.media)
  const {
    updateItem,
    addSlide,
    updateSlide,
    removeSlide,
    moveSlide,
    importLyrics,
    setSlides,
    saveToLibrary,
  } = useContent()

  const item = plan.items.find((i) => i.id === itemId) ?? null
  const [selected, setSelected] = useState(0)
  const [bulk, setBulk] = useState('')
  const [showBulk, setShowBulk] = useState(false)
  const [showLookup, setShowLookup] = useState(false)

  // Fall back to the first item so /compose with no id is still useful.
  useEffect(() => {
    if (!itemId && plan.items.length) navigate(`/compose/${plan.items[0].id}`, { replace: true })
  }, [itemId, plan.items, navigate])

  useEffect(() => setSelected(0), [itemId])
  useEffect(() => {
    // A fresh scripture item opens straight onto the lookup.
    const it = useContent.getState().getItem(itemId)
    setShowLookup(!!it && it.type === 'scripture' && it.slides.length === 1 && !it.slides[0].body.trim())
  }, [itemId])

  if (!item) return <p className="empty pad">No item selected. Add one from the service plan.</p>

  const theme = themes.find((t) => t.id === item.themeId) ?? themes[0] ?? DEFAULT_THEME
  const slide = item.slides[Math.min(selected, item.slides.length - 1)] ?? null

  // Readings are prose: split by sentence. Songs: a blank line per slide.
  const prose = item.type === 'scripture'
  const applyBulk = () => {
    if (prose) setSlides(item.id, textToScreens(bulk, 220, '', item.subtitle))
    else importLyrics(item.id, bulk)
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
        <SlideCanvas
          slide={slide}
          theme={theme}
          background={item.background}
          footer={footerFor(item, slide, theme)}
          className="composer-preview"
        />

        {showLookup && (
          <ScriptureLookup
            onCancel={() => setShowLookup(false)}
            onApply={(result, slides) => {
              setSlides(item.id, slides)
              updateItem(item.id, { title: result.reference, subtitle: result.translation })
              setSelected(0)
              setShowLookup(false)
            }}
          />
        )}

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
            {theme.showFooter && (
              <label className="field">
                <span>Footer</span>
                <input
                  value={slide.footer ?? ''}
                  placeholder={
                    [item.title, item.subtitle].filter(Boolean).join(' · ') || 'Reference, credit…'
                  }
                  onChange={(e) => updateSlide(item.id, slide.id, { footer: e.target.value })}
                />
              </label>
            )}
          </>
        )}

        <div className="row">
          <button className="btn" onClick={() => setShowBulk((v) => !v)}>
            {showBulk ? 'Cancel import' : prose ? 'Paste reading…' : 'Paste lyrics…'}
          </button>
          <button className="btn" onClick={() => setShowLookup((v) => !v)}>
            {showLookup ? 'Close lookup' : 'Look up scripture…'}
          </button>
          <button className="btn btn-primary" onClick={() => useLive.getState().goTo(item.id, selected)}>
            Go live from here
          </button>
        </div>

        {showBulk && (
          <div className="bulk">
            <p className="muted small">
              {prose ? (
                <>
                  Paste the reading from your lectionary or missal. It goes on one screen; only a very long
                  reading is split, at sentence ends.
                </>
              ) : (
                <>
                  A blank line starts a new slide. Put <code>[Verse 1]</code> on its own first line to label
                  one.
                </>
              )}{' '}
              This replaces the existing slides.
            </p>
            <textarea
              rows={10}
              value={bulk}
              placeholder={
                prose
                  ? 'A reading from the Book of the Prophet Isaiah…'
                  : '[Verse 1]\nAmazing grace how sweet the sound\n\n[Chorus]\nMy chains are gone'
              }
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

        <label className="field">
          <span>
            Auto-advance{' '}
            <em className="muted">{item.autoAdvance > 0 ? `every ${item.autoAdvance}s, loops` : 'off'}</em>
          </span>
          <input
            type="number"
            min="0"
            step="1"
            value={item.autoAdvance ?? 0}
            onChange={(e) => updateItem(item.id, { autoAdvance: Math.max(0, Number(e.target.value) || 0) })}
          />
        </label>
        <p className="muted small hint">
          For announcements or a pre-service loop. 0 means the operator advances.
        </p>

        <button className="btn btn-ghost full" onClick={() => saveToLibrary(item.id)}>
          {item.libraryId ? '★ Update library copy' : '☆ Save to library'}
        </button>

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

function ScriptureLookup({ onApply, onCancel }) {
  const [ref, setRef] = useState('')
  const [translation, setTranslation] = useState(() => readPref('worship-translation', 'dr'))
  const [perSlide, setPerSlide] = useState(1)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const run = async () => {
    setBusy(true)
    setError('')
    try {
      setResult(await lookup(ref, translation))
      writePref('worship-translation', translation)
    } catch (err) {
      setResult(null)
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const slides = result ? versesToSlides(result, { perSlide }) : []

  return (
    <div className="bulk lookup">
      <div className="row">
        <input
          className="grow"
          autoFocus
          placeholder="John 3:16-18 · Psalm 23 · Sirach 3:2-6"
          value={ref}
          onChange={(e) => setRef(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && run()}
        />
        <select
          value={translation}
          onChange={(e) => setTranslation(e.target.value)}
          style={{ width: 'auto' }}
        >
          {TRANSLATIONS.map((t) => (
            <option key={t.id} value={t.id} title={t.name}>
              {t.label}
            </option>
          ))}
        </select>
        <button className="btn btn-primary" onClick={run} disabled={busy || !ref.trim()}>
          {busy ? 'Looking up…' : 'Look up'}
        </button>
      </div>

      {error && <p className="error small">{error}</p>}

      {result && (
        <>
          <div className="row between lookup-head">
            <strong>
              {result.reference} <span className="muted">· {result.translation}</span>
            </strong>
            <label className="field inline">
              <span>Verses per slide</span>
              <select
                value={perSlide}
                onChange={(e) => setPerSlide(Number(e.target.value))}
                style={{ width: 'auto' }}
              >
                {[1, 2, 3, 4].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
          </div>
          <ol className="lookup-verses">
            {slides.map((sl) => (
              <li key={sl.id}>
                <span className="muted small">{sl.footer}</span>
                <p>{sl.body}</p>
              </li>
            ))}
          </ol>
          <div className="row">
            <button className="btn btn-primary" onClick={() => onApply(result, slides)}>
              Use {slides.length} slide{slides.length === 1 ? '' : 's'}
            </button>
            <button className="btn btn-ghost" onClick={onCancel}>
              Cancel
            </button>
            <span className="muted small">
              Replaces this item's slides. Saved with the service, so it works offline.
            </span>
          </div>
        </>
      )}
    </div>
  )
}

function readPref(key, fallback) {
  try {
    return localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}

function writePref(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* preference only */
  }
}
