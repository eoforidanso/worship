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

/** Services that are not a Mass: a running order of headed sections to fill. */
export const PROGRAMMES = [
  ['carols', 'Christmas Carols'],
  ['youth', 'Youth Programme'],
  ['dedication', 'Special Dedication'],
  ['dayborns', 'Day Borns'],
]

const PROGRAMME_SECTIONS = {
  carols: ['Welcome & opening prayer', 'Readings & carols', 'Reflection', 'Thanksgiving', 'Closing'],
  youth: ['Welcome & opening prayer', 'Praise & worship', 'Scripture & message', 'Youth activities', 'Closing prayer'],
  dedication: ['Welcome', 'Dedication ceremony', 'Songs & presentations', 'Thanksgiving', 'Closing'],
}

const textItem = (title, slides, extra = {}) => ({
  id: uid('it'),
  type: 'text',
  title,
  subtitle: '',
  themeId: 'theme_default',
  background: null,
  slides: slides.map((sl) => ({ id: uid('sl'), label: '', body: '', ...sl })),
  notes: '',
  autoAdvance: 0,
  ...extra,
})

/**
 * A programme: a title slide, then one heading slide per section. Songs,
 * readings and pictures are added under each heading from the library.
 */
function buildProgramme(kind) {
  const st = useContent.getState()
  const name = PROGRAMMES.find(([id]) => id === kind)[1]
  const parish = st.parish?.name?.trim()
  const items = [
    textItem(name, [{ body: [parish, name].filter(Boolean).join('\n') }], { subtitle: 'Title' }),
    ...PROGRAMME_SECTIONS[kind].map((section) => textItem(section, [{ body: section }], { subtitle: name })),
  ]
  st.insertItems(items)
  st.setPlanTitle(name)
  return { items, programme: true }
}

// The Akan day names: a boy's and a girl's for each day of the week.
const DAY_BORNS = [
  ['Sunday', 'Kwasi & Akosua', '#e56b1a'],
  ['Monday', 'Kwadwo & Adwoa', '#15bc34'],
  ['Tuesday', 'Kwabena & Abena', '#eab043'],
  ['Wednesday', 'Kwaku & Akua', '#439cea'],
  ['Thursday', 'Yaw & Yaa', '#d56cef'],
  ['Friday', 'Kofi & Afia', '#ea4343'],
  ['Saturday', 'Kwame & Ama', '#95f3a7'],
]

/**
 * Day Borns: for each day of the week its picture (when the Day Borns
 * pictures have been imported from Worship Studio) and its names in the day's
 * colour, then the winners. One item, so Next walks through all of it.
 */
async function buildDayBorns() {
  const st = useContent.getState()
  const { dayBornPictureName } = await import('./worshipStudioImport')
  const black = { kind: 'color', value: '#000000' }
  const slides = []
  let pictures = 0
  for (const [day, names, color] of DAY_BORNS) {
    const pic = st.media.find((m) => m.name === dayBornPictureName(day.toLowerCase()) && m.offline !== false)
    if (pic) {
      pictures++
      slides.push({
        label: `${day} — picture`,
        background: { kind: 'image', mediaId: pic.id, fit: 'contain', fallback: '#000000' },
      })
    }
    slides.push({ label: day, body: `${day}\n${names}`, color, background: black })
  }
  slides.push({ label: 'Winners', body: 'WINNERS', color: '#ffffff', background: black })
  const item = textItem('Day Borns', slides, {
    subtitle: 'Thanksgiving by day of birth',
    notes: pictures
      ? 'Edit the Winners slide with this week’s winning day.'
      : 'Pictures: Services → Import from Worship Studio brings the seven Day Borns pictures; then build Day Borns again.',
  })
  st.insertItems([item])
  st.setPlanTitle('Day Borns')
  return { items: [item], programme: true }
}

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
  if (kind === 'dayborns') return buildDayBorns()
  if (kind in PROGRAMME_SECTIONS) return buildProgramme(kind)

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
