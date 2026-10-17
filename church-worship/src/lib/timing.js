/**
 * How long each part of the Mass takes — estimates for rehearsal and
 * livestream planning, not a stopwatch.
 *
 * Readings are timed at a lector's pace (about 130 words a minute, plus the
 * introduction), prayers at the slower pace of a congregation praying
 * together, hymns by their verses. The parts nothing is projected for — the
 * homily, the Collect, the Preface, the Eucharistic Prayer, the distribution
 * of Communion — appear as gaps between items, so the running times match a
 * real Mass.
 */

export const words = (text = '') => text.split(/\s+/).filter(Boolean).length
const textOf = (item) => item.slides.map((s) => s.body).join(' ')

// Fixed estimates for the parts of the Order of Mass, in seconds.
const PART_SECONDS = {
  'sign-greeting': 40,
  confiteor: 60,
  kyrie: 45,
  'gospel-dialogue': 20,
  'universal-prayer': 180,
  'orate-fratres': 30,
  'preface-dialogue': 20,
  sanctus: 50,
  'mystery-of-faith': 15,
  'great-amen': 25,
  'our-father': 50,
  'sign-of-peace': 60,
  'agnus-dei': 45,
  'ecce-agnus': 25,
  'blessing-dismissal': 40,
  gospel_acclamation: 45,
  'rite-final-commendation': 300,
  'rite-the-celebration-of-matrimony': 600,
  'rite-nuptial-blessing': 180,
}

/** Seconds a plan item takes while it is on screen. */
export function itemSeconds(item) {
  const part = item.lectionary?.part ?? ''
  if (part === 'title') return 0
  if (item.announcements) return item.autoAdvance > 0 ? 0 : Math.max(60, (words(textOf(item)) / 130) * 60)
  if (item.placeholder) return 150 // a hymn not chosen yet: a typical length
  if (item.type === 'song') return Math.max(90, item.slides.length * 40)
  if (PART_SECONDS[part]) return PART_SECONDS[part]
  if (part.startsWith('responsorial_psalm')) {
    const responses = item.slides.filter((s) => /^R\.\s/.test(s.body)).length
    return Math.round((words(textOf(item)) / 120) * 60 + responses * 6 + 10)
  }
  if (item.type === 'scripture') return Math.round((words(textOf(item)) / 130) * 60 + 20)
  if (part) return Math.max(20, Math.round((words(textOf(item)) / 110) * 60)) // prayers said together
  return Math.max(20, Math.round((words(textOf(item)) / 120) * 60))
}

/**
 * Rows for the timeline: each item with its start and length, and the
 * unprojected gaps between (homily, Eucharistic Prayer…).
 */
export function timeline(items, { homilyMinutes = 10 } = {}) {
  const rows = []
  let t = 0
  const parts = new Set(items.map((it) => it.lectionary?.part))
  const collectAfter = parts.has('gloria') ? 'gloria' : 'kyrie'
  const gapAfter = (part, item) => {
    if (part === collectAfter) return [45, 'Collect']
    if (part === 'gospel') return [homilyMinutes * 60, 'Homily']
    if (part === 'preface-dialogue') return [75, 'Preface']
    if (part === 'sanctus') return [240, 'Eucharistic Prayer']
    if (part === 'mystery-of-faith') return [120, 'Eucharistic Prayer']
    if (item.lectionary?.slot === 'hymn-communion') return [Math.max(0, 420 - itemSeconds(item)), 'Communion']
    return null
  }
  for (const item of items) {
    const seconds = itemSeconds(item)
    rows.push({ item, start: t, seconds })
    t += seconds
    const gap = gapAfter(item.lectionary?.part ?? item.lectionary?.slot, item)
    if (gap && gap[0] > 0) {
      rows.push({ gap: gap[1], start: t, seconds: gap[0] })
      t += gap[0]
    }
  }
  return { rows, total: t }
}

export const fmtDuration = (s) => {
  const m = Math.round(s / 60)
  return s < 60 ? `${Math.max(5, Math.round(s / 5) * 5)} s` : `${m} min`
}

/** "09:00" + seconds → "09:14"; without a start time, "14:30" from the beginning. */
export function clock(start, seconds) {
  if (start && /^\d{1,2}:\d{2}$/.test(start)) {
    const [h, m] = start.split(':').map(Number)
    const total = h * 60 + m + Math.floor(seconds / 60)
    return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
  }
  const m = Math.floor(seconds / 60)
  return `${m}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
}

// --- for lectors --------------------------------------------------------------------

// Names a lector reads every week without practice.
const FAMILIAR = new Set(
  `God Lord Jesus Christ Spirit Holy Father Son Israel Jerusalem Moses David Abraham Mary Joseph Peter Paul
  John James Simon Andrew Judas Thomas Matthew Mark Luke Amen Alleluia Sion Zion Egypt Jacob Isaac Elijah
  Satan Lamb Gentiles Pharisees Scribes Jews Galilee Juda Judah Judea Sabbath Heaven Saviour Savior Church
  Word Messias Messiah O Behold Thus Then And But For When Now If Let Blessed Glory Amen Lo`.split(/\s+/),
)

/**
 * Proper names a lector should practise: capitalised mid-sentence, not one
 * of the everyday ones. "Cyrus", "Nabuchodonosor", "Ephrata"…
 */
export function namesToPractise(text, limit = 6) {
  const found = new Map()
  // A capital after a sentence's end is just the start of a sentence: skip it.
  const re = /([^.!?:;"“\s]\s)([A-Z][a-zé]{3,}(?:-[A-Z][a-z]+)?)/g
  let m
  while ((m = re.exec(text))) {
    const w = m[2]
    if (FAMILIAR.has(w)) continue
    found.set(w, (found.get(w) ?? 0) + 1)
  }
  return [...found.keys()].sort((a, b) => b.length - a.length).slice(0, limit)
}

/** Reading time for a passage's text, as a lector reads it. */
export const readingSeconds = (text) => Math.round((words(text) / 130) * 60 + 20)
