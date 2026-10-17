# Data sources

## Lectionary — `lectionary.json`

Every citation in the Lectionary for Mass: Sundays and solemnities in Years
A, B and C; Ordinary Time weekdays in Years I and II; the weekdays of Advent,
Christmas, Lent and Easter; the saints. Citations only — no scripture text.

Merged from two public sources by `scripts/build-lectionary.py`:

1. **Liturgical Calendar Project** — John R. D'Orazio and contributors,
   [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0).
   <https://github.com/Liturgical-Calendar/LiturgicalCalendarAPI>,
   `jsondata/sourcedata/rite/roman/lectionary/*/en.json`. Used wherever it has
   an entry (all of Year A and the seasonal weekdays).
2. **Tamil Catholic Lectionary** — jayarathina, released into the public
   domain ([Unlicense](https://unlicense.org)).
   <https://github.com/jayarathina/Tamil-Catholic-Lectionary>,
   `MySQL/liturgy_lectionary_table_readings__list.sql`. Fills the entries that
   source 1 has not yet completed (most of Years B and C, weekday Years I and
   II, and many saints), with Tamil book names translated and its English
   verse numbering converted to the lectionary's Hebrew numbering. On the 993
   parts both sources have, 86% name the same passage; the rest are mostly
   editorial differences between national editions (a verse more or less, a
   different Common) rather than numbering errors.

Added by hand: the Memorial of the Blessed Virgin Mary, Mother of the Church
(2018), missing from both.

## Calendar — `calendar/YYYY.json`

The General Roman Calendar for 2025–2040 from the Liturgical Calendar
Project's API (`/api/v5/calendar`), Apache-2.0, with Epiphany on the Sunday
between 2 and 8 January and the Ascension and Corpus Christi on Sunday.
Compacted to `{ date: [[event_key, name, grade, colour, season, vigil_for?], …] }`.
Regenerate or extend with `node scripts/fetch-calendar.mjs 2041 2050`.

## Scripture text

- **`bible-web/`** — the **World English Bible, British Edition**, with the
  Deuterocanon, from eBible.org (<https://ebible.org/find/details.php?id=eng-webbe>,
  `eng-webbe_vpl.zip`). Public domain. "World English Bible" is a trademark
  of eBible.org. The text is unchanged; `scripts/build-webbe.py` renumbers it
  to the Lectionary's Hebrew verse numbers, removes the psalm headings run
  into verse 1, takes Daniel from *Daniel (Greek)*, stores Esther's addition C
  (Greek Esther 4:18–47) as chapter `C`, and puts Romans' doxology at 16:25–27.
- **`bible/`** — the **Douay-Rheims** Bible, public domain, from
  api.getbible.net (`scripts/fetch-bible.mjs`), in its own (Vulgate)
  numbering.
