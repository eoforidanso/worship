/**
 * The whole Mass as a service: the Order of Mass with the day's readings in
 * their place.
 *
 * Every part is its own item, in the order it happens — Entrance Hymn, Sign
 * of the Cross, Penitential Act, Kyrie, Gloria, the readings, the Creed, … ,
 * Dismissal — so the operator presses Next once per part. Each prayer fills
 * one screen; only the longest (the Nicene Creed in a large font) may split.
 *
 * Texts come from the parish's own wording where it has pasted it (Prayers
 * page), else the built-in traditional English or Latin.
 */

import { uid } from './id'
import { ORDER, SECTIONS, belongs, builtInText } from '../data/orderOfMass'
import { buildMass, balance } from './massBuilder'
import { parseCitation } from './bible'
import { RITUALS } from '../data/ritual'

/**
 * A rite's own shape: drop what it replaces, add its moments as title slides
 * (Final Commendation, Celebration of Matrimony…) and its extra hymn places,
 * and name the person or couple on the title slide.
 */
function applyRite(items, kind, who, group) {
  const rite = RITUALS[kind]
  if (!rite) return items
  const key = (it) => it.lectionary?.slot ?? it.lectionary?.part ?? it.title
  let out = items.filter((it) => !rite.drop.includes(key(it)))
  for (const ex of rite.extras) {
    const item = ex.hymn
      ? {
          id: uid('it'),
          type: 'song',
          title: ex.title,
          subtitle: 'Choose a song',
          themeId: 'theme_default',
          background: null,
          slides: [slide(ex.title, '')],
          notes: 'Select this item, then add a song from the library — it takes this place.',
          autoAdvance: 0,
          placeholder: true,
          lectionary: { group, slot: `hymn-${ex.title.toLowerCase().replace(/\W+/g, '-')}` },
        }
      : {
          id: uid('it'),
          type: 'text',
          title: ex.title,
          subtitle: rite.title,
          themeId: 'theme_default',
          background: null,
          slides: [slide(ex.title, ex.body)],
          notes: '',
          autoAdvance: 0,
          lectionary: { group, part: `rite-${ex.title.toLowerCase().replace(/\W+/g, '-')}` },
        }
    const anchor = ex.after ?? ex.before
    const at = out.findIndex((it) => key(it) === anchor || it.title === anchor)
    const pos = at === -1 ? out.length : ex.after ? at + 1 : at
    out = [...out.slice(0, pos), item, ...out.slice(pos)]
  }
  // "Funeral Mass / For Kwame Mensah" on the title slide.
  if (who?.trim()) {
    out = out.map((it) =>
      it.lectionary?.part === 'title'
        ? {
            ...it,
            title: `${rite.title} — ${who.trim()}`,
            slides: it.slides.map((sl) => ({ ...sl, body: `${sl.body}\n${who.trim()}` })),
          }
        : it,
    )
  }
  return out
}

/** The text a parish will see for one prayer, honouring its choices. */
export function prayerText(part, prefs = {}, choice) {
  const p = prefs[part.id] ?? {}
  const c = choice ?? p.choice ?? (part.choices ? Object.keys(part.choices)[0] : undefined)
  if (p.use === 'parish') {
    const own = part.choices ? p.texts?.[c] : p.text
    if (own?.trim()) return own.trim()
  }
  return builtInText(part, p.use === 'la' ? 'la' : 'en', c)
}

const slide = (label, body, footer = '') => ({ id: uid('sl'), label, body, footer })

/** A prayer on as few screens as stay readable, split only between lines. */
function prayerSlides(text, label, screenWords) {
  const lines = text.split('\n').map((l) => ({ text: l }))
  return balance(lines, screenWords).map((g) =>
    slide(
      label,
      g
        .map((u) => u.text)
        .join('\n')
        .trim(),
    ),
  )
}

/** What the Gloria/Creed rules need to know about this Mass. */
export function massContext(option, isSunday) {
  return { isSunday, grade: option.event.grade, season: option.event.season }
}

/**
 * @param {object} opts {
 *   isSunday, include: { [partId]: boolean } overrides, choices: { [partId]: choice },
 *   hymns: boolean, prayers: parish prefs, …buildMass options
 * }
 */
export async function buildWholeMass(option, parts, selections, opts) {
  const { isSunday, include = {}, choices = {}, hymns = true, prayers = {}, screenWords = 220 } = opts
  const readings = await buildMass(option, parts, selections, { ...opts, layout: opts.layout ?? 'whole' })
  const group = readings.group
  const ctx = massContext(option, isSunday)

  const title = readings.items.find((it) => it.lectionary?.part === 'title')
  const readingItems = readings.items.filter((it) => it !== title)
  const gospel = readingItems.find((it) => it.lectionary?.part === 'gospel')
  const evangelist = gospel ? parseCitation(gospel.lectionary.citation)[0].book : 'N.'

  const items = title ? [title] : []
  const prayerItem = (part) => {
    const text = prayerText(part, prayers, choices[part.id]).replaceAll('{gospel}', evangelist)
    const choice = choices[part.id] ?? prayers[part.id]?.choice
    return {
      id: uid('it'),
      type: 'text',
      title: part.choices && choice ? part.choices[choice] : part.title,
      subtitle: SECTIONS[part.section],
      themeId: 'theme_default',
      background: null,
      slides: prayerSlides(text, part.title, screenWords),
      notes: '',
      autoAdvance: 0,
      lectionary: { group, part: part.id },
    }
  }

  for (const part of ORDER) {
    const wanted = include[part.id] ?? belongs(part, ctx)
    if (part.slot === 'hymn') {
      if (!hymns) continue
      items.push({
        id: uid('it'),
        type: 'song',
        title: part.title,
        subtitle: 'Choose a song',
        themeId: 'theme_default',
        background: null,
        slides: [slide(part.title, '')],
        notes: 'Select this item, then add a song from the library — it takes this place.',
        autoAdvance: 0,
        placeholder: true,
        lectionary: { group, slot: part.id },
      })
      continue
    }
    if (part.slot === 'readings') {
      const dialogue = ORDER.find((p) => p.id === 'gospel-dialogue')
      for (const it of readingItems) {
        if (it === gospel && (include['gospel-dialogue'] ?? true)) items.push(prayerItem(dialogue))
        items.push(it)
      }
      continue
    }
    if (part.slot === 'before-gospel') continue // placed with the readings
    if (!wanted) continue
    items.push(prayerItem(part))
  }

  return {
    items: opts.ritual ? applyRite(items, opts.ritual, opts.ritualWho, group) : items,
    warnings: readings.warnings,
    group,
  }
}
