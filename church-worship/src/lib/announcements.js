/**
 * Parish announcements → one plan item, a slide per notice.
 *
 * A notice shows if it is switched on and its "until" date (if any) is on or
 * after the service date — so last month's bake sale drops off by itself.
 * A notice with a picture shows the picture whole; otherwise its title and
 * text.
 */

import { uid } from './id'

export function showsOn(a, date) {
  if (!a.active) return false
  if (!a.title.trim() && !a.text.trim() && !a.mediaId) return false
  return !a.until || !date || a.until >= date
}

export function announcementSlide(a) {
  if (a.mediaId) {
    return {
      id: uid('sl'),
      label: a.title || 'Notice',
      body: '',
      background: { kind: 'image', mediaId: a.mediaId, fit: 'contain', fallback: '#000000' },
    }
  }
  const body = [a.title.trim(), a.text.trim()].filter(Boolean).join('\n\n')
  return { id: uid('sl'), label: a.title || 'Notice', body }
}

/** `seconds` > 0 makes it a self-running loop (before Mass). */
export function announcementItem(list, date, seconds = 0) {
  const shown = list.filter((a) => showsOn(a, date))
  return {
    id: uid('it'),
    type: 'text',
    title: 'Announcements',
    subtitle: `${shown.length} notice${shown.length === 1 ? '' : 's'}`,
    themeId: 'theme_default',
    background: null,
    slides: shown.map(announcementSlide),
    notes: '',
    autoAdvance: seconds,
    announcements: true,
  }
}
