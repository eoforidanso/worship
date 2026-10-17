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

export async function buildDefaultMass(date, { onProgress } = {}) {
  const day = await dayOf(date)
  const option = day.options[0]
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
