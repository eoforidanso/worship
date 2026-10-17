import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useContent } from '../store/useContent'
import { useCue } from '../store/useLive'
import { dayOf, partsOf, isPsalm, GRADES } from '../lib/lectionary'
import { buildMass } from '../lib/massBuilder'

/**
 * The readings of the day, from the Lectionary for Mass.
 *
 * Opens on the service's date. The calendar decides the celebration and the
 * cycle (Year A/B/C, Year I/II); the operator picks the Mass where there is a
 * choice, ticks the parts to project, and the readings land in the service as
 * one item per part — First Reading through Gospel.
 */
export default function Readings() {
  const planDate = useContent((s) => s.plan.date)
  const [date, setDate] = useState(planDate || today())
  useEffect(() => {
    if (planDate) setDate(planDate)
  }, [planDate])

  const [day, setDay] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let live = true
    setDay(null)
    setError('')
    dayOf(date)
      .then((d) => live && setDay(d))
      .catch((e) => live && setError(e.message))
    return () => {
      live = false
    }
  }, [date])

  return (
    <div className="readings">
      <div className="readings-head">
        <div className="row">
          <button className="btn" onClick={() => setDate(shift(date, -1))} aria-label="Previous day">
            ◀
          </button>
          <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
          <button className="btn" onClick={() => setDate(shift(date, 1))} aria-label="Next day">
            ▶
          </button>
          <button className="btn btn-ghost" onClick={() => setDate(today())}>
            Today
          </button>
          {planDate && planDate !== date && (
            <button className="btn btn-ghost" onClick={() => setDate(planDate)}>
              Service date
            </button>
          )}
        </div>
        <Week date={date} onPick={setDate} />
      </div>

      {error && <p className="error pad">{error}</p>}
      {!day && !error && <p className="muted pad">Opening the calendar…</p>}
      {day && <Day key={day.date} day={day} />}
    </div>
  )
}

/** The seven days from the Sunday on or before `date`, so the week reads at a glance. */
function Week({ date, onPick }) {
  const start = shift(date, -new Date(`${date}T12:00:00`).getDay())
  const dates = useMemo(() => Array.from({ length: 7 }, (_, i) => shift(start, i)), [start])
  const [names, setNames] = useState({})
  useEffect(() => {
    let live = true
    Promise.all(dates.map((d) => dayOf(d).catch(() => null))).then((all) => {
      if (!live) return
      setNames(Object.fromEntries(all.filter(Boolean).map((d) => [d.date, d])))
    })
    return () => {
      live = false
    }
  }, [dates])

  return (
    <ol className="week">
      {dates.map((d) => {
        const info = names[d]
        return (
          <li key={d}>
            <button className={d === date ? 'on' : ''} onClick={() => onPick(d)}>
              <span className={`lit-dot lit-${info?.color || 'none'}`} />
              <strong>
                {new Date(`${d}T12:00:00`).toLocaleDateString([], { weekday: 'short', day: 'numeric' })}
              </strong>
              <span className="muted small">{info?.principal?.name ?? ''}</span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

function Day({ day }) {
  const navigate = useNavigate()
  const insertLectionary = useContent((s) => s.insertLectionary)
  const cuedId = useCue((s) => s.itemId)
  const cue = useCue((s) => s.cue)

  const [optionId, setOptionId] = useState(day.options[0]?.id ?? null)
  const option = day.options.find((o) => o.id === optionId) ?? day.options[0] ?? null
  const parts = useMemo(() => (option ? partsOf(option.readings) : []), [option])

  // Psalm responses typed before are remembered by citation and filled back in.
  const initialSel = () => {
    const saved = readResponses()
    const out = {}
    for (const p of parts) {
      const r = isPsalm(p.part) && saved[p.choices[0]]
      if (r) out[p.part] = { response: r }
    }
    return out
  }
  const [sel, setSel] = useState(initialSel)
  useEffect(() => setSel(initialSel()), [optionId]) // eslint-disable-line react-hooks/exhaustive-deps
  const setPart = (part, patch) => setSel((s) => ({ ...s, [part]: { ...s[part], ...patch } }))

  // 'whole': each reading on one screen (default) · 'verses': a few verses per slide.
  const [layout, setLayout] = useState(() => readPref('worship-layout', 'whole'))
  const [maxWords, setMaxWords] = useState(() => Number(readPref('worship-words', 45)))
  const [titleSlide, setTitleSlide] = useState(true)
  const [progress, setProgress] = useState(null)
  const [result, setResult] = useState(null)

  const isSunday = new Date(`${day.date}T12:00:00`).getDay() === 0
  const p = day.principal

  const build = async () => {
    setResult(null)
    writePref('worship-words', maxWords)
    writePref('worship-layout', layout)
    saveResponses(parts, sel)
    try {
      const out = await buildMass(option, parts, sel, {
        layout,
        maxWords,
        titleSlide,
        onProgress: (f, label) => setProgress({ f, label }),
      })
      insertLectionary(out.group, out.items, cuedId)
      setResult(out)
      const first = out.items.find((it) => it.type === 'scripture') ?? out.items[0]
      if (first) cue(first.id)
    } catch (err) {
      setResult({ items: [], warnings: [err.message] })
    } finally {
      setProgress(null)
    }
  }

  if (!p) return <p className="empty pad">No celebration found for this date.</p>

  return (
    <div className="readings-body">
      <section className={`celebration lit-border-${day.color}`}>
        <div className="row between">
          <div>
            <h2 className="celebration-name">{p.name}</h2>
            <p className="muted">
              {gradeLabel(p, isSunday)} · {day.season} · {cap(day.color)}
            </p>
          </div>
          <div className="cycles">
            <span className={`cycle${isSunday || p.grade >= 6 ? ' on' : ''}`}>Year {day.cycles.sunday}</span>
            <span className={`cycle${!isSunday && p.grade < 6 ? ' on' : ''}`}>Year {day.cycles.weekday}</span>
          </div>
        </div>
        {day.events.length > 1 && (
          <p className="muted small">
            Also today:{' '}
            {day.events
              .slice(1)
              .map((e) => `${e.name} (${GRADES[e.grade].toLowerCase()})`)
              .join(' · ')}
          </p>
        )}
      </section>

      {day.options.length > 1 && (
        <section>
          <h3>Mass</h3>
          <div className="mass-options">
            {day.options.map((o) => (
              <label key={o.id} className={`mass-option${o.id === option?.id ? ' on' : ''}`}>
                <input type="radio" checked={o.id === option?.id} onChange={() => setOptionId(o.id)} />
                <span>
                  <strong>{o.title}</strong>
                  {(o.mass || o.note) && (
                    <span className="muted small"> — {[o.mass, o.note].filter(Boolean).join(' · ')}</span>
                  )}
                  <span className="muted small block">
                    {o.event.key !== day.principal.key || o.note === 'Evening Mass'
                      ? `Year ${o.cycles.sunday} · Year ${o.cycles.weekday}`
                      : ''}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </section>
      )}

      {option && (
        <section>
          <h3>Readings</h3>
          <ul className="parts">
            {parts.map((part) => {
              const s = sel[part.part] ?? {}
              const include = s.include !== false
              return (
                <li key={part.part} className={include ? '' : 'off'}>
                  <div className="part-row">
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={include}
                        onChange={(e) => setPart(part.part, { include: e.target.checked })}
                      />
                      <span className="part-label">{part.label}</span>
                    </label>
                    {part.choices.length > 1 ? (
                      <select
                        value={s.choice ?? 0}
                        onChange={(e) => setPart(part.part, { choice: Number(e.target.value) })}
                      >
                        {part.choices.map((c, i) => (
                          <option key={c} value={i}>
                            {choiceLabel(part, i)}
                            {c}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="citation">{part.choices[0]}</span>
                    )}
                    <div className="segmented source">
                      <button
                        className={s.source !== 'paste' ? 'on' : ''}
                        onClick={() => setPart(part.part, { source: 'dr' })}
                      >
                        Douay-Rheims
                      </button>
                      <button
                        className={s.source === 'paste' ? 'on' : ''}
                        onClick={() => setPart(part.part, { source: 'paste' })}
                      >
                        Paste
                      </button>
                    </div>
                  </div>

                  {include && isPsalm(part.part) && (
                    <input
                      className="response"
                      placeholder="Response (R.) — e.g. The Lord is my shepherd; there is nothing I shall want."
                      value={s.response ?? ''}
                      onChange={(e) => setPart(part.part, { response: e.target.value })}
                    />
                  )}
                  {include && s.source === 'paste' && (
                    <textarea
                      rows={5}
                      placeholder={
                        isPsalm(part.part)
                          ? 'Paste the psalm. Blank line between stanzas; a line starting “R.” is the response.'
                          : 'Paste the text from your lectionary or missal. It is split into slides by sentence.'
                      }
                      value={s.text ?? ''}
                      onChange={(e) => setPart(part.part, { text: e.target.value })}
                    />
                  )}
                </li>
              )
            })}
          </ul>

          <div className="row build-row">
            <div className="field inline">
              <span>On screen</span>
              <div className="segmented layout">
                <button className={layout === 'whole' ? 'on' : ''} onClick={() => setLayout('whole')}>
                  Whole reading
                </button>
                <button className={layout === 'verses' ? 'on' : ''} onClick={() => setLayout('verses')}>
                  A few verses at a time
                </button>
              </div>
            </div>
            {layout === 'verses' && (
              <label className="field inline">
                <span>Words per slide</span>
                <input
                  type="number"
                  min="15"
                  max="120"
                  step="5"
                  value={maxWords}
                  onChange={(e) => setMaxWords(Math.max(15, Number(e.target.value) || 45))}
                />
              </label>
            )}
            <label className="toggle">
              <input type="checkbox" checked={titleSlide} onChange={(e) => setTitleSlide(e.target.checked)} />
              <span>Title slide</span>
            </label>
            <button className="btn btn-primary btn-lg" onClick={build} disabled={!!progress}>
              {progress ? `Building… ${Math.round(progress.f * 100)}%` : 'Add readings to service'}
            </button>
          </div>
          {progress && <p className="muted small">{progress.label}</p>}
          {layout === 'whole' && !progress && (
            <p className="muted small">
              Each reading fills one screen — no pressing Next while it is read. Only very long ones (the
              Passion, some Vigil readings) split, into as few screens as stay readable.
            </p>
          )}

          {result && (
            <div className="build-result">
              {result.items.length > 0 && (
                <p>
                  Added {result.items.length} item{result.items.length === 1 ? '' : 's'} to the service.{' '}
                  <button className="btn btn-sm" onClick={() => navigate('/live')}>
                    Go to Live
                  </button>
                </p>
              )}
              {result.warnings.length > 0 && (
                <ul className="warnings">
                  {countWarnings(result.warnings).map(([w, n]) => (
                    <li key={w}>
                      {w}
                      {n > 1 && <span className="muted"> (×{n})</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <p className="muted small fineprint">
            Douay-Rheims is the public-domain Catholic Bible. Its wording is older than the lectionary your
            parish reads from; choose <em>Paste</em> on any reading to use your own text. Readings are fetched
            now and saved with the service, so the Mass itself runs offline.
          </p>
        </section>
      )}
    </div>
  )
}

function choiceLabel(part, i) {
  if (part.choices.length === 2 && (part.part === 'gospel' || part.part.endsWith('reading'))) {
    const [a, b] = part.choices.map(verseCount)
    if (a !== b) return (i === 0) === a > b ? 'Longer: ' : 'Shorter: '
  }
  return `Option ${i + 1}: `
}

/** Rough size of a citation, enough to tell a longer form from a shorter one. */
function verseCount(c) {
  let n = 0
  for (const m of c.matchAll(/(\d+)[a-g]*\s*-\s*(?:(\d+):)?(\d+)/g))
    n += m[2] ? 30 : Math.max(1, m[3] - m[1] + 1)
  return n + (c.match(/,/g)?.length ?? 0)
}

function countWarnings(list) {
  const m = new Map()
  for (const w of list) m.set(w, (m.get(w) ?? 0) + 1)
  return [...m]
}

const RESPONSES = 'worship-psalm-responses'

function readResponses() {
  try {
    return JSON.parse(localStorage.getItem(RESPONSES) ?? '{}')
  } catch {
    return {}
  }
}

function saveResponses(parts, sel) {
  const saved = readResponses()
  for (const p of parts) {
    const s = sel[p.part]
    if (isPsalm(p.part) && s?.response?.trim()) saved[p.choices[s.choice ?? 0]] = s.response.trim()
  }
  try {
    localStorage.setItem(RESPONSES, JSON.stringify(saved))
  } catch {
    /* convenience only */
  }
}

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function shift(iso, n) {
  const [y, m, d] = iso.split('-').map(Number)
  const t = new Date(y, m - 1, d + n)
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
}

/** Sundays carry a feast's rank in the calendar data; call them what they are. */
function gradeLabel(event, isSunday) {
  if (isSunday && event.grade === 5 && /Sunday|^(Advent|Lent|Easter)\d$/.test(event.key)) return 'Sunday'
  return GRADES[event.grade]
}

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : '')

function readPref(key, fallback) {
  try {
    return localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}

function writePref(key, value) {
  try {
    localStorage.setItem(key, String(value))
  } catch {
    /* preference only */
  }
}
