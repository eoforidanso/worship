import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { RITUALS, ritualOption } from '../data/ritual'
import { useContent } from '../store/useContent'
import { useCue } from '../store/useLive'
import {
  dayOf,
  partsOf,
  isPsalm,
  GRADES,
  LANDMARKS,
  nextOccurrence,
  searchCelebrations,
} from '../lib/lectionary'
import { buildMass } from '../lib/massBuilder'
import { buildWholeMass, massContext } from '../lib/orderOfMass'
import { ORDER, belongs } from '../data/orderOfMass'
import { fetchPassage } from '../lib/bible'
import { fillHymnPlaces, HYMN_SLOTS } from '../lib/hymnSuggest'
import { hymnSuggestionsFor, isSundayMass } from '../lib/autoMass'
import { rememberedSelections, saveResponses, importResponses } from '../lib/responses'
import { announcementItem, showsOn } from '../lib/announcements'
import { uid } from '../lib/id'
import { DRAG_READING } from '../lib/dragTypes'
import { fmtDuration, namesToPractise, readingSeconds } from '../lib/timing'

/**
 * The readings — and the whole Mass — for a date.
 *
 * Find the day (Sunday to Sunday, a month at a glance, "Jump to Easter", or
 * search a feast or saint); check the readings in the preview; adjust the
 * suggested hymns if you like; then one button adds the Mass. Everything
 * else is under Options.
 */
export default function Readings() {
  // ?ritual=funeral|wedding: the same page, with the rite's own readings.
  const [params] = useSearchParams()
  const ritual = RITUALS[params.get('ritual')] ? params.get('ritual') : ''
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

  // Planning keys (see "?"): N/P Sundays, [ ] days, T today, F or / to find a feast.
  useEffect(() => {
    const onKey = (e) => {
      const el = document.activeElement
      if (
        el &&
        (el.tagName === 'INPUT' ||
          el.tagName === 'TEXTAREA' ||
          el.tagName === 'SELECT' ||
          el.isContentEditable)
      )
        return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const dow = new Date(`${date}T12:00:00`).getDay()
      const go = {
        n: () => setDate(shift(date, 7 - dow || 7)),
        p: () => setDate(shift(date, -(dow || 7))),
        ']': () => setDate(shift(date, 1)),
        '[': () => setDate(shift(date, -1)),
        t: () => setDate(today()),
        f: () => document.querySelector('.feast-search input')?.focus(),
        '/': () => document.querySelector('.feast-search input')?.focus(),
      }[e.key.toLowerCase()]
      if (go) {
        e.preventDefault()
        go()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [date])

  // Swipe left / right between days on a tablet.
  const touch = useRef(null)
  const onTouchStart = (e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })
  const onTouchEnd = (e) => {
    if (!touch.current) return
    const dx = e.changedTouches[0].clientX - touch.current.x
    const dy = e.changedTouches[0].clientY - touch.current.y
    touch.current = null
    if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy) * 2) setDate(shift(date, dx < 0 ? 1 : -1))
  }

  return (
    <div className="readings" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <DateBar date={date} setDate={setDate} planDate={planDate} />
      {error && <p className="error pad">{error}</p>}
      {!day && !error && <p className="muted pad">Opening the calendar…</p>}
      {day && <Day key={`${day.date}:${ritual}`} day={day} ritual={ritual} />}
    </div>
  )
}

// --- finding the day ---------------------------------------------------------------

function DateBar({ date, setDate, planDate }) {
  const [view, setView] = useState(() => readPref('worship-cal-view', 'week'))
  const pick = (d) => d && setDate(d)
  const sunday = (dir) => {
    const dow = new Date(`${date}T12:00:00`).getDay()
    return shift(date, dir > 0 ? 7 - dow || 7 : -(dow || 7))
  }
  return (
    <div className="readings-head">
      <div className="row date-bar">
        <button className="btn" onClick={() => setDate(sunday(-1))} title="Previous Sunday">
          ◀◀ Sunday
        </button>
        <button
          className="btn"
          onClick={() => setDate(shift(date, -1))}
          aria-label="Previous day"
          title="Previous day"
        >
          ◀
        </button>
        <input type="date" value={date} onChange={(e) => pick(e.target.value)} aria-label="Date" />
        <button
          className="btn"
          onClick={() => setDate(shift(date, 1))}
          aria-label="Next day"
          title="Next day"
        >
          ▶
        </button>
        <button className="btn" onClick={() => setDate(sunday(1))} title="Next Sunday">
          Sunday ▶▶
        </button>
        <select
          className="jump"
          value=""
          aria-label="Jump to"
          onChange={async (e) => pick(await nextOccurrence(e.target.value, today()))}
        >
          <option value="">Jump to…</option>
          {LANDMARKS.map(([key, name]) => (
            <option key={key} value={key}>
              {name}
            </option>
          ))}
        </select>
        <FeastSearch onPick={pick} />
        <span className="row tight">
          <button className="btn btn-ghost btn-sm" onClick={() => setDate(today())}>
            Today
          </button>
          {planDate && planDate !== date && (
            <button className="btn btn-ghost btn-sm" onClick={() => setDate(planDate)}>
              Service date
            </button>
          )}
          <span className="segmented layout">
            {['week', 'month'].map((v) => (
              <button
                key={v}
                className={view === v ? 'on' : ''}
                onClick={() => {
                  setView(v)
                  writePref('worship-cal-view', v)
                }}
              >
                {v === 'week' ? 'Week' : 'Month'}
              </button>
            ))}
          </span>
        </span>
      </div>
      {view === 'week' ? <Week date={date} onPick={setDate} /> : <Month date={date} onPick={setDate} />}
    </div>
  )
}

function FeastSearch({ onPick }) {
  const [q, setQ] = useState('')
  const [hits, setHits] = useState([])
  useEffect(() => {
    let live = true
    const t = setTimeout(() => searchCelebrations(q, today()).then((h) => live && setHits(h)), 150)
    return () => {
      live = false
      clearTimeout(t)
    }
  }, [q])
  return (
    <span className="feast-search">
      <input
        placeholder="Find a feast or saint…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && hits[0]) {
            onPick(hits[0].date)
            setQ('')
          }
          if (e.key === 'Escape') setQ('')
        }}
      />
      {q.trim().length >= 2 && (
        <ul className="quick-hits feast-hits">
          {hits.map((h) => (
            <li key={h.key}>
              <button
                onClick={() => {
                  onPick(h.date)
                  setQ('')
                }}
              >
                <span className={`lit-dot lit-${h.color}`} />
                <span className="plan-text">
                  <span className="plan-title-text">{h.name}</span>
                  <span className="muted small">
                    {longDate(h.date)} · {GRADES[h.grade]}
                  </span>
                </span>
              </button>
            </li>
          ))}
          {!hits.length && <li className="muted small pad-s">Nothing by that name in the next year.</li>}
        </ul>
      )}
    </span>
  )
}

/** The seven days from the Sunday on or before `date`. */
function Week({ date, onPick }) {
  const start = shift(date, -new Date(`${date}T12:00:00`).getDay())
  const dates = useMemo(() => Array.from({ length: 7 }, (_, i) => shift(start, i)), [start])
  const names = useDays(dates)
  return (
    <ol className="week">
      {dates.map((d) => (
        <li key={d}>
          <button className={d === date ? 'on' : ''} onClick={() => onPick(d)}>
            <span className={`lit-dot lit-${names[d]?.color || 'none'}`} />
            <strong>
              {new Date(`${d}T12:00:00`).toLocaleDateString([], { weekday: 'short', day: 'numeric' })}
            </strong>
            <span className="muted small">{names[d]?.principal?.name ?? ''}</span>
          </button>
        </li>
      ))}
    </ol>
  )
}

/** A month at a glance, Sundays first, each day with its colour and name. */
function Month({ date, onPick }) {
  const [y, m] = date.split('-').map(Number)
  const first = `${y}-${String(m).padStart(2, '0')}-01`
  const lead = new Date(`${first}T12:00:00`).getDay()
  const count = new Date(y, m, 0).getDate()
  const dates = useMemo(
    () =>
      Array.from(
        { length: count },
        (_, i) => `${y}-${String(m).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`,
      ),
    [y, m, count],
  )
  const names = useDays(dates)
  return (
    <div className="month">
      <div className="month-head">
        <button className="btn btn-ghost btn-sm" onClick={() => onPick(shift(first, -1).slice(0, 8) + '01')}>
          ◀
        </button>
        <strong>
          {new Date(`${first}T12:00:00`).toLocaleDateString([], { month: 'long', year: 'numeric' })}
        </strong>
        <button className="btn btn-ghost btn-sm" onClick={() => onPick(shift(first, count))}>
          ▶
        </button>
      </div>
      <ol className="month-grid">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <li key={d} className="dow">
            {d}
          </li>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <li key={`x${i}`} />
        ))}
        {dates.map((d, i) => {
          const info = names[d]
          const big = info?.principal && (info.principal.grade >= 4 || (lead + i) % 7 === 0)
          return (
            <li key={d}>
              <button className={`${d === date ? 'on' : ''}${big ? ' big' : ''}`} onClick={() => onPick(d)}>
                <span className="month-day">
                  {i + 1} <span className={`lit-dot lit-${info?.color || 'none'}`} />
                </span>
                <span className="month-name">{big ? info.principal.name : ''}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function useDays(dates) {
  const [names, setNames] = useState({})
  useEffect(() => {
    let live = true
    Promise.all(dates.map((d) => dayOf(d).catch(() => null))).then((all) => {
      if (live) setNames(Object.fromEntries(all.filter(Boolean).map((d) => [d.date, d])))
    })
    return () => {
      live = false
    }
  }, [dates])
  return names
}

// --- the day -----------------------------------------------------------------------

function Day({ day, ritual }) {
  const navigate = useNavigate()
  const insertLectionary = useContent((s) => s.insertLectionary)
  const placeAnnouncements = useContent((s) => s.placeAnnouncements)
  const songs = useContent((s) => s.songs)
  const announcements = useContent((s) => s.announcements)
  const cuedId = useCue((s) => s.itemId)
  const cue = useCue((s) => s.cue)

  const options = useMemo(() => (ritual ? [ritualOption(ritual, day)] : day.options), [ritual, day])
  const rite = ritual ? RITUALS[ritual] : null
  const [who, setWho] = useState('')
  const [optionId, setOptionId] = useState(options[0]?.id ?? null)
  const option = options.find((o) => o.id === optionId) ?? options[0] ?? null
  const parts = useMemo(() => (option ? partsOf(option.readings) : []), [option])

  const [sel, setSel] = useState(() => rememberedSelections(parts))
  useEffect(() => setSel(rememberedSelections(parts)), [optionId]) // eslint-disable-line react-hooks/exhaustive-deps
  const setPart = (part, patch) => setSel((s) => ({ ...s, [part]: { ...s[part], ...patch } }))
  const [previewPart, setPreviewPart] = useState(parts[0]?.part ?? null)
  useEffect(() => setPreviewPart(parts[0]?.part ?? null), [optionId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Options, folded away; remembered between visits.
  const [layout, setLayout] = useState(() => readPref('worship-layout', 'whole'))
  const [maxWords, setMaxWords] = useState(() => Number(readPref('worship-words', 45)))
  const [titleSlide, setTitleSlide] = useState(true)
  const [what, setWhat] = useState(() => readPref('worship-what', 'mass'))
  const [withNotices, setWithNotices] = useState(() => readPref('worship-with-notices', '1') === '1')
  const [optionsOpen, setOptionsOpen] = useState(false)
  const prayers = useContent((s) => s.prayers)
  const setPrayer = useContent((s) => s.setPrayer)

  const [progress, setProgress] = useState(null)
  const [result, setResult] = useState(null)

  const p = day.principal
  const isSunday = new Date(`${day.date}T12:00:00`).getDay() === 0
  const noMass = option?.event.key === 'GoodFri'
  const wholeMass = what === 'mass' && !noMass
  const massSunday = option ? isSundayMass(option, day.date) : false
  const ctx = option ? massContext(option, massSunday) : null
  const [include, setInclude] = useState({})
  useEffect(() => setInclude({}), [optionId])
  const gloria =
    include.gloria ??
    (rite ? rite.gloria : null) ??
    (ctx
      ? belongs(
          ORDER.find((x) => x.id === 'gloria'),
          ctx,
        )
      : false)
  const creed =
    include.creed ??
    (rite ? false : null) ?? // funeral and wedding Masses have no Creed
    (ctx
      ? belongs(
          ORDER.find((x) => x.id === 'creed'),
          ctx,
        )
      : false)

  // Suggested hymns, changeable per place.
  const suggestions = useMemo(
    () => (option ? hymnSuggestionsFor(option, day.date) : {}),
    [option, day.date, songs],
  )
  const [picks, setPicks] = useState({})
  useEffect(() => {
    setPicks(Object.fromEntries(HYMN_SLOTS.map((slot) => [slot, suggestions[slot]?.[0]?.id ?? ''])))
  }, [suggestions])
  const notices = announcements.filter((a) => showsOn(a, day.date))

  const build = async () => {
    setResult(null)
    writePref('worship-words', maxWords)
    writePref('worship-layout', layout)
    writePref('worship-what', what)
    writePref('worship-with-notices', withNotices ? '1' : '0')
    saveResponses(parts, sel)
    try {
      const common = { layout, maxWords, titleSlide, onProgress: (f, label) => setProgress({ f, label }) }
      const out = wholeMass
        ? await buildWholeMass(option, parts, sel, {
            ...common,
            isSunday: massSunday,
            include: { gloria, creed },
            hymns: true,
            prayers,
            ritual,
            ritualWho: who,
          })
        : await buildMass(option, parts, sel, common)
      const items = wholeMass ? fillHymnPlaces(out.items, picks, songs, uid) : out.items
      insertLectionary(out.group, items, cuedId)
      if (wholeMass && withNotices && notices.length) {
        placeAnnouncements(announcementItem(announcements, day.date, 0), 'after-communion')
      }
      setResult({ ...out, items, notices: wholeMass && withNotices ? notices.length : 0 })
      const first = items.find((it) => it.type === 'scripture') ?? items[0]
      if (first) cue(first.id)
    } catch (err) {
      setResult({ items: [], warnings: [err.message] })
    } finally {
      setProgress(null)
    }
  }

  // J / K step the preview through the readings; A adds the Mass.
  useEffect(() => {
    const onKey = (e) => {
      const el = document.activeElement
      if (
        el &&
        (el.tagName === 'INPUT' ||
          el.tagName === 'TEXTAREA' ||
          el.tagName === 'SELECT' ||
          el.isContentEditable)
      )
        return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key.toLowerCase()
      if (k === 'j' || k === 'k') {
        e.preventDefault()
        const i = parts.findIndex((x) => x.part === previewPart)
        const next = parts[Math.min(parts.length - 1, Math.max(0, i + (k === 'j' ? 1 : -1)))]
        if (next) setPreviewPart(next.part)
      }
      if (k === 'a' && !progress) {
        e.preventDefault()
        build()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!p) return <p className="empty pad">No celebration found for this date.</p>
  const included = parts.filter((x) => sel[x.part]?.include !== false)
  const summary = [
    wholeMass ? 'Whole Mass' : 'Readings only',
    wholeMass && (gloria ? 'Gloria' : 'no Gloria'),
    wholeMass && (creed ? 'Creed' : 'no Creed'),
    layout === 'whole' ? 'one screen per reading' : `${maxWords} words a slide`,
    wholeMass && withNotices && notices.length
      ? `${notices.length} notice${notices.length === 1 ? '' : 's'}`
      : null,
  ].filter(Boolean)

  return (
    <div className="readings-body">
      <section className={`celebration lit-border-${day.color}`}>
        <div className="row between">
          <div>
            {rite && <span className="badge rite-badge">{rite.title}</span>}
            <h2 className="celebration-name">{rite ? `${rite.title} · ${longDate(day.date)}` : p.name}</h2>
            <p className="muted">
              {longDate(day.date)} · {gradeLabel(p, isSunday)} · {day.season} · {cap(day.color)}
            </p>
          </div>
          <div className="cycles">
            <span className={`cycle${isSunday || p.grade >= 6 ? ' on' : ''}`}>Year {day.cycles.sunday}</span>
            <span className={`cycle${!isSunday && p.grade < 6 ? ' on' : ''}`}>Year {day.cycles.weekday}</span>
          </div>
        </div>
        {rite && (
          <div className="row rite-row">
            <input
              className="notice-title"
              placeholder={rite.who}
              value={who}
              onChange={(e) => setWho(e.target.value)}
              aria-label={rite.who}
            />
            <Link to="/readings" className="small">
              Back to the day’s readings
            </Link>
            <span className="muted small full-row">
              Choose each reading with the family from the list in its row; the first is the usual default.
              The rite’s own moments ({rite.extras.map((x) => x.title).join(', ')}) go in as title slides.
            </span>
          </div>
        )}
        {!rite && day.events.length > 1 && (
          <p className="muted small">
            Also today:{' '}
            {day.events
              .slice(1)
              .map((e) => `${e.name} (${GRADES[e.grade].toLowerCase()})`)
              .join(' · ')}
          </p>
        )}
        {options.length > 1 && (
          <label className="field inline mass-pick">
            <span>Mass</span>
            <select value={option?.id} onChange={(e) => setOptionId(e.target.value)}>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {[o.title, o.mass, o.note].filter(Boolean).join(' — ')}
                </option>
              ))}
            </select>
          </label>
        )}
      </section>

      {option && (
        <div className="readings-split">
          <section>
            <h3>Readings</h3>
            <ul className="parts">
              {parts.map((part) => {
                const s = sel[part.part] ?? {}
                const on = s.include !== false
                return (
                  <li
                    key={part.part}
                    className={`${on ? '' : 'off'}${previewPart === part.part ? ' previewing' : ''} draggable`}
                    draggable
                    title="Drag into the service plan to add just this reading"
                    onDragStart={(e) => {
                      e.dataTransfer.setData(
                        DRAG_READING,
                        JSON.stringify({ date: day.date, optionId: option.id, part: part.part, sel: s }),
                      )
                      e.dataTransfer.effectAllowed = 'copy'
                    }}
                    onClick={(e) => {
                      if (!e.target.closest('input,select,textarea,button,label')) setPreviewPart(part.part)
                    }}
                  >
                    <div className="part-row">
                      <label className="toggle" title={on ? 'Included' : 'Left out'}>
                        <input
                          type="checkbox"
                          checked={on}
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
                      <select
                        className="translation"
                        aria-label="Text"
                        value={s.source === 'paste' ? 'paste' : 'dr'}
                        onChange={(e) => setPart(part.part, { source: e.target.value })}
                      >
                        <option value="dr">Douay-Rheims (built in)</option>
                        <option value="paste">Our lectionary (paste)</option>
                      </select>
                      <button
                        className="btn btn-ghost btn-sm preview-btn"
                        onClick={() => setPreviewPart(part.part)}
                        aria-pressed={previewPart === part.part}
                      >
                        Preview
                      </button>
                    </div>

                    {on && <ReadingFacts part={part} sel={s} />}
                    {on && isPsalm(part.part) && (
                      <input
                        className={`response${s.response?.trim() ? '' : ' needs'}`}
                        placeholder="Type the response (R.) from your lectionary — remembered for next time"
                        value={s.response ?? ''}
                        onChange={(e) => setPart(part.part, { response: e.target.value })}
                      />
                    )}
                    {on && s.source === 'paste' && (
                      <textarea
                        rows={5}
                        placeholder={
                          isPsalm(part.part)
                            ? 'Paste the psalm. Blank line between stanzas; a line starting “R.” is the response.'
                            : 'Paste the text from your lectionary or missal.'
                        }
                        value={s.text ?? ''}
                        onChange={(e) => setPart(part.part, { text: e.target.value })}
                      />
                    )}
                    {previewPart === part.part && (
                      <div className="preview-inline">
                        <Preview part={part} sel={s} />
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>

            {wholeMass && (
              <section className="hymn-picks">
                <h3>Hymns</h3>
                <p className="muted small">
                  Suggested for {day.season || 'the day'} from your library. Change any.
                </p>
                {HYMN_SLOTS.map((slot) => {
                  const title = ORDER.find((x) => x.id === slot)?.title
                  const list = suggestions[slot] ?? []
                  return (
                    <label key={slot} className="field inline hymn-pick">
                      <span>{title}</span>
                      <select
                        value={picks[slot] ?? ''}
                        onChange={(e) => setPicks((x) => ({ ...x, [slot]: e.target.value }))}
                      >
                        <option value="">— leave the place empty —</option>
                        {list.length > 0 && (
                          <optgroup label="Suggested">
                            {list.slice(0, 6).map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.title}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        <optgroup label="All songs">
                          {[...songs]
                            .filter((s) => !list.slice(0, 6).includes(s))
                            .sort((a, b) => a.title.localeCompare(b.title))
                            .map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.title}
                              </option>
                            ))}
                        </optgroup>
                      </select>
                    </label>
                  )
                })}
              </section>
            )}
          </section>

          <aside className="preview-pane">
            <h3>Preview</h3>
            {previewPart ? (
              <Preview part={parts.find((x) => x.part === previewPart)} sel={sel[previewPart] ?? {}} />
            ) : (
              <p className="muted">Choose a reading to see its text.</p>
            )}
          </aside>
        </div>
      )}

      {option && (
        <div className="action-bar">
          <button
            className="btn btn-primary btn-xl"
            onClick={build}
            disabled={!!progress || !included.length}
          >
            {progress
              ? `Building… ${Math.round(progress.f * 100)}%`
              : wholeMass
                ? 'Add Mass to service'
                : 'Add readings to service'}
          </button>
          <span className="action-summary muted small">
            {progress
              ? progress.label
              : `${included.length} reading${included.length === 1 ? '' : 's'} · ${summary.join(' · ')}`}
          </span>
          <button
            className={`btn btn-ghost${optionsOpen ? ' on' : ''}`}
            onClick={() => setOptionsOpen((v) => !v)}
          >
            Options {optionsOpen ? '▴' : '▾'}
          </button>
        </div>
      )}

      {option && optionsOpen && (
        <div className="options-panel">
          <div className="field inline">
            <span>Add</span>
            <div className="segmented layout">
              <button className={wholeMass ? 'on' : ''} onClick={() => setWhat('mass')} disabled={noMass}>
                Whole Mass
              </button>
              <button className={!wholeMass ? 'on' : ''} onClick={() => setWhat('readings')}>
                Readings only
              </button>
            </div>
          </div>
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
          {wholeMass && (
            <>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={gloria}
                  onChange={(e) => setInclude((i) => ({ ...i, gloria: e.target.checked }))}
                />
                <span>Gloria</span>
              </label>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={creed}
                  onChange={(e) => setInclude((i) => ({ ...i, creed: e.target.checked }))}
                />
                <span>Creed</span>
              </label>
              {creed && (
                <select
                  value={prayers.creed?.choice ?? 'nicene'}
                  onChange={(e) => setPrayer('creed', { choice: e.target.value })}
                >
                  <option value="nicene">Nicene Creed</option>
                  <option value="apostles">Apostles’ Creed</option>
                </select>
              )}
              <label className="field inline">
                <span>Mystery of Faith</span>
                <select
                  value={prayers['mystery-of-faith']?.choice ?? 'one'}
                  onChange={(e) => setPrayer('mystery-of-faith', { choice: e.target.value })}
                >
                  <option value="one">First acclamation</option>
                  <option value="two">Second acclamation</option>
                  <option value="three">Third acclamation</option>
                </select>
              </label>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={withNotices}
                  onChange={(e) => setWithNotices(e.target.checked)}
                />
                <span>Notices after Communion ({notices.length})</span>
              </label>
              <Link to="/prayers" className="small">
                Prayer wording →
              </Link>
            </>
          )}
          <ResponsesImport />
          {noMass && (
            <p className="muted small full-row">
              Good Friday has no Mass — only the readings are added. Its Celebration of the Passion has its
              own order.
            </p>
          )}
          <p className="muted small full-row">
            Gloria and Creed are set for the day; change them if your parish does otherwise. Douay-Rheims is
            the public-domain Catholic Bible; the lectionary translations (NABRE, Jerusalem Bible, RSV-CE) are
            licensed, so paste those. Text is fetched now and saved with the service — Mass itself runs
            offline.
          </p>
        </div>
      )}

      {result && <BuildResult result={result} onLive={() => navigate('/live')} />}
    </div>
  )
}

/** At a glance, for the planner and the lector: how long, and which names to practise. */
function ReadingFacts({ part, sel }) {
  const citation = part.choices[sel.choice ?? 0]
  const pasted = sel.source === 'paste' ? sel.text?.trim() : ''
  const [facts, setFacts] = useState(null)
  useEffect(() => {
    let live = true
    const done = (text) =>
      live &&
      setFacts({
        time: fmtDuration(readingSeconds(text)),
        names: isPsalm(part.part) ? [] : namesToPractise(text),
      })
    if (pasted) done(pasted)
    else
      fetchPassage(citation)
        .then((p) => done(p.verses.map((v) => v.text).join(' ')))
        .catch(() => live && setFacts(null))
    return () => {
      live = false
    }
  }, [citation, pasted, part.part])
  if (!facts || part.part === 'gospel_acclamation') return null
  return (
    <p className="reading-facts muted small">
      ≈ {facts.time}
      {facts.names.length > 0 && (
        <>
          {' · '}Names to practise: <span className="names">{facts.names.join(', ')}</span>
        </>
      )}
    </p>
  )
}

/** What a reading will say, before it's added. */
function Preview({ part, sel }) {
  const citation = part.choices[sel.choice ?? 0]
  const pasted = sel.source === 'paste' ? sel.text?.trim() : ''
  const [state, setState] = useState({ loading: true })
  useEffect(() => {
    let live = true
    if (pasted) return setState({ text: pasted })
    setState({ loading: true })
    fetchPassage(citation)
      .then((p) => live && setState({ verses: p.verses }))
      .catch((e) => live && setState({ error: e.message }))
    return () => {
      live = false
    }
  }, [citation, pasted])

  return (
    <div className="preview">
      <div className="row between">
        <strong>{part.label}</strong>
        <span className="muted small">
          {citation} · {pasted ? 'your text' : 'Douay-Rheims'}
        </span>
      </div>
      {isPsalm(part.part) && sel.response?.trim() && (
        <p className="preview-response">R. {sel.response.trim()}</p>
      )}
      {state.loading && <p className="muted">Loading the text…</p>}
      {state.error && <p className="error small">{state.error}</p>}
      {state.text && <p className="preview-text">{state.text}</p>}
      {state.verses && (
        <div className="preview-text">
          {isPsalm(part.part)
            ? groupStanzas(state.verses).map((st, i) => (
                <p key={i}>
                  {st.map((v) => (
                    <span key={v.ref}>
                      <sup>{v.ref.split(':')[1]}</sup> {v.text}{' '}
                    </span>
                  ))}
                </p>
              ))
            : state.verses.map((v) => (
                <span key={v.ref}>
                  <sup>{v.ref.split(':')[1]}</sup> {v.text}{' '}
                </span>
              ))}
        </div>
      )}
    </div>
  )
}

function groupStanzas(verses) {
  const out = []
  for (const v of verses) (out[v.group] ??= []).push(v)
  return out.filter(Boolean)
}

/** ✓ what went in, ⚠ what still wants attention. */
function BuildResult({ result, onLive }) {
  const done = result.items.filter((it) => it.lectionary?.part !== 'title')
  const warn = countWarnings(result.warnings ?? [])
  return (
    <div className="build-result">
      {done.length > 0 && (
        <div className="row between">
          <strong>Added to the service</strong>
          <button className="btn btn-primary btn-sm" onClick={onLive}>
            Go to Live
          </button>
        </div>
      )}
      <ul className="checklist">
        {done.map((it) => (
          <li key={it.id} className={it.placeholder ? 'warn' : 'ok'}>
            {it.placeholder ? '○' : '✓'}{' '}
            {it.lectionary?.slot && !it.placeholder ? `${it.subtitle}: ${it.title}` : it.title}
            {it.placeholder && <span className="muted small"> — empty, choose a song</span>}
          </li>
        ))}
        {result.notices > 0 && <li className="ok">✓ Announcements ({result.notices})</li>}
        {warn.map(([w, n]) => (
          <li key={w} className="warn">
            ⚠ {w}
            {n > 1 && <span className="muted"> (×{n})</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Paste a year's psalm responses at once — dates or citations, one per line. */
function ResponsesImport() {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [note, setNote] = useState('')
  if (!open)
    return (
      <button className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>
        Paste a list of psalm responses…
      </button>
    )
  return (
    <div className="responses-import full-row">
      <p className="muted small">
        One per line: a date or the psalm citation, then the response — separated by a tab, “|” or “ — ”.
      </p>
      <textarea
        rows={5}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={
          '2026-10-18 | Give the Lord glory and honor.\nPsalm 23:1-3a, 3b-4, 5, 6 | The Lord is my shepherd; there is nothing I shall want.'
        }
      />
      <div className="row">
        <button
          className="btn btn-primary btn-sm"
          disabled={!text.trim()}
          onClick={async () => {
            const r = await importResponses(text)
            setNote(
              `Remembered ${r.added} response${r.added === 1 ? '' : 's'}.${r.skipped.length ? ` Couldn’t read ${r.skipped.length} line(s).` : ''} They fill in when you open those days.`,
            )
            setText('')
          }}
        >
          Remember these
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
          Close
        </button>
        {note && <span className="muted small">{note}</span>}
      </div>
    </div>
  )
}

// --- helpers -------------------------------------------------------------------------

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

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function shift(iso, n) {
  const [y, m, d] = iso.split('-').map(Number)
  const t = new Date(y, m - 1, d + n)
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
}

function longDate(iso) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString([], {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
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
