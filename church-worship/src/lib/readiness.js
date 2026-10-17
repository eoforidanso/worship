/**
 * Is this Mass ready? Each plan item is checked for what would show up as a
 * gap on Sunday: an empty hymn place, a psalm with no response, the Lenten
 * acclamation still to add, a reading whose text didn't arrive, a picture
 * that isn't on this computer, a slide with nothing on it.
 */

import { urlFor } from './mediaStore'

const hasMedia = (bg) => !bg?.mediaId || !!urlFor(bg.mediaId)

export function issuesOf(item) {
  const out = []
  if (item.placeholder) return ['Choose a song for this place']
  const part = item.lectionary?.part ?? ''
  if (part.startsWith('responsorial_psalm')) {
    const hasResponse = item.slides.some((s) => s.label === 'Response' || /^R\.\s*\S/.test(s.body))
    if (!hasResponse) out.push('Add the psalm response')
  }
  for (const need of item.needs ?? []) {
    if (need === 'acclamation') out.push('Add the Lenten acclamation your parish sings')
    if (need === 'text') out.push('The text didn’t arrive — paste it in Compose')
  }
  if (!hasMedia(item.background) || item.slides.some((s) => !hasMedia(s.background)))
    out.push('A picture is missing on this computer')
  const blank = item.slides.every((s) => !s.body.trim() && !s.background) && !item.background
  if (blank) out.push('Nothing on these slides yet')
  return out
}

/** { total, ready, items: Map(id → issues[]) } */
export function readiness(items) {
  const map = new Map()
  let ready = 0
  for (const it of items) {
    const issues = issuesOf(it)
    map.set(it.id, issues)
    if (!issues.length) ready++
  }
  return { total: items.length, ready, items: map }
}
