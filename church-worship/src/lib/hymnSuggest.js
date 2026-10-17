/**
 * Hymn suggestions for a Mass, from the parish's own library.
 *
 * Each hymn in the library is placed in one or more groups — a season
 * (Advent, Christmas, Lent, Easter, Pentecost), Our Lady, the Eucharist, or
 * general praise — from the starter hymnal's own labels, or for the parish's
 * own songs from words in their title and lyrics ("Mary", "Bread", "Spirit",
 * "Alleluia"…). Then each place in the Mass draws on the groups that suit it:
 * the season at the entrance and the end, the Eucharist at Communion, Our Lady
 * on her feasts. Choices rotate from week to week so the same hymn doesn't
 * open every Sunday.
 *
 * These are suggestions: every place stays changeable, and anything the
 * operator picks instead is kept.
 */

const SLOTS = ['hymn-entrance', 'hymn-offertory', 'hymn-communion', 'hymn-recessional']

const KEYWORDS = {
  advent: /\b(advent|emmanuel|come,? lord|prepare the way|o come, o come|maranatha|wake,? awake)\b/i,
  christmas:
    /\b(christmas|bethlehem|manger|noel|nowell|born (?:the|this)|new-?born|silent night|herald angels|shepherds)\b/i,
  lent: /\b(lent|passion|sacred head|calvary|repent|forgive|mercy on|wilderness|cross)\b/i,
  easter: /\b(risen|resurrection|easter|alleluia|empty tomb|regina caeli)\b/i,
  pentecost: /\b(holy (?:ghost|spirit)|spirit of god|veni|pentecost|come,? holy)\b/i,
  mary: /\b(mary|maria|ave|queen|virgin|mother of god|regina|salve)\b/i,
  eucharist:
    /\b(bread|body of christ|sacrament|eucharist|banquet|cup|table|panis|hostia|tantum|communion|lamb of god)\b/i,
  praise: /\b(praise|holy,? holy|glory|thank|crown him|holy god|we praise|almighty|rejoice)\b/i,
}

const SEASON_GROUP = {
  ADVENT: 'advent',
  CHRISTMAS: 'christmas',
  LENT: 'lent',
  EASTER_TRIDUUM: 'easter',
  EASTER: 'easter',
}

/** Which groups a library item belongs to. */
function groupsOf(song) {
  const label = (song.notes ?? '').toLowerCase() // starter hymns: "Starter hymnal · Christmas"
  const g = new Set()
  if (label.includes('advent')) g.add('advent')
  if (label.includes('christmas')) g.add('christmas')
  if (label.includes('lent')) g.add('lent')
  if (label.includes('easter')) g.add('easter')
  if (label.includes('pentecost')) g.add('pentecost')
  if (label.includes('our lady')) g.add('mary')
  if (label.includes('eucharist')) g.add('eucharist')
  if (label.includes('general')) g.add('praise')
  if (/easter time/i.test(song.subtitle ?? '')) g.add('easter') // Regina Caeli: Easter only
  // Benediction hymns: Eucharistic, but for Exposition rather than Communion.
  if (/^hymn_(tantum-ergo|o-salutaris)$/.test(song.id) || /\b(tantum ergo|o salutaris)\b/i.test(song.title))
    g.add('benediction')
  if (!song.starter) {
    const text = `${song.title}\n${song.subtitle ?? ''}\n${song.slides.map((s) => s.body).join('\n')}`
    for (const [k, re] of Object.entries(KEYWORDS)) if (re.test(text)) g.add(k)
  }
  return g
}

const MARIAN =
  /mary|marian|our lady|immaculate|assumption|annunciation|visitation|rosary|mother of god|queen/i

/**
 * @param songs  the library
 * @param ctx    { season, eventKey, eventName, date }
 * @returns { [slotId]: [song, …] }  best first; [] where nothing suits
 */
export function suggestHymns(songs, { season, eventKey = '', eventName = '', date = '' }) {
  const lib = songs.filter((s) => s.type === 'song' || s.starter).map((s) => ({ song: s, g: groupsOf(s) }))
  const seasonal = SEASON_GROUP[season] ?? (eventKey === 'Pentecost' ? 'pentecost' : null)
  const marian = MARIAN.test(eventName)
  const spirit = /Pentecost/.test(eventKey) ? 'pentecost' : null

  const want = {
    'hymn-entrance': [spirit, marian ? 'mary' : null, seasonal, 'praise'],
    'hymn-offertory': [seasonal, 'praise', 'eucharist'],
    'hymn-communion': ['eucharist'],
    'hymn-recessional': [
      marian ? 'mary' : null,
      seasonal,
      season === 'EASTER' ? 'mary' : null,
      'praise',
      'mary',
    ],
  }

  // Rotate by week so suggestions vary from Sunday to Sunday.
  const week = date ? Math.floor(new Date(`${date}T12:00:00`).getTime() / (7 * 86400000)) : 0
  const used = new Set()
  const out = {}
  for (const slot of SLOTS) {
    const ranked = []
    for (const group of want[slot].filter(Boolean)) {
      // Outside its season, a seasonal hymn is never suggested.
      // Our Lady's hymns belong at the end of Mass, unless it's her feast.
      const marianOk = slot === 'hymn-recessional' || marian
      const pool = lib.filter(
        ({ song, g }) =>
          g.has(group) &&
          (marianOk || !g.has('mary')) &&
          !ranked.includes(song) &&
          ![...g].some(
            (x) =>
              ['advent', 'christmas', 'lent', 'easter', 'pentecost'].includes(x) &&
              x !== seasonal &&
              x !== spirit,
          ),
      )
      const start = pool.length ? week % pool.length : 0
      const rotated = [...pool.slice(start), ...pool.slice(0, start)]
      // Communion hymns first; the Benediction hymns only after them.
      rotated.sort((a, b) => a.g.has('benediction') - b.g.has('benediction'))
      ranked.push(...rotated.map((x) => x.song))
    }
    const fresh = ranked.filter((s) => !used.has(s.id))
    out[slot] = fresh.length ? fresh : ranked
    if (out[slot][0]) used.add(out[slot][0].id)
  }
  return out
}

export const HYMN_SLOTS = SLOTS

/**
 * Put chosen songs into a built Mass's hymn places. `picks` maps a slot to a
 * library id ('' leaves the place empty to fill later).
 */
export function fillHymnPlaces(items, picks, songs, makeId) {
  return items.map((it) => {
    const slot = it.lectionary?.slot
    if (!it.placeholder || !slot || !picks[slot]) return it
    const song = songs.find((s) => s.id === picks[slot])
    if (!song) return it
    return {
      ...song,
      id: makeId('it'),
      slides: song.slides.map((sl) => ({ ...sl, id: makeId('sl') })),
      libraryId: song.id,
      subtitle: it.title, // "Entrance Hymn"
      lectionary: it.lectionary,
      suggested: true, // a library pick replaces it, like a placeholder
      starter: undefined,
      savedAt: undefined,
    }
  })
}
