/**
 * Psalm responses, remembered by psalm citation.
 *
 * The response (refrain) isn't part of a lectionary citation and its wording
 * belongs to the parish's licensed lectionary, so the app never invents one.
 * It remembers what was typed, and takes a whole year's list in one paste.
 */

import { dayOf, partsOf, isPsalm } from './lectionary'

const KEY = 'worship-psalm-responses'

export function readResponses() {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}')
  } catch {
    return {}
  }
}

function write(map) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map))
  } catch {
    /* convenience only */
  }
}

/** Selections pre-filled with remembered responses, for a Mass's parts. */
export function rememberedSelections(parts) {
  const saved = readResponses()
  const out = {}
  for (const p of parts) {
    const r = isPsalm(p.part) && saved[p.choices[0]]
    if (r) out[p.part] = { response: r }
  }
  return out
}

export function saveResponses(parts, sel) {
  const saved = readResponses()
  for (const p of parts) {
    const s = sel[p.part]
    if (isPsalm(p.part) && s?.response?.trim()) saved[p.choices[s.choice ?? 0]] = s.response.trim()
  }
  write(saved)
}

/**
 * Import a list, one per line, as `date | response` or `citation | response`
 * (a tab, "|" or " — " separates them):
 *
 *   2026-10-18 | Give the Lord glory and honor.
 *   Psalm 23:1-3a, 3b-4, 5, 6 | The Lord is my shepherd; there is nothing I shall want.
 *
 * A date takes the response for that day's (first) responsorial psalm.
 * Returns { added, skipped: [line] }.
 */
export async function importResponses(text) {
  const saved = readResponses()
  let added = 0
  const skipped = []
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    const m = line.match(/^(.+?)\s*(?:\t|\||\s—\s|\s–\s)\s*(.+)$/)
    if (!m) {
      skipped.push(line)
      continue
    }
    let [, left, response] = m
    response = response.replace(/^R\.?\s*/i, '').trim()
    let citation = null
    if (/^\d{4}-\d{2}-\d{2}$/.test(left.trim())) {
      const day = await dayOf(left.trim()).catch(() => null)
      const psalm = day?.options[0] && partsOf(day.options[0].readings).find((p) => isPsalm(p.part))
      citation = psalm?.choices[0] ?? null
    } else if (/^psalm|\d+:\d/i.test(left)) {
      citation = left.trim()
    }
    if (!citation || !response) {
      skipped.push(line)
      continue
    }
    saved[citation] = response
    added++
  }
  write(saved)
  return { added, skipped }
}
