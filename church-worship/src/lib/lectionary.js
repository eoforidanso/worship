/**
 * The Roman Lectionary, keyed to the calendar.
 *
 * Pick a date and get that day's celebration and its readings — the right
 * Sunday cycle (Year A, B or C), the right weekday cycle (Year I or II), the
 * proper of the season, solemnities and feasts that displace the Sunday, and
 * the saint of the day where there is one.
 *
 * Both halves ship with the app, so this works with no network:
 *  - data/lectionary.json   every citation in the Lectionary for Mass
 *  - data/calendar/YYYY.json the General Roman Calendar, 2025–2040, with
 *    Epiphany, Ascension and Corpus Christi kept on Sunday
 * (both from the Liturgical Calendar Project, Apache-2.0 — see data/NOTICE.md).
 *
 * Only the Bible *text* needs the network, at prep time (lib/bible.js).
 */

import LECTIONARY from '../data/lectionary.json'

const calendarFiles = import.meta.glob('../data/calendar/*.json', { import: 'default' })
const API = 'https://litcal.johnromanodorazio.com/api/v5/calendar'
const API_OPTS = 'locale=en&year_type=CIVIL&epiphany=SUNDAY_JAN2_JAN8&ascension=SUNDAY&corpus_christi=SUNDAY'

// --- calendar ------------------------------------------------------------------

const years = new Map()

/** `{ 'YYYY-MM-DD': [[key, name, grade, colour, season, vigilFor?], …] }` */
async function loadYear(year) {
  if (years.has(year)) return years.get(year)
  const p = (async () => {
    const file = calendarFiles[`../data/calendar/${year}.json`]
    if (file) return file()
    // Outside the bundled years: ask the API once, then keep it on this machine.
    const cacheKey = `worship-litcal-${year}`
    try {
      const hit = localStorage.getItem(cacheKey)
      if (hit) return JSON.parse(hit)
    } catch {
      /* no storage — fetch */
    }
    const res = await fetch(`${API}/${year}?${API_OPTS}`, { headers: { Accept: 'application/json' } }).catch(
      () => null,
    )
    if (!res?.ok)
      throw new Error(`The calendar for ${year} isn't built in, and couldn't be fetched (offline?).`)
    const days = {}
    for (const e of (await res.json()).litcal ?? []) {
      const row = [e.event_key, e.name, e.grade, e.color?.[0] ?? '', e.liturgical_season ?? '']
      if (e.is_vigil_mass) row.push(e.is_vigil_for ?? '')
      ;(days[e.date.slice(0, 10)] ??= []).push(row)
    }
    try {
      localStorage.setItem(cacheKey, JSON.stringify(days))
    } catch {
      /* fine — fetched again next time */
    }
    return days
  })()
  years.set(year, p)
  p.catch(() => years.delete(year))
  return p
}

export const GRADES = [
  'Weekday',
  'Commemoration',
  'Optional Memorial',
  'Memorial',
  'Feast',
  'Feast of the Lord',
  'Solemnity',
  'Solemnity',
]

const SEASONS = {
  ADVENT: 'Advent',
  CHRISTMAS: 'Christmas Time',
  LENT: 'Lent',
  EASTER_TRIDUUM: 'Easter Triduum',
  EASTER: 'Easter Time',
  ORDINARY_TIME: 'Ordinary Time',
}

/** First Sunday of Advent in a civil year: the Sunday from 27 Nov to 3 Dec. */
function advent1(year) {
  const d = new Date(year, 11, 3)
  d.setDate(d.getDate() - d.getDay())
  return d
}

/**
 * Lectionary cycles for a date. The liturgical year starts at Advent, and is
 * named for the civil year it mostly falls in: Year A when that year is
 * divisible by 3 with remainder 1, weekday Year I when it is odd.
 */
export function cyclesFor(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const litYear = date >= advent1(y) ? y + 1 : y
  return { sunday: ['C', 'A', 'B'][litYear % 3], weekday: litYear % 2 ? 'I' : 'II', litYear }
}

function addDays(iso, n) {
  const [y, m, d] = iso.split('-').map(Number)
  const t = new Date(y, m - 1, d + n)
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
}

// --- readings ------------------------------------------------------------------

function lookupReadings(key, cycles) {
  const L = LECTIONARY
  return (
    L[cycles.sunday][key] ??
    L[cycles.weekday][key] ??
    L.advent[key] ??
    L.christmas[key] ??
    L.lent[key] ??
    L.easter[key] ??
    L.saints[key] ??
    null
  )
}

const MASS_LABELS = {
  vigil: 'Vigil Mass',
  night: 'Mass during the Night',
  dawn: 'Mass at Dawn',
  day: 'Mass during the Day',
  evening: 'Evening Mass',
  schema_one: 'First set of readings',
  schema_two: 'Second set of readings',
  schema_three: 'Third set of readings',
}

/** A readings object may hold several Masses (Christmas, Easter, Pentecost…). */
function splitMasses(readings) {
  const vals = Object.values(readings)
  if (vals.length && vals.every((v) => v && typeof v === 'object')) {
    return Object.entries(readings).map(([id, r]) => ({ id, label: MASS_LABELS[id] ?? id, readings: r }))
  }
  return [{ id: 'main', label: '', readings }]
}

/**
 * Everything the readings page needs for one date.
 *
 * `options` are the Masses that can be celebrated, best first: the
 * celebration of the day, then — on a memorial — the saint's proper
 * readings, and on Saturday evening the anticipated Mass of Sunday.
 */
export async function dayOf(iso) {
  const days = await loadYear(Number(iso.slice(0, 4)))
  const rows = days[iso] ?? []
  const cycles = cyclesFor(iso)

  const events = rows
    .filter((r) => r.length < 6)
    .map(([key, name, grade, color, season]) => ({ key, name, grade, color, season }))
    .sort((a, b) => b.grade - a.grade)
  const vigils = rows
    .filter((r) => r.length >= 6)
    .map(([key, name, grade, color, season, vigilFor]) => ({ key, name, grade, color, season, vigilFor }))

  const principal = events[0] ?? null
  const options = []
  const push = (event, cyc, extra = {}) => {
    const r = lookupReadings(event.key, cyc)
    if (!r) return
    let masses = splitMasses(r)
    // On the day itself the vigil Mass is already past (it was last evening).
    if (masses.length > 1) masses = masses.filter((m) => m.id !== 'vigil')
    // Most Masses on the day use "during the Day"; put it first.
    masses.sort((a, b) => (b.id === 'day') - (a.id === 'day'))
    for (const mass of masses) {
      options.push({
        id: `${event.key}:${mass.id}`,
        event,
        title: extra.title ?? event.name,
        mass: mass.label,
        cycles: cyc,
        readings: mass.readings,
        note: extra.note ?? '',
      })
    }
  }

  // Memorials and optional memorials take the weekday's readings unless the
  // celebrant chooses the saint's; anything higher has its own.
  const weekday = events.find((e) => e.grade === 0)
  if (principal && principal.grade <= 3 && weekday) {
    push(weekday, cycles, {
      title: principal.grade > 0 ? `${weekday.name} (${principal.name})` : weekday.name,
    })
    for (const e of events.filter((e) => e.grade > 0 && e.grade <= 3)) {
      push(e, cycles, { title: e.name, note: `Readings for the ${GRADES[e.grade].toLowerCase()}` })
    }
  } else if (principal) {
    push(principal, cycles)
  }

  // Saturday (or the eve of a solemnity) evening: the next day's Mass.
  for (const v of vigils) {
    const nextCycles = cyclesFor(addDays(iso, 1))
    const r = lookupReadings(v.vigilFor, nextCycles)
    if (!r) continue
    const masses = splitMasses(r)
    // Christmas, Pentecost & co. have their own vigil readings; Sundays reuse the day's.
    const own = masses.find((m) => m.id === 'vigil')
    for (const mass of own ? [own] : masses.filter((m) => m.id !== 'evening')) {
      options.push({
        id: `${v.key}:${mass.id}`,
        event: { ...v, key: v.vigilFor },
        title: v.name,
        mass: own ? '' : mass.label,
        cycles: nextCycles,
        readings: mass.readings,
        note: 'Evening Mass',
      })
    }
  }

  return {
    date: iso,
    cycles,
    principal,
    events,
    season: principal ? (SEASONS[principal.season] ?? '') : '',
    color: principal?.color ?? '',
    options,
  }
}

/** Short label for the top bar: "29th Sunday of Ordinary Time · Year A". */
export async function describeDay(iso) {
  const d = await dayOf(iso)
  if (!d.principal) return null
  const isSunday = new Date(`${iso}T12:00:00`).getDay() === 0
  const cycle = isSunday || d.principal.grade >= 6 ? `Year ${d.cycles.sunday}` : `Year ${d.cycles.weekday}`
  // Sundays rank with feasts of the Lord in the calendar data; call them Sundays.
  const sunday =
    isSunday && d.principal.grade === 5 && /Sunday|^(Advent|Lent|Easter)\d$/.test(d.principal.key)
  return {
    name: d.principal.name,
    grade: sunday ? 'Sunday' : GRADES[d.principal.grade],
    color: d.color,
    cycle,
    season: d.principal.season ?? '',
  }
}

// --- parts of the Mass ---------------------------------------------------------

/** The order the parts are proclaimed in, and what each is called. */
export const PARTS = [
  ['palm_gospel', 'Gospel at the Procession with Palms'],
  ['first_reading', 'First Reading'],
  ['responsorial_psalm', 'Responsorial Psalm'],
  ['second_reading', 'Second Reading'],
  ['responsorial_psalm_2', 'Responsorial Psalm'],
  ['third_reading', 'Third Reading'],
  ['responsorial_psalm_3', 'Responsorial Psalm'],
  ['fourth_reading', 'Fourth Reading'],
  ['responsorial_psalm_4', 'Responsorial Psalm'],
  ['fifth_reading', 'Fifth Reading'],
  ['responsorial_psalm_5', 'Responsorial Psalm'],
  ['sixth_reading', 'Sixth Reading'],
  ['responsorial_psalm_6', 'Responsorial Psalm'],
  ['seventh_reading', 'Seventh Reading'],
  ['responsorial_psalm_7', 'Responsorial Psalm'],
  ['epistle', 'Epistle'],
  ['responsorial_psalm_epistle', 'Responsorial Psalm'],
  ['gospel_acclamation', 'Gospel Acclamation'],
  ['gospel', 'Gospel'],
]

/** `[{ part, label, choices: ['Isaiah 2:1-5', …] }]`, skipping empty parts. */
export function partsOf(readings) {
  const out = []
  for (const [part, label] of PARTS) {
    const raw = readings[part]
    if (!raw) continue
    const choices = raw
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean)
    if (choices.length) out.push({ part, label, choices })
  }
  return out
}

export const isPsalm = (part) => part.startsWith('responsorial_psalm')

// --- finding days ----------------------------------------------------------------

/**
 * Celebrations whose name matches `query`, from `fromIso` on (this year and
 * next), each listed once at its next date: "Assumption", "Joseph", "Advent".
 */
export async function searchCelebrations(query, fromIso, limit = 8) {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []
  const y = Number(fromIso.slice(0, 4))
  const out = []
  const seen = new Set()
  for (const year of [y, y + 1]) {
    const days = await loadYear(year).catch(() => ({}))
    for (const date of Object.keys(days).sort()) {
      if (date < fromIso) continue
      for (const [key, name, grade, color, , vigilFor] of days[date]) {
        if (vigilFor !== undefined || seen.has(key) || !name.toLowerCase().includes(q)) continue
        seen.add(key)
        out.push({ date, key, name, grade, color })
      }
    }
  }
  // Solemnities and feasts first, then by date.
  return out.sort((a, b) => b.grade - a.grade || a.date.localeCompare(b.date)).slice(0, limit)
}

/** The next date (on or after `fromIso`) a celebration falls. */
export async function nextOccurrence(key, fromIso) {
  const y = Number(fromIso.slice(0, 4))
  for (const year of [y, y + 1]) {
    const days = await loadYear(year).catch(() => ({}))
    const hit = Object.keys(days)
      .sort()
      .find((d) => d >= fromIso && days[d].some((r) => r[0] === key && r.length < 6))
    if (hit) return hit
  }
  return null
}

/** Landmarks of the year for "Jump to". */
export const LANDMARKS = [
  ['Advent1', 'First Sunday of Advent'],
  ['Christmas', 'Christmas'],
  ['Epiphany', 'Epiphany'],
  ['AshWednesday', 'Ash Wednesday'],
  ['PalmSun', 'Palm Sunday'],
  ['Easter', 'Easter Sunday'],
  ['Ascension', 'Ascension'],
  ['Pentecost', 'Pentecost'],
  ['Assumption', 'Assumption'],
  ['AllSaints', 'All Saints'],
  ['ChristKing', 'Christ the King'],
]
