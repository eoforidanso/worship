#!/usr/bin/env node
/**
 * Bundle the Douay-Rheims Bible (public domain) into the app, so readings
 * never wait on the internet.
 *
 *   node scripts/fetch-bible.mjs
 *
 * Writes src/data/bible/<book number>.json as { "<chapter>": ["verse 1", …] },
 * one file per book (getbible.net's book numbers), loaded only when a passage
 * from that book is needed and precached for offline use.
 */

import { mkdir, writeFile } from 'node:fs/promises'

const API = 'https://api.getbible.net/v2/douayrheims'
const out = new URL('../src/data/bible/', import.meta.url)
await mkdir(out, { recursive: true })

const books = await (await fetch(`${API}/books.json`)).json()
let verses = 0
let bytes = 0
for (const [nr, meta] of Object.entries(books)) {
  const res = await fetch(`${API}/${nr}.json`)
  if (!res.ok) throw new Error(`${meta.name}: HTTP ${res.status}`)
  const data = await res.json()
  const book = {}
  for (const ch of data.chapters) {
    const list = []
    for (const v of ch.verses) list[v.verse - 1] = v.text.replace(/\s+/g, ' ').trim()
    book[ch.chapter] = list
    verses += ch.verses.length
  }
  const json = JSON.stringify(book)
  bytes += json.length
  await writeFile(new URL(`${nr}.json`, out), json)
  process.stdout.write(`${meta.name} `)
  await new Promise((r) => setTimeout(r, 250)) // be gentle with a free API
}
console.log(`\n${Object.keys(books).length} books, ${verses} verses, ${(bytes / 1e6).toFixed(1)} MB`)
