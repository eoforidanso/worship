/**
 * Scripture lookup.
 *
 * The two built-in Bibles (lib/bible.js) work offline. The others are
 * fetched from bible-api.com at prep time and written into the plan as
 * ordinary slides, so the service itself never needs the network — the same
 * terms as the rest of the app. Only public-domain translations are offered;
 * that's what the API serves, and it keeps projection free of licensing.
 */

import { uid } from "./id";
import { fetchPassage, prettyCitation, BIBLES } from "./bible";

// Built in, with the deuterocanonical books, numbered like the lectionary.
const BUILT_IN = { webbe: "web", dr: "dr" };

export const TRANSLATIONS = [
  {
    id: "webbe",
    label: "WEB",
    name: "World English Bible, British Edition (built in, Catholic canon)",
  },
  {
    id: "dr",
    label: "Douay-Rheims",
    name: "Douay-Rheims (built in, Catholic canon)",
  },
  { id: "kjv", label: "KJV", name: "King James Version" },
  {
    id: "web",
    label: "WEB (US)",
    name: "World English Bible, American spelling",
  },
  { id: "asv", label: "ASV", name: "American Standard Version" },
  { id: "bbe", label: "BBE", name: "Bible in Basic English" },
  { id: "oeb-us", label: "OEB", name: "Open English Bible" },
  { id: "darby", label: "Darby", name: "Darby Translation" },
  { id: "dra", label: "DRA", name: "Douay-Rheims 1899" },
];

/**
 * @param {string} reference  "John 3:16-18", "Psalm 23", "Rom 8:28, 31-39"
 * @returns {Promise<{reference: string, translation: string, verses: object[]}>}
 */
export async function lookup(reference, translation = "webbe") {
  const ref = reference.trim();
  if (!ref) throw new Error("Type a reference, like John 3:16-18.");
  const bible = BUILT_IN[translation];
  if (bible) {
    // Lectionary-style references; Douay-Rheims numbering is converted inside,
    // so the footer shows the reference as typed rather than Vulgate numbers.
    const p = await fetchPassage(ref, { bible });
    const pretty = prettyCitation(ref);
    return {
      reference: pretty,
      translation: BIBLES[bible].short,
      fixedFooter: `${pretty} · ${BIBLES[bible].short}`,
      verses: p.verses.map((v) => {
        const [chapter, verse] = v.ref.split(":").map(Number);
        return { book: v.book, chapter, verse, text: v.text };
      }),
    };
  }
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new Error(
      "You're offline. Look scripture up during prep, while there's a connection — it's saved with the service.",
    );
  }

  let res;
  try {
    res = await fetch(
      `https://bible-api.com/${encodeURIComponent(ref)}?translation=${encodeURIComponent(translation)}`,
    );
  } catch {
    throw new Error(
      "Couldn't reach the Bible service. Check the connection and try again.",
    );
  }
  if (res.status === 404)
    throw new Error(`Couldn't find “${ref}”. Check the book name and verses.`);
  if (res.status === 429)
    throw new Error(
      "Too many lookups in a row. Wait a few seconds and try again.",
    );
  if (!res.ok)
    throw new Error(
      `The Bible service answered ${res.status}. Try again in a moment.`,
    );

  const data = await res.json();
  const label =
    TRANSLATIONS.find((t) => t.id === data.translation_id)?.label ??
    translation.toUpperCase();
  return {
    reference: data.reference,
    translation: label,
    verses: (data.verses ?? []).map((v) => ({
      book: v.book_name,
      chapter: v.chapter,
      verse: v.verse,
      text: clean(v.text),
    })),
  };
}

/**
 * Turn verses into slides, `perSlide` verses at a time. Each slide carries
 * its own reference as a footer, so the congregation sees "John 3:17" on the
 * slide that is actually verse 17 rather than the range of the whole reading.
 */
export function versesToSlides(result, { perSlide = 1, numbers = true } = {}) {
  const slides = [];
  const { verses, translation } = result;
  for (let i = 0; i < verses.length; i += perSlide) {
    const group = verses.slice(i, i + perSlide);
    const first = group[0];
    const last = group[group.length - 1];
    const span =
      first.chapter !== last.chapter
        ? `${first.chapter}:${first.verse}–${last.chapter}:${last.verse}`
        : first.verse === last.verse
          ? `${first.chapter}:${first.verse}`
          : `${first.chapter}:${first.verse}–${last.verse}`;
    const body = group
      .map((v) =>
        numbers && group.length > 1 ? `${sup(v.verse)} ${v.text}` : v.text,
      )
      .join(" ");
    slides.push({
      id: uid("sl"),
      label: `v${first.verse}${last.verse !== first.verse ? `–${last.verse}` : ""}`,
      body,
      footer: result.fixedFooter ?? `${first.book} ${span} · ${translation}`,
    });
  }
  return slides;
}

function clean(text) {
  return text.replace(/\s+/g, " ").trim();
}

const SUP = {
  0: "⁰",
  1: "¹",
  2: "²",
  3: "³",
  4: "⁴",
  5: "⁵",
  6: "⁶",
  7: "⁷",
  8: "⁸",
  9: "⁹",
};
function sup(n) {
  return String(n)
    .split("")
    .map((d) => SUP[d])
    .join("");
}
