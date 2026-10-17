#!/usr/bin/env python3
"""
Bundle the World English Bible British Edition (with Deuterocanon) — public
domain, from eBible.org — in the lectionary's own numbering.

  1. Download https://ebible.org/Scriptures/eng-webbe_vpl.zip and unzip it.
  2. python3 -I scripts/build-webbe.py <path to eng-webbe_vpl.txt> src/data/bible-web

Writes one file per book, { "<chapter>": ["verse 1", …] }, numbered like the
Lectionary for Mass (Hebrew/NAB numbering), so citations need no conversion:

  - English verse numbers are converted with the same rules used to build
    the lectionary (Psalm superscriptions, Joel 3, Malachi 4, Hosea, Jonah,
    Micah 5, Isaiah 9 and 64, Zechariah 2, 1 Kings 4–5, Exodus 22, …).
  - Psalm headings ("For the Chief Musician. A Psalm by David.") are run into
    verse 1 in this edition; they're removed — the lectionary never reads them.
  - Daniel comes from Daniel (Greek), which already has 3:24–90, Susanna (13)
    and Bel (14) where the lectionary expects them.
  - Romans' closing doxology is put back at 16:25–27 (this edition has it
    after 14:23).
  - Esther's additions C (the prayers of Mordecai and Esther, "Esther C:12…")
    are Esther (Greek) 4:18–47, stored as chapter "C".

"World English Bible" is a trademark of eBible.org; the text itself is not
changed here, only renumbered.
"""

import json
import re
import sys
from collections import defaultdict
from pathlib import Path

SRC, OUT = Path(sys.argv[1]), Path(sys.argv[2])
OUT.mkdir(parents=True, exist_ok=True)

# eBible book codes → the book numbers used by src/lib/bible.js (getbible.net's).
IDS = {
    'GEN': 1, 'EXO': 2, 'LEV': 3, 'NUM': 4, 'DEU': 5, 'JOS': 6, 'JDG': 7, 'RUT': 8, '1SA': 9, '2SA': 10,
    '1KI': 11, '2KI': 12, '1CH': 13, '2CH': 14, 'EZR': 15, 'NEH': 16, 'EST': 17, 'JOB': 18, 'PSA': 19,
    'PRO': 20, 'ECC': 21, 'SOL': 22, 'ISA': 23, 'JER': 24, 'LAM': 25, 'EZE': 26, 'DNG': 27, 'HOS': 28,
    'JOE': 29, 'AMO': 30, 'OBA': 31, 'JON': 32, 'MIC': 33, 'NAH': 34, 'HAB': 35, 'ZEP': 36, 'HAG': 37,
    'ZEC': 38, 'MAL': 39, 'MAT': 40, 'MAR': 41, 'LUK': 42, 'JOH': 43, 'ACT': 44, 'ROM': 45, '1CO': 46,
    '2CO': 47, 'GAL': 48, 'EPH': 49, 'PHI': 50, 'COL': 51, '1TH': 52, '2TH': 53, '1TI': 54, '2TI': 55,
    'TIT': 56, 'PHM': 57, 'HEB': 58, 'JAM': 59, '1PE': 60, '2PE': 61, '1JO': 62, '2JO': 63, '3JO': 64,
    'JUD': 65, 'REV': 66, 'TOB': 69, 'JDT': 70, 'WIS': 73, 'SIR': 74, 'BAR': 75, '1MA': 80, '2MA': 81,
}
# Books whose English numbering differs from the lectionary's.
NAMES = {
    'PSA': 'Psalm', 'JOE': 'Joel', 'MAL': 'Malachi', 'HOS': 'Hosea', 'JON': 'Jonah', 'MIC': 'Micah',
    'ISA': 'Isaiah', 'JER': 'Jeremiah', 'ZEC': 'Zechariah', '1KI': '1 Kings', '2CO': '2 Corinthians',
    'EXO': 'Exodus', 'LEV': 'Leviticus', 'NUM': 'Numbers', 'DEU': 'Deuteronomy', '1SA': '1 Samuel',
    '2SA': '2 Samuel', '2KI': '2 Kings', 'NEH': 'Nehemiah', 'ECC': 'Ecclesiastes', 'SOL': 'Song of Songs',
    'EZE': 'Ezekiel', 'DNG': 'Daniel',
}

# Hebrew psalm verse = English verse + offset (the superscription is a verse
# in the Hebrew). The same table scripts/build-lectionary.py validated.
PSALM_TITLE = {p: 1 for p in [
    3, 4, 5, 6, 7, 8, 9, 12, 13, 18, 19, 20, 21, 22, 30, 31, 34, 36, 38, 39, 40, 41, 42, 44, 45, 46, 47,
    48, 49, 53, 55, 56, 57, 58, 59, 61, 62, 63, 64, 65, 67, 68, 69, 70, 75, 76, 77, 80, 81, 83, 84, 85, 88,
    89, 92, 102, 108, 140, 142]}
PSALM_TITLE.update({51: 2, 52: 2, 54: 2, 60: 2})


def to_hebrew(book, c, v):
    """English chapter:verse → the lectionary's (Hebrew) chapter:verse."""
    if book == 'Psalm': return c, v + PSALM_TITLE.get(c, 0)
    if book == 'Joel':
        if c == 2 and v >= 28: return 3, v - 27
        if c == 3: return 4, v
    if book == 'Malachi' and c == 4: return 3, v + 18
    if book == 'Hosea':
        if c == 1 and v >= 10: return 2, v - 9
        if c == 2: return 2, v + 2
        if c == 11 and v == 12: return 12, 1
        if c == 12: return 12, v + 1
        if c == 13 and v == 16: return 14, 1
        if c == 14: return 14, v + 1
    if book == 'Jonah':
        if c == 1 and v == 17: return 2, 1
        if c == 2: return 2, v + 1
    if book == 'Micah':
        if c == 5 and v == 1: return 4, 14
        if c == 5: return 5, v - 1
    if book == 'Isaiah':
        if c == 9 and v == 1: return 8, 23
        if c == 9: return 9, v - 1
        if c == 64 and v == 1: return 63, 19  # second half of Hebrew 63:19, joined below
        if c == 64: return 64, v - 1
    if book == 'Jeremiah':
        if c == 9 and v == 1: return 8, 23
        if c == 9: return 9, v - 1
    if book == 'Zechariah':
        if c == 1 and v >= 18: return 2, v - 17
        if c == 2: return 2, v + 4
    if book == '1 Kings':
        if c == 4 and v >= 21: return 5, v - 20
        if c == 5: return 5, v + 14
    if book == '2 Corinthians' and c == 13 and v == 14: return 13, 13
    if book == 'Exodus':
        if c == 8 and v <= 4: return 7, v + 25
        if c == 8: return 8, v - 4
        if c == 22 and v == 1: return 21, 37
        if c == 22: return 22, v - 1
    if book == 'Leviticus':
        if c == 6 and v <= 7: return 5, v + 19
        if c == 6: return 6, v - 7
    if book == 'Numbers':
        if c == 16 and v >= 36: return 17, v - 35
        if c == 17: return 17, v + 15
    if book == 'Deuteronomy':
        if c == 12 and v == 32: return 13, 1
        if c == 13: return 13, v + 1
        if c == 22 and v == 30: return 23, 1
        if c == 23: return 23, v + 1
    if book == '1 Samuel':
        if c == 20 and v == 42: return 21, 1
        if c == 21: return 21, v + 1
        if c == 23 and v == 29: return 24, 1
        if c == 24: return 24, v + 1
    if book == '2 Samuel':
        if c == 18 and v == 33: return 19, 1
        if c == 19: return 19, v + 1
    if book == '2 Kings':
        if c == 11 and v == 21: return 12, 1
        if c == 12: return 12, v + 1
    if book == 'Nehemiah':
        if c == 4 and v <= 6: return 3, v + 32
        if c == 4: return 4, v - 6
    if book == 'Ecclesiastes':
        if c == 5 and v == 1: return 4, 17
        if c == 5: return 5, v - 1
    if book == 'Song of Songs':
        if c == 6 and v == 13: return 7, 1
        if c == 7: return 7, v + 1
    if book == 'Ezekiel':
        if c == 20 and v >= 45: return 21, v - 44
        if c == 21: return 21, v + 5
    if book == 'Daniel':
        if c == 5 and v == 31: return 6, 1
        if c == 6: return 6, v + 1
    return c, v


# A psalm heading: the short sentences at the very start of verse 1 that name
# the musician, the kind of psalm, its author or its tune.
TITLE_START = re.compile(
    r'^(?:For the Chief Musician|For Jeduthun|To Jeduthun|To the tune of|Set to|According to|'
    r'On (?:an|a|stringed) |With (?:stringed|the flutes)|For a stringed|A (?:teaching )?[Pp]oem|A [Ss]ong\b|'
    r'A Psalm|A praise psalm|A contemplative psalm|A wedding song|A reminder\.|A Prayer|A contemplation|A meditation|'
    r'By (?:David|Asaph|Solomon|Moses|the sons of Korah)\b)'
)


def split_sentences(text):
    # Sentence ends outside quotation marks: ". " "! " "? " or a closing quote after one.
    out, cur, depth = [], '', 0
    for i, ch in enumerate(text):
        cur += ch
        if ch in '“‘':
            depth += 1
        elif ch in '”’' and depth:
            depth -= 1
        if ch in '.!?”' and depth == 0 and (i + 1 == len(text) or text[i + 1] == ' '):
            if ch != '”' or cur.rstrip('”').endswith(('.', '!', '?')):
                out.append(cur.strip())
                cur = ''
    if cur.strip():
        out.append(cur.strip())
    return out


def strip_heading(text):
    parts = split_sentences(text)
    while len(parts) > 1 and TITLE_START.search(parts[0]):
        parts.pop(0)
    text = ' '.join(parts)
    # Psalm 18's heading ends "…from the hand of Saul. He said," — Hebrew 18:1 too.
    # …and Psalm 119 opens with its first acrostic letter.
    return re.sub(r'^(?:He said, |ALEPH )', '', text)


books = defaultdict(lambda: defaultdict(dict))
esther_c = {}
line_re = re.compile(r'^(\S+) (\d+):(\d+) (.*)$')
for line in SRC.read_text(encoding='utf-8').splitlines():
    m = line_re.match(line)
    if not m:
        continue
    code, c, v, text = m.group(1), int(m.group(2)), int(m.group(3)), m.group(4).strip()
    text = re.sub(r'\s+', ' ', text).strip(' []')
    if code == 'ESG':
        if c == 4 and v >= 18:
            esther_c[v - 17] = text  # addition C, verses 1–30
        continue
    if code == 'DAN':
        continue  # Daniel (Greek) is used instead: it has the additions in place
    if code not in IDS:
        continue  # books not in the lectionary (1 Esdras, Psalm 151, 3–4 Maccabees…)
    if not text:
        continue  # a verse this edition prints elsewhere
    if code == 'ROM' and c == 14 and v >= 24:
        c, v = 16, v + 1  # the closing doxology, which this edition prints after 14:23
    if code == 'PSA' and v == 1:
        text = strip_heading(text)
    hc, hv = to_hebrew(NAMES.get(code, code), c, v)
    book = books[IDS[code]]
    if hv in book[hc]:
        book[hc][hv] = f'{book[hc][hv]} {text}'  # two English verses in one Hebrew verse
    else:
        book[hc][hv] = text

books[IDS['EST']]['C'] = esther_c

total = 0
for nr, chapters in books.items():
    out = {}
    for ch, verses in chapters.items():
        top = max(verses)
        out[str(ch)] = [verses.get(i) for i in range(1, top + 1)]
        total += len(verses)
    (OUT / f'{nr}.json').write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print(f'{len(books)} books, {total} verses → {OUT}')
