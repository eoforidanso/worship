#!/usr/bin/env node
/**
 * Regenerate src/data/calendar/YYYY.json from the Liturgical Calendar API.
 *
 *   node scripts/fetch-calendar.mjs 2041 2050
 *
 * Epiphany, Ascension and Corpus Christi are kept on Sunday. To change that,
 * edit OPTIONS here and in src/lib/lectionary.js (API_OPTS), then re-run for
 * every year. Years outside the bundled range are also fetched by the app at
 * runtime, once, and cached in the browser.
 */

import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const OPTIONS = 'locale=en&year_type=CIVIL&epiphany=SUNDAY_JAN2_JAN8&ascension=SUNDAY&corpus_christi=SUNDAY'
const [from = 2025, to = from] = process.argv.slice(2).map(Number)
const dir = new URL('../src/data/calendar/', import.meta.url)

for (let year = from; year <= to; year++) {
  const res = await fetch(`https://litcal.johnromanodorazio.com/api/v5/calendar/${year}?${OPTIONS}`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`${year}: HTTP ${res.status}`)
  const days = {}
  for (const e of (await res.json()).litcal) {
    const row = [e.event_key, e.name, e.grade, e.color?.[0] ?? '', e.liturgical_season ?? '']
    if (e.is_vigil_mass) row.push(e.is_vigil_for ?? '')
    ;(days[e.date.slice(0, 10)] ??= []).push(row)
  }
  const file = new URL(`${year}.json`, dir)
  await writeFile(file, JSON.stringify(days))
  console.log(`${year}: ${Object.keys(days).length} days → ${fileURLToPath(file)}`)
  await new Promise((r) => setTimeout(r, 1000)) // be gentle with a volunteer-run API
}
