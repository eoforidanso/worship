/**
 * "Build this Sunday's Mass" in one press: the day's readings, the Order of
 * Mass with Gloria and Creed as the day requires, hymn places filled with
 * suggestions from the library, and this week's notices after Communion.
 * Everything stays editable afterwards; nothing here is final.
 */

import { uid } from './id'
import { dayOf, partsOf } from './lectionary'
import { buildMass } from './massBuilder'
import { buildWholeMass } from './orderOfMass'
import { suggestHymns, fillHymnPlaces } from './hymnSuggest'
import { announcementItem, showsOn } from './announcements'
import { rememberedSelections } from './responses'
import { useContent } from '../store/useContent'

/** A Saturday evening Mass is the Sunday's. */
export function isSundayMass(option, date) {
  const dow = new Date(`${date}T12:00:00`).getDay()
  return dow === 0 || (option?.note === 'Evening Mass' && dow === 6)
}

/** The hymn each place would get, best first, for a Mass option. */
export function hymnSuggestionsFor(option, date) {
  return suggestHymns(useContent.getState().songs, {
    season: option.event.season,
    eventKey: option.event.key,
    eventName: option.event.name ?? option.title,
    date,
  })
}

export async function buildDefaultMass(date, { onProgress, vigil = false } = {}) {
  const day = await dayOf(date)
  // Saturday evening: the anticipated Mass of Sunday, when asked for.
  const option = (vigil && day.options.find((o) => o.note === 'Evening Mass')) || day.options[0]
  if (!option) throw new Error('No Mass found for this date.')
  const parts = partsOf(option.readings)
  const sel = rememberedSelections(parts)
  const st = useContent.getState()
  const common = { layout: 'whole', titleSlide: true, onProgress }

  const noMass = option.event.key === 'GoodFri'
  const out = noMass
    ? await buildMass(option, parts, sel, common)
    : await buildWholeMass(option, parts, sel, {
        ...common,
        isSunday: isSundayMass(option, date),
        hymns: true,
        prayers: st.prayers,
      })

  const suggestions = hymnSuggestionsFor(option, date)
  const picks = Object.fromEntries(
    Object.entries(suggestions).map(([slot, list]) => [slot, list[0]?.id ?? '']),
  )
  const items = fillHymnPlaces(out.items, picks, st.songs, uid)
  st.insertLectionary(out.group, items)

  const notices = st.announcements.filter((a) => showsOn(a, date))
  if (notices.length && !noMass)
    st.placeAnnouncements(announcementItem(st.announcements, date, 0), 'after-communion')

  return { ...out, items, option, picks, notices: notices.length }
}

// --- templates -------------------------------------------------------------------

export const TEMPLATES = [
  ['vigil', 'Saturday Vigil Mass'],
  ['weekday', 'Weekday Mass'],
  ['school', 'School Mass'],
  ['holyday', 'Next Holy Day'],
  ['funeral', 'Funeral Mass…'],
  ['wedding', 'Wedding Mass…'],
]

// Holy days of obligation in the universal calendar (some fall on Sunday here).
const HOLY_DAYS = [
  'MaryMotherOfGod',
  'Epiphany',
  'StJoseph',
  'Ascension',
  'CorpusChristi',
  'StsPeterPaulAp',
  'Assumption',
  'AllSaints',
  'ImmaculateConception',
  'Christmas',
]

const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const addDays = (date, n) => {
  const d = new Date(`${date}T12:00:00`)
  d.setDate(d.getDate() + n)
  return iso(d)
}
const dow = (date) => new Date(`${date}T12:00:00`).getDay()

/**
 * Build a service from a template on (or near) `date`. Funeral and wedding
 * return `{ open: '/readings?ritual=…' }`: their readings are chosen with the
 * family, on the Readings page.
 */
export async function buildTemplate(kind, date, { onProgress } = {}) {
  const st = useContent.getState()
  if (kind === 'funeral' || kind === 'wedding') return { open: `/readings?ritual=${kind}` }

  if (kind === 'vigil') {
    const sat = dow(date) === 0 ? addDays(date, -1) : addDays(date, (6 - dow(date) + 7) % 7)
    st.setPlanDate(sat)
    const out = await buildDefaultMass(sat, { onProgress, vigil: true })
    st.setPlanTitle(`Vigil Mass · ${out.option.event.name ?? out.option.title}`)
    return out
  }
  if (kind === 'weekday' || kind === 'school') {
    const d = dow(date) === 0 ? addDays(date, 1) : dow(date) === 6 ? addDays(date, 2) : date
    st.setPlanDate(d)
    const out = await buildDefaultMass(d, { onProgress })
    if (kind === 'school') st.setPlanTitle(`School Mass · ${out.option.title}`)
    return out
  }
  if (kind === 'holyday') {
    const { nextOccurrence } = await import('./lectionary')
    const today = iso(new Date())
    const dates = (await Promise.all(HOLY_DAYS.map((k) => nextOccurrence(k, today)))).filter(Boolean)
    const next = dates.filter((d) => dow(d) !== 0).sort()[0] ?? dates.sort()[0]
    if (!next) throw new Error('No holy day found in the calendar.')
    st.setPlanDate(next)
    return buildDefaultMass(next, { onProgress })
  }
  return buildDefaultMass(date, { onProgress })
}
