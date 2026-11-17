/**
 * Bring a parish over from Worship Studio.
 *
 * Accepts the "Worship Studio Source" zip as it was exported, or just its
 * `song-library.js`. From the zip it takes two things and nothing else:
 *
 *  - the song library (the parish's EasyWorship songs) → the songbook;
 *  - the seven Day Borns pictures → the media library, tagged `day-borns`,
 *    where the Day Borns programme finds them.
 *
 * Everything is read as data. No script in the zip is ever run, and nothing
 * leaves this machine.
 */

import { parseWorshipStudioSongs, saveSongbook } from './songbook'
import { storePicture } from './importer'
import { useContent } from '../store/useContent'

export const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
export const dayBornPictureName = (day) => `Day Borns — ${day[0].toUpperCase()}${day.slice(1)}.png`

// --- a small zip reader ---------------------------------------------------------
// Enough of the format to pull named files out of an ordinary zip: the central
// directory at the end lists every file, and each is stored or deflated.

const u16 = (v, o) => v.getUint16(o, true)
const u32 = (v, o) => v.getUint32(o, true)

async function zipEntries(file) {
  const tailSize = Math.min(file.size, 66_000)
  const tail = new DataView(await file.slice(file.size - tailSize).arrayBuffer())
  let eocd = -1
  for (let i = tail.byteLength - 22; i >= 0; i--) {
    if (u32(tail, i) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd === -1) throw new Error('This zip file could not be read.')
  const count = u16(tail, eocd + 10)
  const dirSize = u32(tail, eocd + 12)
  const dirOffset = u32(tail, eocd + 16)
  const dir = new DataView(await file.slice(dirOffset, dirOffset + dirSize).arrayBuffer())
  const decoder = new TextDecoder()
  const entries = []
  let p = 0
  for (let n = 0; n < count && p + 46 <= dir.byteLength; n++) {
    if (u32(dir, p) !== 0x02014b50) break
    const nameLen = u16(dir, p + 28)
    entries.push({
      name: decoder.decode(new Uint8Array(dir.buffer, p + 46, nameLen)),
      method: u16(dir, p + 10),
      compressedSize: u32(dir, p + 20),
      offset: u32(dir, p + 42),
    })
    p += 46 + nameLen + u16(dir, p + 30) + u16(dir, p + 32)
  }
  return entries
}

async function zipRead(file, entry, type = '') {
  const head = new DataView(await file.slice(entry.offset, entry.offset + 30).arrayBuffer())
  if (u32(head, 0) !== 0x04034b50) throw new Error(`${entry.name} could not be read from the zip.`)
  const start = entry.offset + 30 + u16(head, 26) + u16(head, 28)
  const raw = file.slice(start, start + entry.compressedSize)
  if (entry.method === 0) return new Blob([raw], { type })
  if (entry.method !== 8 || typeof DecompressionStream === 'undefined')
    throw new Error('This browser cannot open the zip. Unzip it and choose song-library.js instead.')
  const stream = raw.stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Blob([await new Response(stream).blob()], { type })
}

// --- the import -------------------------------------------------------------------

/**
 * @returns {{ songs?: { total, added, updated }, pictures: number, source: string }}
 */
export async function importFromWorshipStudio(file, onProgress) {
  const isZip = /\.zip$/i.test(file.name) || file.type === 'application/zip'
  if (!isZip) {
    onProgress?.('Reading the songs…')
    const { songs, source } = parseWorshipStudioSongs(await file.text())
    return { songs: await saveSongbook(songs, source), pictures: 0, source }
  }

  onProgress?.('Opening the zip…')
  const entries = await zipEntries(file)
  const result = { pictures: 0, source: 'Worship Studio' }

  const lib = entries.find((e) => /(^|\/)song-library\.js$/.test(e.name))
  if (lib) {
    onProgress?.('Reading the songs…')
    const { songs, source } = parseWorshipStudioSongs(await (await zipRead(file, lib)).text())
    result.songs = await saveSongbook(songs, source)
    result.source = source
  }

  const have = new Set(useContent.getState().media.map((m) => m.name))
  for (const day of DAYS) {
    const entry = entries.find((e) => e.name.endsWith(`assets/day-borns/${day}.png`))
    const name = dayBornPictureName(day)
    if (!entry || have.has(name)) continue
    onProgress?.(`Saving the Day Borns pictures… ${day}`)
    const blob = await zipRead(file, entry, 'image/png')
    await storePicture(new File([blob], name, { type: 'image/png' }), name, ['day-borns'])
    result.pictures++
  }

  if (!lib && !result.pictures)
    throw new Error('No Worship Studio songs or Day Borns pictures were found in this zip.')
  return result
}
