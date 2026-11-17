/**
 * Chorus after each verse.
 *
 * Songs brought in from EasyWorship hold the chorus once, where it was typed.
 * The people sing it after every verse, so the operator would otherwise jump
 * back and forth through the slides. This lays the song out as it is sung:
 * verse, chorus, verse, chorus… so Next is all that's needed.
 *
 * Careful by design:
 *  - only songs with exactly one chorus (its pages may run over several
 *    slides) are rearranged — "Chorus 1" and "Chorus 2", or any two choruses
 *    with different words, keep their written order;
 *  - a chorus that already follows a verse is not doubled;
 *  - the words are never changed, only repeated.
 */

import { isChorus } from './songbook'

const sameText = (a, b) => a.map((s) => s.body.trim()).join('\n\n') === b.map((s) => s.body.trim()).join('\n\n')

const base = (label) => label.replace(/\s*\([a-z]\)$/i, '').toLowerCase()

/** Runs of same-labelled slides: a verse or a chorus and its continuation pages. */
function units(slides) {
  const out = []
  for (const sl of slides) {
    const chorus = isChorus(sl)
    const last = out[out.length - 1]
    // "Chorus" + "Chorus", or "Chorus 1" + "Chorus 1 (a)", is one chorus over two
    // pages. "Chorus 1" + "Chorus 2" are two choruses, and are left where they are.
    const joins = last && last.chorus === chorus && sl.label && base(sl.label) === base(last.slides[0].label)
    if (joins) last.slides.push(sl)
    else out.push({ chorus, slides: [sl] })
  }
  return out
}

const isVerse = (unit) => !unit.chorus && /^(verse\b|$)/i.test(unit.slides[0].label ?? '')

/**
 * @param slides  the song's slides, in written order
 * @param makeId  id maker for the repeated chorus slides
 * @returns the slides as sung, or the same array when nothing should change
 */
export function chorusAfterEachVerse(slides, makeId) {
  const us = units(slides)
  const choruses = us.filter((u) => u.chorus)
  const verses = us.filter(isVerse)
  if (!choruses.length || !verses.length) return slides
  const chorus = choruses[0].slides
  if (!choruses.every((c) => sameText(c.slides, chorus))) return slides

  const out = []
  us.forEach((u, i) => {
    out.push(...u.slides)
    if (isVerse(u) && !us[i + 1]?.chorus)
      out.push(...chorus.map((sl) => ({ ...sl, id: makeId('sl'), repeat: true })))
  })
  return out.length === slides.length ? slides : out
}
