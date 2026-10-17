/**
 * Catholic Bible text for the lectionary.
 *
 * Lectionary citations ("Isaiah 35:1-6a, 10", "Psalm 116:12-13, 15-16bc") are
 * parsed here and resolved against one of two public-domain Bibles, both with
 * every deuterocanonical book (Sirach, Wisdom, Baruch, Tobit, Judith,
 * Maccabees, the Greek parts of Daniel and Esther) the readings use:
 *
 *  - 'web': the World English Bible, British Edition — modern English, the
 *    default. Built in by scripts/build-webbe.py already in the lectionary's
 *    numbering, so citations are looked up as they stand.
 *  - 'dr': the Douay-Rheims — the traditional Catholic English Bible. Built in
 *    by scripts/fetch-bible.mjs (api.getbible.net is a fallback). It follows
 *    the Vulgate's numbering; `toDouay` converts the places where it differs
 *    (most of the Psalms, Joel, Malachi, Hosea, Micah, a few chapters elsewhere).
 *
 * Both ship with the app, so readings come up instantly with no internet.
 */

const API = "https://api.getbible.net/v2/douayrheims";

/** The built-in Bibles, the default first. `source` is what slides credit. */
export const BIBLES = {
  web: {
    label: "World English Bible",
    short: "WEB",
    source: "World English Bible",
  },
  dr: { label: "Douay-Rheims", short: "Douay-Rheims", source: "Douay-Rheims" },
};
export const DEFAULT_BIBLE = "web";

/** The parish's choice on the Readings page, remembered on this device. */
export function preferredBible() {
  try {
    const b = localStorage.getItem("worship-bible");
    return BIBLES[b] ? b : DEFAULT_BIBLE;
  } catch {
    return DEFAULT_BIBLE;
  }
}

const BOOKS = {
  Genesis: 1,
  Exodus: 2,
  Leviticus: 3,
  Numbers: 4,
  Deuteronomy: 5,
  Joshua: 6,
  Judges: 7,
  Ruth: 8,
  "1 Samuel": 9,
  "2 Samuel": 10,
  "1 Kings": 11,
  "2 Kings": 12,
  "1 Chronicles": 13,
  "2 Chronicles": 14,
  Ezra: 15,
  Nehemiah: 16,
  Tobit: 69,
  Judith: 70,
  Esther: 17,
  Job: 18,
  Psalms: 19,
  Proverbs: 20,
  Ecclesiastes: 21,
  "Song of Songs": 22,
  Wisdom: 73,
  Sirach: 74,
  Isaiah: 23,
  Jeremiah: 24,
  Lamentations: 25,
  Baruch: 75,
  Ezekiel: 26,
  Daniel: 27,
  Hosea: 28,
  Joel: 29,
  Amos: 30,
  Obadiah: 31,
  Jonah: 32,
  Micah: 33,
  Nahum: 34,
  Habakkuk: 35,
  Zephaniah: 36,
  Haggai: 37,
  Zechariah: 38,
  Malachi: 39,
  "1 Maccabees": 80,
  "2 Maccabees": 81,
  Matthew: 40,
  Mark: 41,
  Luke: 42,
  John: 43,
  Acts: 44,
  Romans: 45,
  "1 Corinthians": 46,
  "2 Corinthians": 47,
  Galatians: 48,
  Ephesians: 49,
  Philippians: 50,
  Colossians: 51,
  "1 Thessalonians": 52,
  "2 Thessalonians": 53,
  "1 Timothy": 54,
  "2 Timothy": 55,
  Titus: 56,
  Philemon: 57,
  Hebrews: 58,
  James: 59,
  "1 Peter": 60,
  "2 Peter": 61,
  "1 John": 62,
  "2 John": 63,
  "3 John": 64,
  Jude: 65,
  Revelation: 66,
};

// Spellings found in the lectionary data, plus the usual alternatives.
const ALIASES = {
  Psalm: "Psalms",
  Ps: "Psalms",
  "Song of Solomon": "Song of Songs",
  Ecclesiasticus: "Sirach",
  Qoheleth: "Ecclesiastes",
  Tobiah: "Tobit",
  Tobias: "Tobit",
  Apocalypse: "Revelation",
  "Revelation of John": "Revelation",
  "1 Corithians": "1 Corinthians",
  "1 Pt": "1 Peter",
  Hewbrews: "Hebrews",
  Marc: "Mark",
  Mattthew: "Matthew",
  Proverbe: "Proverbs",
  // The one bare "Maccabees" in the data is 2 Mc 7 (32nd Sunday, Year C).
  Maccabees: "2 Maccabees",
};

// What people type: the usual abbreviations (NAB / missal style and common
// English ones). Keys are lower-case; numbers are separated ("1 cor").
const ABBREVIATIONS = {
  gen: "Genesis",
  gn: "Genesis",
  ex: "Exodus",
  exod: "Exodus",
  lev: "Leviticus",
  lv: "Leviticus",
  num: "Numbers",
  nm: "Numbers",
  deut: "Deuteronomy",
  dt: "Deuteronomy",
  josh: "Joshua",
  jos: "Joshua",
  judg: "Judges",
  jgs: "Judges",
  ru: "Ruth",
  rth: "Ruth",
  "1 sam": "1 Samuel",
  "1 sm": "1 Samuel",
  "2 sam": "2 Samuel",
  "2 sm": "2 Samuel",
  "1 kgs": "1 Kings",
  "1 ki": "1 Kings",
  "2 kgs": "2 Kings",
  "2 ki": "2 Kings",
  "1 chr": "1 Chronicles",
  "1 chron": "1 Chronicles",
  "2 chr": "2 Chronicles",
  "2 chron": "2 Chronicles",
  ezr: "Ezra",
  neh: "Nehemiah",
  tob: "Tobit",
  tb: "Tobit",
  jdt: "Judith",
  esth: "Esther",
  est: "Esther",
  jb: "Job",
  ps: "Psalms",
  pss: "Psalms",
  psa: "Psalms",
  psalm: "Psalms",
  prov: "Proverbs",
  prv: "Proverbs",
  pr: "Proverbs",
  eccl: "Ecclesiastes",
  eccles: "Ecclesiastes",
  qoh: "Ecclesiastes",
  song: "Song of Songs",
  sg: "Song of Songs",
  cant: "Song of Songs",
  "canticle of canticles": "Song of Songs",
  wis: "Wisdom",
  ws: "Wisdom",
  sir: "Sirach",
  ecclus: "Sirach",
  isa: "Isaiah",
  is: "Isaiah",
  jer: "Jeremiah",
  lam: "Lamentations",
  bar: "Baruch",
  ezek: "Ezekiel",
  ez: "Ezekiel",
  dan: "Daniel",
  dn: "Daniel",
  hos: "Hosea",
  jl: "Joel",
  am: "Amos",
  obad: "Obadiah",
  ob: "Obadiah",
  jon: "Jonah",
  mic: "Micah",
  mi: "Micah",
  nah: "Nahum",
  na: "Nahum",
  hab: "Habakkuk",
  hb: "Habakkuk",
  zeph: "Zephaniah",
  zep: "Zephaniah",
  hag: "Haggai",
  hg: "Haggai",
  zech: "Zechariah",
  zec: "Zechariah",
  mal: "Malachi",
  "1 macc": "1 Maccabees",
  "1 mc": "1 Maccabees",
  "2 macc": "2 Maccabees",
  "2 mc": "2 Maccabees",
  mt: "Matthew",
  matt: "Matthew",
  mk: "Mark",
  mar: "Mark",
  mrk: "Mark",
  lk: "Luke",
  luk: "Luke",
  jn: "John",
  jhn: "John",
  ac: "Acts",
  act: "Acts",
  rom: "Romans",
  rm: "Romans",
  "1 cor": "1 Corinthians",
  "2 cor": "2 Corinthians",
  gal: "Galatians",
  eph: "Ephesians",
  phil: "Philippians",
  php: "Philippians",
  col: "Colossians",
  "1 thess": "1 Thessalonians",
  "1 thes": "1 Thessalonians",
  "1 th": "1 Thessalonians",
  "2 thess": "2 Thessalonians",
  "2 thes": "2 Thessalonians",
  "2 th": "2 Thessalonians",
  "1 tim": "1 Timothy",
  "1 tm": "1 Timothy",
  "2 tim": "2 Timothy",
  "2 tm": "2 Timothy",
  tit: "Titus",
  ti: "Titus",
  phlm: "Philemon",
  philem: "Philemon",
  heb: "Hebrews",
  jas: "James",
  jam: "James",
  "1 pet": "1 Peter",
  "1 pt": "1 Peter",
  "2 pet": "2 Peter",
  "2 pt": "2 Peter",
  "1 jn": "1 John",
  "2 jn": "2 John",
  "3 jn": "3 John",
  rev: "Revelation",
  rv: "Revelation",
  apoc: "Revelation",
};

// Every spelling we accept, lower-cased → the canonical name.
const LOOKUP = new Map();
for (const name of Object.keys(BOOKS)) LOOKUP.set(name.toLowerCase(), name);
for (const [k, v] of Object.entries(ALIASES))
  if (BOOKS[v]) LOOKUP.set(k.toLowerCase(), v);
for (const [k, v] of Object.entries(ABBREVIATIONS)) LOOKUP.set(k, v);

/**
 * "john", "John", "Jn", "jn.", "1cor", "1 Cor", "I Corinthians", "psalm" →
 * the book's canonical name; null if it isn't a book of the Bible.
 */
export function canonicalBook(name) {
  const n = name
    .toLowerCase()
    .replace(/\./g, " ")
    .replace(/^(iii|ii|i)\s+(?=[a-z])/, (_, r) => `${r.length} `) // I John, II Kings
    .replace(
      /^(first|second|third)\s+/,
      (w) => `${{ first: 1, second: 2, third: 3 }[w.trim()]} `,
    )
    .replace(/^([1-3])\s*/, "$1 ")
    .replace(/\s+/g, " ")
    .trim();
  return LOOKUP.get(n) ?? null;
}

/** "jn 3:16" → "John 3:16", "ps 23" → "Psalm 23": a typed reference as it should print. */
export function prettyCitation(ref) {
  const m = ref
    .trim()
    .match(
      /^((?:(?:[1-3]|[iI]{1,3})\s?)?[A-Za-z][A-Za-z. ]*?)\.?\s*(?=\d|[A-F]:)/,
    );
  const book = m && canonicalBook(m[1]);
  if (!book) return ref.trim();
  return `${book === "Psalms" ? "Psalm" : book} ${ref.trim().slice(m[0].length).replace(/\s+/g, " ")}`;
}

// --- citation parsing --------------------------------------------------------

const END = 999; // "to the end of the chapter"; clamped once the chapter is known

/**
 * "Hebrews 4:14-16; 5:7-9" → [{ book, ranges: [{ c1, v1, c2, v2, part }] }]
 * Partial-verse letters (6a, 16bc) are kept as `part` but the whole verse is
 * shown: the operator trims if the lectionary stops mid-verse.
 */
export function parseCitation(raw) {
  let s = raw
    .replace(/[–—]/g, "-")
    .replace(/\band\b/g, ",")
    .replace(/^\s*Cf\.?\s*/i, "")
    .trim();

  const out = [];
  let book = null;
  let vulgate = false; // "Psalm 18 (19)": first number is already Vulgate
  let chapter = null;

  for (let seg of s.split(";")) {
    seg = seg.trim();
    if (!seg) continue;
    // The book runs until the first number (spaces optional: "jn3:16"), or a
    // capital chapter letter of the Greek Esther ("Esther C:12").
    const m = seg.match(
      /^((?:(?:[1-3]|[iI]{1,3})\s?)?[A-Za-z][A-Za-z. ]*?)\.?\s*(?=\d|[A-F]:)/,
    );
    if (m) {
      const name = canonicalBook(m[1]);
      if (!name) throw new Error(`Unknown book “${m[1]}” in ${raw}`);
      book = { book: name, ranges: [] };
      out.push(book);
      seg = seg.slice(m[0].length);
      chapter = null;
      vulgate = false;
    }
    if (!book) throw new Error(`Can't read the citation “${raw}”`);

    const paren = seg.match(/^(\d+)\s*\((\d+)\)\s*$/);
    if (paren) {
      vulgate = true;
      book.vulgate = true;
      // `heb` is the psalm's Hebrew number, for Bibles numbered that way.
      book.ranges.push({
        c1: +paren[1],
        v1: 1,
        c2: +paren[1],
        v2: END,
        heb: +paren[2],
      });
      continue;
    }

    let items;
    if (seg.includes(":")) {
      const i = seg.indexOf(":");
      chapter = chap(seg.slice(0, i));
      items = seg.slice(i + 1);
    } else if (chapter == null) {
      // "Psalm 89" (whole psalm) or the odd "Psalm 84,5" (chapter, verse).
      const parts = seg.split(",").map((x) => x.trim());
      if (parts.length === 1) {
        const c = chap(parts[0]);
        book.ranges.push({ c1: c, v1: 1, c2: c, v2: END });
        continue;
      }
      chapter = chap(parts[0]);
      items = parts.slice(1).join(",");
    } else {
      items = seg;
    }

    for (let it of items.split(",")) {
      it = it.trim();
      if (!it) continue;
      const [a, b] = it.split("-").map((x) => x.trim());
      const start = verse(a);
      let c2 = chapter;
      let end = start;
      if (b && /^[a-g]+$/.test(b)) {
        // "1b-e": parts of one verse
      } else if (b) {
        if (b.includes(":")) {
          const [bc, bv] = b.split(":");
          c2 = chap(bc);
          end = verse(bv);
        } else end = verse(b);
      }
      book.ranges.push({
        c1: chapter,
        v1: start.n,
        c2,
        v2: end.n,
        part: start.part,
      });
      chapter = c2;
    }
  }
  return out;
}

function chap(x) {
  const t = x.trim();
  if (/^[A-F]$/.test(t)) return t; // Esther's lettered chapters (NAB)
  const n = parseInt(t, 10);
  if (Number.isNaN(n)) throw new Error(`Bad chapter “${x}”`);
  return n;
}

function verse(x) {
  const m = String(x)
    .trim()
    .match(/^(\d+)([a-g]*)/);
  if (!m) throw new Error(`Bad verse “${x}”`);
  return { n: +m[1], part: m[2] || "" };
}

// --- versification -----------------------------------------------------------

/** Lectionary (Hebrew-based) chapter:verse → Douay-Rheims chapter:verse. */
export function toDouay(
  book,
  c,
  v,
  { vulgate = false, part = "", end = false } = {},
) {
  switch (book) {
    case "Psalms":
      if (vulgate || c <= 8 || c >= 148) return [c, v];
      if (c === 9) return [9, v];
      if (c === 10) return [9, v + 21];
      if (c <= 113) return [c - 1, v];
      if (c === 114) return [113, v];
      if (c === 115) return [113, v + 8];
      if (c === 116) return v <= 9 ? [114, v] : [115, v - 9];
      if (c <= 146) return [c - 1, v];
      return v <= 11 ? [146, v] : [147, v - 11]; // 147
    case "Joel":
      if (c === 3) return [2, v + 27];
      if (c === 4) return [3, v];
      return [c, v];
    case "Malachi":
      return c === 3 && v >= 19 ? [4, v - 18] : [c, v];
    case "Hosea":
      if (c === 2) return v <= 2 ? [1, v + 9] : [2, v - 2];
      if (c === 12) return v === 1 ? [11, 12] : [12, v - 1];
      if (c === 14) return v === 1 ? [13, 16] : [14, v - 1];
      return [c, v];
    case "Micah":
      if (c === 4 && v === 14) return [5, 1];
      return c === 5 ? [5, v + 1] : [c, v];
    case "Isaiah":
      if (c === 8 && v === 23) return [9, 1];
      if (c === 9) return [9, v + 1];
      if (c === 63 && v === 19 && part.startsWith("b")) return [64, 1];
      if (c === 64) return [64, v + 1];
      return [c, v];
    case "Jeremiah":
      if (c === 8 && v === 23) return [9, 1];
      return c === 9 ? [9, v + 1] : [c, v];
    case "Zechariah":
      return c === 2 ? (v <= 4 ? [1, v + 17] : [2, v - 4]) : [c, v];
    case "1 Kings":
      if (c === 5) return v <= 14 ? [4, v + 20] : [5, v - 14];
      return [c, v];
    case "John":
      // The Vulgate splits 6:51 in two ("…my flesh, for the life of the world" is 6:52).
      if (c === 6 && v >= 52) return [6, v + 1];
      if (c === 6 && v === 51 && end) return [6, 52];
      return [c, v];
    case "3 John":
      return c === 1 && v === 15 ? [1, 14] : [c, v];
    case "Esther":
      // NAB's lettered additions. Only C (the prayers) is used at Mass.
      if (c === "C") return v <= 11 ? [13, v + 7] : [14, v - 11];
      return [c, v];
    default:
      return [c, v];
  }
}

/** Books where Douay-Rheims diverges enough that the operator should check. */
export const CHECK_BOOKS = new Set(["Sirach", "Tobit", "Judith", "Esther"]);

// --- fetching ------------------------------------------------------------------

const chapterCache = new Map();

// The whole Douay-Rheims ships with the app (scripts/fetch-bible.mjs), one
// file per book, loaded the first time a passage from it is needed and
// precached for offline use. Outside Vite (scripts, tests) there is no glob.
// The World English Bible likewise (scripts/build-webbe.py).
let bundled = {};
try {
  bundled = {
    dr: import.meta.glob("../data/bible/*.json", { import: "default" }),
    web: import.meta.glob("../data/bible-web/*.json", { import: "default" }),
  };
} catch {
  /* fall back to the network */
}
const bookFiles = new Map();
const DIRS = { dr: "bible", web: "bible-web" };

async function bundledChapter(bible, book, chapter) {
  const load = bundled[bible]?.[`../data/${DIRS[bible]}/${BOOKS[book]}.json`];
  if (!load) return null;
  const fileKey = `${bible}:${book}`;
  if (!bookFiles.has(fileKey)) bookFiles.set(fileKey, load());
  const list = (await bookFiles.get(fileKey))?.[chapter];
  if (!list) return null;
  const verses = new Map();
  list.forEach((text, i) => text && verses.set(i + 1, text));
  return verses;
}

async function fetchChapter(bible, book, chapter) {
  const key = `${bible}:${book}:${chapter}`;
  if (chapterCache.has(key)) return chapterCache.get(key);
  const p = (async () => {
    const local = await bundledChapter(bible, book, chapter).catch(() => null);
    if (local) return local;
    if (bible !== "dr")
      throw new Error(`${book} ${chapter} isn't in the built-in Bible.`);
    let res;
    try {
      res = await fetch(`${API}/${BOOKS[book]}/${chapter}.json`);
    } catch {
      throw new Error(
        "This passage isn't in the built-in Bible and the Bible service can't be reached.",
      );
    }
    if (!res.ok)
      throw new Error(`${book} ${chapter} isn't available (${res.status}).`);
    const data = await res.json();
    const verses = new Map();
    for (const v of data.verses ?? []) verses.set(v.verse, clean(v.text));
    return verses;
  })();
  chapterCache.set(key, p);
  p.catch(() => chapterCache.delete(key));
  return p;
}

/**
 * Resolve a citation to verses in one of the built-in Bibles (BIBLES).
 * Returns `{ citation, book, bible, verses: [{ ref, text, group }] }` where
 * `group` is the index of the comma-separated piece it came from — psalm
 * stanzas follow those. Refs are the Bible's own chapter:verse.
 */
export async function fetchPassage(citation, { bible = DEFAULT_BIBLE } = {}) {
  // No online check: the Bible is built in, so this works on an offline laptop.
  if (!BIBLES[bible]) bible = DEFAULT_BIBLE;
  const dr = bible === "dr";
  const books = parseCitation(citation);
  const verses = [];
  let group = 0;
  for (const b of books) {
    for (const r of b.ranges) {
      const single = r.c1 === r.c2 && r.v1 === r.v2;
      let sc, sv, ec, ev;
      if (dr) {
        [sc, sv] = toDouay(b.book, r.c1, r.v1, {
          vulgate: b.vulgate,
          part: r.part,
        });
        [ec, ev] = toDouay(b.book, r.c2, r.v2, {
          vulgate: b.vulgate,
          part: single ? r.part : "",
          end: true,
        });
      } else {
        // Already in the lectionary's numbering; "Psalm 18 (19)" means Psalm 19.
        [sc, sv, ec, ev] = [r.heb ?? r.c1, r.v1, r.heb ?? r.c2, r.v2];
      }
      for (let c = sc; c <= ec; c++) {
        const chapter = await fetchChapter(bible, b.book, c);
        const last = Math.max(...chapter.keys());
        const from = c === sc ? sv : 1;
        const to = c === ec ? Math.min(ev >= END - 50 ? last : ev, last) : last;
        for (let v = from; v <= to; v++) {
          let text = chapter.get(v);
          if (text && dr && b.book === "Psalms" && v <= 2)
            text = stripTitle(text);
          if (text)
            verses.push({ ref: `${c}:${v}`, text, group, book: b.book });
        }
      }
      group++;
    }
  }
  if (!verses.length) throw new Error(`No text found for ${citation}.`);
  return {
    citation,
    book: books[0].book,
    books: books.map((b) => b.book),
    bible,
    verses,
  };
}

/**
 * Douay-Rheims runs a psalm's heading into its first verse ("A canticle for
 * David himself, when the house was built after the captivity. Sing ye to
 * the Lord a new canticle…"). The lectionary never proclaims the heading.
 */
const TITLE =
  /^(?:(?:unto the end|a psalm|psalm|a canticle|canticle|a prayer|a gradual canticle|the title|for david|of david|for asaph|for the sons of core|for the octave|understanding|on the day|in the end|a song|for idithun|for solomon|for moses|for the presses|for them that shall be changed|for the inscription|praise,? for david[^.]*)[^.:]*[.:]\s*)+/i;

export function stripTitle(text) {
  const out = text.replace(TITLE, "");
  return out.length >= 12 ? out : text;
}

function clean(text) {
  return text.replace(/\s+/g, " ").trim();
}

// --- headings -------------------------------------------------------------------

const PROPHETS = new Set([
  "Isaiah",
  "Jeremiah",
  "Ezekiel",
  "Daniel",
  "Hosea",
  "Joel",
  "Amos",
  "Obadiah",
  "Jonah",
  "Micah",
  "Nahum",
  "Habakkuk",
  "Zephaniah",
  "Haggai",
  "Zechariah",
  "Malachi",
  "Baruch",
]);
const PAUL = {
  Romans: "to the Romans",
  "1 Corinthians": "to the Corinthians",
  "2 Corinthians": "to the Corinthians",
  Galatians: "to the Galatians",
  Ephesians: "to the Ephesians",
  Philippians: "to the Philippians",
  Colossians: "to the Colossians",
  "1 Thessalonians": "to the Thessalonians",
  "2 Thessalonians": "to the Thessalonians",
  "1 Timothy": "to Timothy",
  "2 Timothy": "to Timothy",
  Titus: "to Titus",
  Philemon: "to Philemon",
};
const ORDINAL = { 1: "first", 2: "second", 3: "third" };

/** "A reading from the Book of the Prophet Isaiah", the way the ambo says it. */
export function incipit(book) {
  const n = book.match(/^([1-3]) (.+)$/);
  const ord = n ? `${ORDINAL[n[1]]} ` : "";
  const base = n ? n[2] : book;
  if (["Matthew", "Mark", "Luke", "John"].includes(book))
    return `A reading from the holy Gospel according to ${book}`;
  if (book === "Acts") return "A reading from the Acts of the Apostles";
  if (PAUL[book])
    return `A reading from the ${ord}Letter of Saint Paul ${PAUL[book]}`;
  if (book === "Hebrews") return "A reading from the Letter to the Hebrews";
  if (["James", "Jude"].includes(book))
    return `A reading from the Letter of Saint ${book}`;
  if (n && ["Peter", "John"].includes(base))
    return `A reading from the ${ord}Letter of Saint ${base}`;
  if (book === "Revelation") return "A reading from the Book of Revelation";
  if (PROPHETS.has(book))
    return `A reading from the Book of the Prophet ${book}`;
  if (book === "Song of Songs") return "A reading from the Song of Songs";
  if (book === "Lamentations") return "A reading from the Book of Lamentations";
  if (n) return `A reading from the ${ord}Book of ${base}`;
  return `A reading from the Book of ${book}`;
}
