/**
 * Turn a day's readings into plan items, the way they are proclaimed.
 *
 * Each part of the Liturgy of the Word becomes one item in the service —
 * First Reading, Responsorial Psalm, Second Reading, Gospel Acclamation,
 * Gospel — so the operator steps through the Mass in the order it happens.
 *
 * Two layouts:
 *  - 'whole' (default): each reading is one screen, so nobody presses Next
 *    while it is proclaimed. Only a reading too long to read from the pews
 *    (over `screenWords`, e.g. the Passion) is split, into the fewest equal
 *    screens.
 *  - 'verses': a heading slide ("A reading from the Book of the Prophet
 *    Isaiah"), a few verses per slide, and the closing dialogue; the psalm
 *    stanza by stanza with the response between.
 * Text pasted from the parish's own lectionary takes the place of the
 * Douay-Rheims for any part.
 */

import { uid } from './id'
import { fetchPassage, incipit, CHECK_BOOKS, parseCitation } from './bible'
import { isPsalm } from './lectionary'

const SOURCE = 'Douay-Rheims'

const slide = (label, body, footer = '') => ({ id: uid('sl'), label, body, footer })

/** Group verses into slides of about `maxWords`, never splitting a verse. */
function chunkVerses(verses, maxWords) {
  const out = []
  let cur = []
  let words = 0
  for (const v of verses) {
    const n = v.text.split(/\s+/).length
    if (cur.length && words + n > maxWords) {
      out.push(cur)
      cur = []
      words = 0
    }
    cur.push(v)
    words += n
  }
  if (cur.length) out.push(cur)
  return out
}

const words = (t) => t.split(/\s+/).filter(Boolean).length

/**
 * Split into the fewest screens of at most about `limit` words, evened out —
 * a 300-word reading becomes two of 150, not one of 220 and one of 80.
 */
function balance(units, limit) {
  const sizes = units.map((u) => words(u.text))
  const total = sizes.reduce((a, b) => a + b, 0)
  // A little over the limit still fits; splitting it would cost a press for nothing.
  if (total <= limit * 1.15 || units.length < 2) return [units]
  for (let n = Math.ceil(total / limit); n <= units.length; n++) {
    const groups = partition(units, sizes, n)
    if (Math.max(...groups.map((g) => g.reduce((a, u) => a + words(u.text), 0))) <= limit * 1.15) return groups
  }
  return units.map((u) => [u])
}

/**
 * Split `units` into exactly `n` contiguous groups with the largest group as
 * small as possible (the classic linear partition), never splitting a verse.
 */
function partition(units, sizes, n) {
  const k = units.length
  const prefix = [0]
  for (const s of sizes) prefix.push(prefix.at(-1) + s)
  const span = (i, j) => prefix[j] - prefix[i] // words in units[i..j)
  // best[g][j]: smallest possible largest group, splitting the first j units into g groups
  const best = Array.from({ length: n + 1 }, () => new Array(k + 1).fill(Infinity))
  const cut = Array.from({ length: n + 1 }, () => new Array(k + 1).fill(0))
  best[0][0] = 0
  for (let g = 1; g <= n; g++) {
    for (let j = g; j <= k; j++) {
      for (let i = g - 1; i < j; i++) {
        const v = Math.max(best[g - 1][i], span(i, j))
        if (v < best[g][j]) {
          best[g][j] = v
          cut[g][j] = i
        }
      }
    }
  }
  const out = []
  let j = k
  for (let g = n; g >= 1; g--) {
    const i = cut[g][j]
    out.unshift(units.slice(i, j))
    j = i
  }
  return out
}

/** Pasted prose → sentences. */
function sentences(text) {
  return text
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .flatMap(
      (para) =>
        para
          .replace(/\s+/g, ' ')
          .trim()
          .match(/[^.!?;:]+[.!?;:]+["'’”)]*\s*|[^.!?;:]+$/g) ?? [],
    )
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => ({ text: s }))
}

/** Pasted prose → the fewest readable screens (≤ `screenWords` each). */
export function textToScreens(text, screenWords = 220, label = '', footer = '') {
  return balance(sentences(text), screenWords).map((g) =>
    slide(label, g.map((v) => v.text).join(' '), footer),
  )
}

/** Pasted prose → slides: sentences packed to about `maxWords`. */
export function textToSlides(text, maxWords, label = '', footer = '') {
  const sentences = text
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .flatMap(
      (para) =>
        para
          .replace(/\s+/g, ' ')
          .trim()
          .match(/[^.!?;:]+[.!?;:]+["'’”)]*\s*|[^.!?;:]+$/g) ?? [],
    )
    .map((s) => s.trim())
    .filter(Boolean)
  const verses = sentences.map((s) => ({ text: s }))
  return chunkVerses(verses, maxWords).map((group) =>
    slide(label, group.map((v) => v.text).join(' '), footer),
  )
}

/** Pasted psalm: blank lines between stanzas; a line starting "R." is the response. */
function pastedPsalm(text, response, footer) {
  const out = []
  let resp = response
  for (const block of text.replace(/\r\n/g, '\n').split(/\n\s*\n/)) {
    const b = block.trim()
    if (!b) continue
    const m = b.match(/^R[.:/]\s*(.+)$/is)
    if (m) {
      resp = resp || m[1].trim()
      out.push(slide('Response', `R. ${m[1].trim()}`, footer))
    } else out.push(slide('Stanza', b, footer))
  }
  return { slides: out, response: resp }
}

const isGospel = (part) => part === 'gospel' || part === 'palm_gospel'

function opening(part, book, ctx) {
  const passion = part === 'gospel' && ['PalmSun', 'GoodFri'].includes(ctx.eventKey)
  return passion ? `The Passion of our Lord Jesus Christ according to ${book}` : incipit(book)
}

function closing(part) {
  return isGospel(part)
    ? 'The Gospel of the Lord.\nPraise to you, Lord Jesus Christ.'
    : 'The word of the Lord.\nThanks be to God.'
}

/**
 * Build one part. `sel` is `{ citation, source: 'dr'|'paste', text, response }`.
 * Returns `{ slides, warning }`.
 */
async function buildPart({ part, label }, sel, ctx) {
  const { citation } = sel
  const { maxWords, screenWords, layout } = ctx
  const whole = layout === 'whole'
  const footer = citation
  const pasted = sel.source === 'paste' && sel.text?.trim()
  const pageOf = (i, n) => (n > 1 ? ` · ${i + 1}/${n}` : '')

  // --- responsorial psalm ---
  if (isPsalm(part)) {
    const response = sel.response?.trim() ?? ''
    const R = () => slide('Response', `R. ${response}`, footer)
    if (whole) {
      // The response on top, then every stanza, blank line between.
      let stanzas
      if (pasted) {
        stanzas = sel.text
          .replace(/\r\n/g, '\n')
          .split(/\n\s*\n/)
          .map((b) => b.trim())
          .filter((b) => b && !/^R[.:/]/i.test(b))
      } else {
        const passage = await fetchPassage(citation)
        const groups = []
        for (const v of passage.verses) (groups[v.group] ??= []).push(v.text)
        stanzas = groups.filter(Boolean).map((g) => g.join('\n'))
      }
      const head = response ? `R. ${response}\n\n` : ''
      const pages = balance(
        stanzas.map((t) => ({ text: t })),
        screenWords,
      )
      return {
        slides: pages.map((g, i) =>
          slide(
            label,
            head + g.map((v) => v.text).join('\n\n'),
            `${label} · ${citation}${pasted ? '' : ` · ${SOURCE}`}${pageOf(i, pages.length)}`,
          ),
        ),
        warning: response ? '' : 'Add the psalm response (refrain) — it isn’t in the citation.',
      }
    }
    if (pasted) {
      const p = pastedPsalm(sel.text, response, footer)
      const head = p.response ? [R()] : [slide(label, `${label}\n${citation}`, footer)]
      return { slides: [...head, ...p.slides] }
    }
    const passage = await fetchPassage(citation)
    const stanzas = []
    for (const v of passage.verses) (stanzas[v.group] ??= []).push(v)
    const slides = [response ? R() : slide(label, `${label}\n${citation}`, footer)]
    for (const st of stanzas.filter(Boolean)) {
      for (const chunk of chunkVerses(st, maxWords)) {
        slides.push(slide('Stanza', chunk.map((v) => v.text).join('\n'), `${footer} · ${SOURCE}`))
      }
      if (response) slides.push(R())
    }
    return { slides, warning: response ? '' : 'Add the psalm response (refrain) — it isn’t in the citation.' }
  }

  // --- gospel acclamation ---
  if (part === 'gospel_acclamation') {
    const lent = ctx.season === 'LENT' || ctx.season === 'EASTER_TRIDUUM'
    let verse = pasted ? sel.text.trim().replace(/\s+/g, ' ') : ''
    if (!verse) verse = (await fetchPassage(citation)).verses.map((v) => v.text).join(' ')
    const body = lent ? verse : `Alleluia, alleluia.\n${verse}\nAlleluia, alleluia.`
    return {
      slides: [slide(lent ? 'Verse before the Gospel' : 'Alleluia', body, footer)],
      warning: lent
        ? 'Lent: add the acclamation your parish sings (e.g. “Praise to you, Lord Jesus Christ…”).'
        : '',
    }
  }

  // --- readings and the Gospel ---
  const book = parseCitation(citation)[0].book
  const warnFor = (books) =>
    books.some((b) => CHECK_BOOKS.has(b))
      ? `Douay-Rheims numbers ${book} differently in places — compare with your lectionary.`
      : ''

  if (whole) {
    // One screen: the reading itself, with what it is and where it's from along the bottom.
    const units = pasted ? sentences(sel.text) : (await fetchPassage(citation)).verses
    const pages = balance(units, screenWords)
    const src = pasted ? '' : ` · ${SOURCE}`
    return {
      slides: pages.map((g, i) =>
        slide(
          label,
          g.map((v) => v.text).join(' '),
          `${label} · ${citation}${src}${pageOf(i, pages.length)}`,
        ),
      ),
      warning: pasted ? '' : warnFor(parseCitation(citation).map((b) => b.book)),
    }
  }

  const head = slide(label, opening(part, book, ctx), footer)
  const tail = slide('Response', closing(part), footer)
  if (pasted) return { slides: [head, ...textToSlides(sel.text, maxWords, '', footer), tail] }

  const passage = await fetchPassage(citation)
  const body = chunkVerses(passage.verses, maxWords).map((group) =>
    slide(`v${group[0].ref.split(':')[1]}`, group.map((v) => v.text).join(' '), `${footer} · ${SOURCE}`),
  )
  return { slides: [head, ...body, tail], warning: warnFor(passage.books) }
}

/**
 * Build every selected part of a Mass.
 *
 * @param {object} option   from `dayOf(...).options`
 * @param {object} parts    from `partsOf(option.readings)`
 * @param {object} selections part → { include, choice, source, text, response }
 * @param {object} opts     { layout: 'whole'|'verses', screenWords, maxWords, titleSlide, onProgress }
 * @returns {Promise<{ items: object[], warnings: string[] }>}
 */
export async function buildMass(
  option,
  parts,
  selections,
  { layout = 'whole', screenWords = 220, maxWords = 45, titleSlide = true, onProgress } = {},
) {
  const group = `lect:${option.id}`
  const ctx = { layout, screenWords, maxWords, season: option.event.season, eventKey: option.event.key }
  const cycleText = `Year ${option.cycles.sunday} · Weekday Year ${option.cycles.weekday}`
  const items = []
  const warnings = []

  if (titleSlide) {
    items.push({
      id: uid('it'),
      type: 'text',
      title: option.title,
      subtitle: option.mass || cycleText,
      themeId: 'theme_default',
      background: null,
      slides: [slide('', [option.title, option.mass].filter(Boolean).join('\n'))],
      notes: cycleText,
      autoAdvance: 0,
      lectionary: { group, part: 'title' },
    })
  }

  const chosen = parts.filter((p) => selections[p.part]?.include !== false)
  for (let i = 0; i < chosen.length; i++) {
    const p = chosen[i]
    const s = selections[p.part] ?? {}
    const citation = p.choices[s.choice ?? 0]
    onProgress?.(i / chosen.length, `${p.label} — ${citation}`)
    let built
    try {
      built = await buildPart(p, { ...s, citation }, ctx)
    } catch (err) {
      built = {
        slides: [slide(p.label, `${p.label}\n${citation}`, citation)],
        warning: `${p.label} (${citation}): ${err.message} Paste the text in the composer.`,
      }
    }
    if (built.warning) warnings.push(`${p.label}: ${built.warning}`)
    items.push({
      id: uid('it'),
      type: 'scripture',
      title: p.label,
      subtitle: citation,
      themeId: 'theme_scripture',
      background: null,
      slides: built.slides,
      notes: [option.title, built.warning].filter(Boolean).join('\n'),
      autoAdvance: 0,
      lectionary: { group, part: p.part, citation },
    })
  }
  onProgress?.(1, 'Done')
  return { items, warnings, group }
}
