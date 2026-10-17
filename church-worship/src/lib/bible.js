/**
 * Catholic Bible text for the lectionary.
 *
 * Lectionary citations ("Isaiah 35:1-6a, 10", "Psalm 116:12-13, 15-16bc") are
 * parsed here and resolved against the Douay-Rheims Bible — public domain, and
 * the one free English Catholic Bible with every deuterocanonical book
 * (Sirach, Wisdom, Baruch, Tobit, Judith, Maccabees) that the readings use.
 *
 * Text comes from api.getbible.net at prep time and is then saved into the
 * service as ordinary slides, so the Mass itself runs offline.
 *
 * Douay-Rheims follows the Vulgate's numbering; the lectionary follows the
 * Hebrew. `toDouay` converts the places where they differ (most of the
 * Psalms, Joel, Malachi, Hosea, Micah and a few chapters elsewhere).
 */

const API = 'https://api.getbible.net/v2/douayrheims'

const BOOKS = {
  Genesis: 1,
  Exodus: 2,
  Leviticus: 3,
  Numbers: 4,
  Deuteronomy: 5,
  Joshua: 6,
  Judges: 7,
  Ruth: 8,
  '1 Samuel': 9,
  '2 Samuel': 10,
  '1 Kings': 11,
  '2 Kings': 12,
  '1 Chronicles': 13,
  '2 Chronicles': 14,
  Ezra: 15,
  Nehemiah: 16,
  Tobit: 69,
  Judith: 70,
  Esther: 17,
  Job: 18,
  Psalms: 19,
  Proverbs: 20,
  Ecclesiastes: 21,
  'Song of Songs': 22,
  Wisdom: 73,
  Sirach: 74,
  Isaiah: 23,
  Jeremiah: 24,
  Lamentations: 25,
  Baruch: 75,
  Ezekiel: 26,
  Daniel: 27,
  Hosea: 28,
  Joel: 29,
  Amos: 30,
  Obadiah: 31,
  Jonah: 32,
  Micah: 33,
  Nahum: 34,
  Habakkuk: 35,
  Zephaniah: 36,
  Haggai: 37,
  Zechariah: 38,
  Malachi: 39,
  '1 Maccabees': 80,
  '2 Maccabees': 81,
  Matthew: 40,
  Mark: 41,
  Luke: 42,
  John: 43,
  Acts: 44,
  Romans: 45,
  '1 Corinthians': 46,
  '2 Corinthians': 47,
  Galatians: 48,
  Ephesians: 49,
  Philippians: 50,
  Colossians: 51,
  '1 Thessalonians': 52,
  '2 Thessalonians': 53,
  '1 Timothy': 54,
  '2 Timothy': 55,
  Titus: 56,
  Philemon: 57,
  Hebrews: 58,
  James: 59,
  '1 Peter': 60,
  '2 Peter': 61,
  '1 John': 62,
  '2 John': 63,
  '3 John': 64,
  Jude: 65,
  Revelation: 66,
}

// Spellings found in the lectionary data, plus the usual alternatives.
const ALIASES = {
  Psalm: 'Psalms',
  Ps: 'Psalms',
  'Song of Solomon': 'Song of Songs',
  Ecclesiasticus: 'Sirach',
  Qoheleth: 'Ecclesiastes',
  Tobiah: 'Tobit',
  Tobias: 'Tobit',
  Apocalypse: 'Revelation',
  'Revelation of John': 'Revelation',
  '1 Corithians': '1 Corinthians',
  '1 Pt': '1 Peter',
  Hewbrews: 'Hebrews',
  Marc: 'Mark',
  Mattthew: 'Matthew',
  Proverbe: 'Proverbs',
  // The one bare "Maccabees" in the data is 2 Mc 7 (32nd Sunday, Year C).
  Maccabees: '2 Maccabees',
}

export function canonicalBook(name) {
  const n = name
    .replace(/\s+/g, ' ')
    .replace(/^([1-3])(\S)/, '$1 $2')
    .trim()
  return BOOKS[n] ? n : ALIASES[n] && BOOKS[ALIASES[n]] ? ALIASES[n] : null
}

// --- citation parsing --------------------------------------------------------

const END = 999 // "to the end of the chapter"; clamped once the chapter is known

/**
 * "Hebrews 4:14-16; 5:7-9" → [{ book, ranges: [{ c1, v1, c2, v2, part }] }]
 * Partial-verse letters (6a, 16bc) are kept as `part` but the whole verse is
 * shown: the operator trims if the lectionary stops mid-verse.
 */
export function parseCitation(raw) {
  let s = raw
    .replace(/[–—]/g, '-')
    .replace(/\band\b/g, ',')
    .replace(/^\s*Cf\.?\s*/i, '')
    .trim()

  const out = []
  let book = null
  let vulgate = false // "Psalm 18 (19)": first number is already Vulgate
  let chapter = null

  for (let seg of s.split(';')) {
    seg = seg.trim()
    if (!seg) continue
    const m = seg.match(/^((?:[1-3]\s?)?[A-Za-z][A-Za-z ]*?)\.?\s+(?=[\dA-F](?:[\d:,\- ]|$|\s*\())/)
    if (m) {
      const name = canonicalBook(m[1])
      if (!name) throw new Error(`Unknown book “${m[1]}” in ${raw}`)
      book = { book: name, ranges: [] }
      out.push(book)
      seg = seg.slice(m[0].length)
      chapter = null
      vulgate = false
    }
    if (!book) throw new Error(`Can't read the citation “${raw}”`)

    const paren = seg.match(/^(\d+)\s*\((\d+)\)\s*$/)
    if (paren) {
      vulgate = true
      book.vulgate = true
      book.ranges.push({ c1: +paren[1], v1: 1, c2: +paren[1], v2: END })
      continue
    }

    let items
    if (seg.includes(':')) {
      const i = seg.indexOf(':')
      chapter = chap(seg.slice(0, i))
      items = seg.slice(i + 1)
    } else if (chapter == null) {
      // "Psalm 89" (whole psalm) or the odd "Psalm 84,5" (chapter, verse).
      const parts = seg.split(',').map((x) => x.trim())
      if (parts.length === 1) {
        const c = chap(parts[0])
        book.ranges.push({ c1: c, v1: 1, c2: c, v2: END })
        continue
      }
      chapter = chap(parts[0])
      items = parts.slice(1).join(',')
    } else {
      items = seg
    }

    for (let it of items.split(',')) {
      it = it.trim()
      if (!it) continue
      const [a, b] = it.split('-').map((x) => x.trim())
      const start = verse(a)
      let c2 = chapter
      let end = start
      if (b && /^[a-g]+$/.test(b)) {
        // "1b-e": parts of one verse
      } else if (b) {
        if (b.includes(':')) {
          const [bc, bv] = b.split(':')
          c2 = chap(bc)
          end = verse(bv)
        } else end = verse(b)
      }
      book.ranges.push({ c1: chapter, v1: start.n, c2, v2: end.n, part: start.part })
      chapter = c2
    }
  }
  return out
}

function chap(x) {
  const t = x.trim()
  if (/^[A-F]$/.test(t)) return t // Esther's lettered chapters (NAB)
  const n = parseInt(t, 10)
  if (Number.isNaN(n)) throw new Error(`Bad chapter “${x}”`)
  return n
}

function verse(x) {
  const m = String(x)
    .trim()
    .match(/^(\d+)([a-g]*)/)
  if (!m) throw new Error(`Bad verse “${x}”`)
  return { n: +m[1], part: m[2] || '' }
}

// --- versification -----------------------------------------------------------

/** Lectionary (Hebrew-based) chapter:verse → Douay-Rheims chapter:verse. */
export function toDouay(book, c, v, { vulgate = false, part = '', end = false } = {}) {
  switch (book) {
    case 'Psalms':
      if (vulgate || c <= 8 || c >= 148) return [c, v]
      if (c === 9) return [9, v]
      if (c === 10) return [9, v + 21]
      if (c <= 113) return [c - 1, v]
      if (c === 114) return [113, v]
      if (c === 115) return [113, v + 8]
      if (c === 116) return v <= 9 ? [114, v] : [115, v - 9]
      if (c <= 146) return [c - 1, v]
      return v <= 11 ? [146, v] : [147, v - 11] // 147
    case 'Joel':
      if (c === 3) return [2, v + 27]
      if (c === 4) return [3, v]
      return [c, v]
    case 'Malachi':
      return c === 3 && v >= 19 ? [4, v - 18] : [c, v]
    case 'Hosea':
      if (c === 2) return v <= 2 ? [1, v + 9] : [2, v - 2]
      if (c === 12) return v === 1 ? [11, 12] : [12, v - 1]
      if (c === 14) return v === 1 ? [13, 16] : [14, v - 1]
      return [c, v]
    case 'Micah':
      if (c === 4 && v === 14) return [5, 1]
      return c === 5 ? [5, v + 1] : [c, v]
    case 'Isaiah':
      if (c === 8 && v === 23) return [9, 1]
      if (c === 9) return [9, v + 1]
      if (c === 63 && v === 19 && part.startsWith('b')) return [64, 1]
      if (c === 64) return [64, v + 1]
      return [c, v]
    case 'Jeremiah':
      if (c === 8 && v === 23) return [9, 1]
      return c === 9 ? [9, v + 1] : [c, v]
    case 'Zechariah':
      return c === 2 ? (v <= 4 ? [1, v + 17] : [2, v - 4]) : [c, v]
    case '1 Kings':
      if (c === 5) return v <= 14 ? [4, v + 20] : [5, v - 14]
      return [c, v]
    case 'John':
      // The Vulgate splits 6:51 in two ("…my flesh, for the life of the world" is 6:52).
      if (c === 6 && v >= 52) return [6, v + 1]
      if (c === 6 && v === 51 && end) return [6, 52]
      return [c, v]
    case '3 John':
      return c === 1 && v === 15 ? [1, 14] : [c, v]
    case 'Esther':
      // NAB's lettered additions. Only C (the prayers) is used at Mass.
      if (c === 'C') return v <= 11 ? [13, v + 7] : [14, v - 11]
      return [c, v]
    default:
      return [c, v]
  }
}

/** Books where Douay-Rheims diverges enough that the operator should check. */
export const CHECK_BOOKS = new Set(['Sirach', 'Tobit', 'Judith', 'Esther'])

// --- fetching ------------------------------------------------------------------

const chapterCache = new Map()

async function fetchChapter(book, chapter) {
  const key = `${book}:${chapter}`
  if (chapterCache.has(key)) return chapterCache.get(key)
  const p = (async () => {
    let res
    try {
      res = await fetch(`${API}/${BOOKS[book]}/${chapter}.json`)
    } catch {
      throw new Error(
        "Couldn't reach the Bible service. Check the connection — readings are fetched during prep.",
      )
    }
    if (!res.ok) throw new Error(`${book} ${chapter} isn't available (${res.status}).`)
    const data = await res.json()
    const verses = new Map()
    for (const v of data.verses ?? []) verses.set(v.verse, clean(v.text))
    return verses
  })()
  chapterCache.set(key, p)
  p.catch(() => chapterCache.delete(key))
  return p
}

/**
 * Resolve a citation to verses. Returns
 * `{ citation, book, verses: [{ ref, text, group }] }` where `group` is the
 * index of the comma-separated piece it came from — psalm stanzas follow those.
 */
export async function fetchPassage(citation) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error("You're offline. Build the readings during prep, while there's a connection.")
  }
  const books = parseCitation(citation)
  const verses = []
  let group = 0
  for (const b of books) {
    for (const r of b.ranges) {
      const opts = { vulgate: b.vulgate, part: r.part }
      const [sc, sv] = toDouay(b.book, r.c1, r.v1, opts)
      const single = r.c1 === r.c2 && r.v1 === r.v2
      const [ec, ev] = toDouay(b.book, r.c2, r.v2, {
        vulgate: b.vulgate,
        part: single ? r.part : '',
        end: true,
      })
      for (let c = sc; c <= ec; c++) {
        const chapter = await fetchChapter(b.book, c)
        const last = Math.max(...chapter.keys())
        const from = c === sc ? sv : 1
        const to = c === ec ? Math.min(ev >= END - 50 ? last : ev, last) : last
        for (let v = from; v <= to; v++) {
          let text = chapter.get(v)
          if (text && b.book === 'Psalms' && v <= 2) text = stripTitle(text)
          if (text) verses.push({ ref: `${c}:${v}`, text, group, book: b.book })
        }
      }
      group++
    }
  }
  if (!verses.length) throw new Error(`No text found for ${citation}.`)
  return { citation, book: books[0].book, books: books.map((b) => b.book), verses }
}

/**
 * Douay-Rheims runs a psalm's heading into its first verse ("A canticle for
 * David himself, when the house was built after the captivity. Sing ye to
 * the Lord a new canticle…"). The lectionary never proclaims the heading.
 */
const TITLE =
  /^(?:(?:unto the end|a psalm|psalm|a canticle|canticle|a prayer|a gradual canticle|the title|for david|of david|for asaph|for the sons of core|for the octave|understanding|on the day|in the end|a song|for idithun|for solomon|for moses|for the presses|for them that shall be changed|for the inscription|praise,? for david[^.]*)[^.:]*[.:]\s*)+/i

export function stripTitle(text) {
  const out = text.replace(TITLE, '')
  return out.length >= 12 ? out : text
}

function clean(text) {
  return text.replace(/\s+/g, ' ').trim()
}

// --- headings -------------------------------------------------------------------

const PROPHETS = new Set([
  'Isaiah',
  'Jeremiah',
  'Ezekiel',
  'Daniel',
  'Hosea',
  'Joel',
  'Amos',
  'Obadiah',
  'Jonah',
  'Micah',
  'Nahum',
  'Habakkuk',
  'Zephaniah',
  'Haggai',
  'Zechariah',
  'Malachi',
  'Baruch',
])
const PAUL = {
  Romans: 'to the Romans',
  '1 Corinthians': 'to the Corinthians',
  '2 Corinthians': 'to the Corinthians',
  Galatians: 'to the Galatians',
  Ephesians: 'to the Ephesians',
  Philippians: 'to the Philippians',
  Colossians: 'to the Colossians',
  '1 Thessalonians': 'to the Thessalonians',
  '2 Thessalonians': 'to the Thessalonians',
  '1 Timothy': 'to Timothy',
  '2 Timothy': 'to Timothy',
  Titus: 'to Titus',
  Philemon: 'to Philemon',
}
const ORDINAL = { 1: 'first', 2: 'second', 3: 'third' }

/** "A reading from the Book of the Prophet Isaiah", the way the ambo says it. */
export function incipit(book) {
  const n = book.match(/^([1-3]) (.+)$/)
  const ord = n ? `${ORDINAL[n[1]]} ` : ''
  const base = n ? n[2] : book
  if (['Matthew', 'Mark', 'Luke', 'John'].includes(book))
    return `A reading from the holy Gospel according to ${book}`
  if (book === 'Acts') return 'A reading from the Acts of the Apostles'
  if (PAUL[book]) return `A reading from the ${ord}Letter of Saint Paul ${PAUL[book]}`
  if (book === 'Hebrews') return 'A reading from the Letter to the Hebrews'
  if (['James', 'Jude'].includes(book)) return `A reading from the Letter of Saint ${book}`
  if (n && ['Peter', 'John'].includes(base)) return `A reading from the ${ord}Letter of Saint ${base}`
  if (book === 'Revelation') return 'A reading from the Book of Revelation'
  if (PROPHETS.has(book)) return `A reading from the Book of the Prophet ${book}`
  if (book === 'Song of Songs') return 'A reading from the Song of Songs'
  if (book === 'Lamentations') return 'A reading from the Book of Lamentations'
  if (n) return `A reading from the ${ord}Book of ${base}`
  return `A reading from the Book of ${book}`
}
