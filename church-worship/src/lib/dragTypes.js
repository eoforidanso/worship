/**
 * Dragging things into the service plan from elsewhere in the app.
 *
 * Songs come from the library (Services tab), readings from the Readings
 * page. Both use the browser's own drag and drop with these private types,
 * so they never collide with files dragged in from the desktop.
 */

import { dayOf, partsOf } from './lectionary'
import { buildMass } from './massBuilder'

export const DRAG_SONG = 'application/x-worship-song'
export const DRAG_READING = 'application/x-worship-reading'

/** `{ date, optionId, part, sel }` → the plan item(s) for that one reading. */
export async function buildDroppedReading({ date, optionId, part, sel = {} }) {
  const day = await dayOf(date)
  const option = day.options.find((o) => o.id === optionId) ?? day.options[0]
  const parts = partsOf(option.readings).filter((p) => p.part === part)
  if (!parts.length) return []
  const out = await buildMass(
    option,
    parts,
    { [part]: { ...sel, include: true } },
    { titleSlide: false, layout: 'whole' },
  )
  // A reading dragged in on its own isn't part of a built Mass: rebuilding that Mass must not remove it.
  return out.items.map((it) => ({ ...it, lectionary: { ...it.lectionary, group: `drag:${it.id}` } }))
}
