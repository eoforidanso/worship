#!/usr/bin/env python3
"""
Build src/data/lectionary.json — every citation in the Lectionary for Mass.

Two public sources, merged:

  1. Liturgical Calendar Project (Apache-2.0)
     github.com/Liturgical-Calendar/LiturgicalCalendarAPI
     jsondata/sourcedata/rite/roman/lectionary/<section>/en.json
     Keyed exactly like the calendar, NAB (Hebrew) numbering. Complete for
     Year A and the seasonal weekdays, but most of Years B and C, weekday
     Years I/II and many saints are still empty placeholders upstream.

  2. Tamil Catholic Lectionary (Unlicense / public domain)
     github.com/jayarathina/Tamil-Catholic-Lectionary
     MySQL/liturgy_lectionary_table_readings__list.sql
     The whole lectionary, but with Tamil book abbreviations and English
     (KJV/RSV) verse numbering.

Source 1 is used wherever it has an entry. Gaps are filled from source 2,
converted to the same book names and Hebrew numbering. The conversion is
checked against every entry both sources have; the report is printed.

Usage:
  python3 scripts/build-lectionary.py <dir with downloaded sources> src/data/lectionary.json
  (download commands are in README.md, "Updating the lectionary data")
"""

import json
import re
import sys
from collections import OrderedDict, defaultdict
from pathlib import Path

SRC = Path(sys.argv[1])
OUT = Path(sys.argv[2])

SECTIONS = {
    'A': 'dominicale_et_festivum_A', 'B': 'dominicale_et_festivum_B', 'C': 'dominicale_et_festivum_C',
    'I': 'feriale_per_annum_I', 'II': 'feriale_per_annum_II', 'advent': 'feriale_tempus_adventus',
    'christmas': 'feriale_tempus_nativitatis', 'lent': 'feriale_tempus_quadragesimae',
    'easter': 'feriale_tempus_paschatis', 'saints': 'sanctorum',
}

# --- Tamil book abbreviations (Tiruviviliam) → English ------------------------

TA = {
    'தொநூ': 'Genesis', 'விப': 'Exodus', 'லேவி': 'Leviticus', 'எண்': 'Numbers', 'இச': 'Deuteronomy',
    'யோசு': 'Joshua', 'நீத': 'Judges', 'ரூத்': 'Ruth', '1சாமு': '1 Samuel', '2சாமு': '2 Samuel',
    '1அர': '1 Kings', '2அர': '2 Kings', '1குறி': '1 Chronicles', '2குறி': '2 Chronicles',
    'எஸ்ரா': 'Ezra', 'நெகே': 'Nehemiah', 'தோபி': 'Tobit', 'யூதி': 'Judith', 'எஸ்': 'Esther',
    '1மக்': '1 Maccabees', '2மக்': '2 Maccabees', 'யோபு': 'Job', 'திபா': 'Psalm', 'நீமொ': 'Proverbs',
    'சஉ': 'Ecclesiastes', 'இபா': 'Song of Songs', 'சாஞா': 'Wisdom', 'சீஞா': 'Sirach', 'எசா': 'Isaiah',
    'எரே': 'Jeremiah', 'புல': 'Lamentations', 'பாரூ': 'Baruch', 'எசே': 'Ezekiel', 'தானி': 'Daniel',
    'ஓசே': 'Hosea', 'யோவே': 'Joel', 'ஆமோ': 'Amos', 'ஒப': 'Obadiah', 'யோனா': 'Jonah', 'மீக்': 'Micah',
    'நாகூ': 'Nahum', 'அப': 'Habakkuk', 'செப்': 'Zephaniah', 'ஆகா': 'Haggai', 'செக்': 'Zechariah',
    'மலா': 'Malachi', 'மத்': 'Matthew', 'மாற்': 'Mark', 'லூக்': 'Luke', 'யோவா': 'John', 'திப': 'Acts',
    'உரோ': 'Romans', '1கொரி': '1 Corinthians', '2கொரி': '2 Corinthians', 'கலா': 'Galatians',
    'எபே': 'Ephesians', 'பிலி': 'Philippians', 'கொலோ': 'Colossians', '1தெச': '1 Thessalonians',
    '2தெச': '2 Thessalonians', '1திமொ': '1 Timothy', '2திமொ': '2 Timothy', 'தீத்': 'Titus',
    'பில': 'Philemon', 'எபி': 'Hebrews', 'யாக்': 'James', '1பேது': '1 Peter', '2பேது': '2 Peter',
    '1யோவா': '1 John', '2யோவா': '2 John', '3யோவா': '3 John', 'யூதா': 'Jude', 'திவெ': 'Revelation',
    'தானி(இ)': 'Daniel+', 'எஸ்(கி)': 'Esther+', 'லூக்1': 'Luke',
}

# Hebrew psalm verse = English verse + offset (the superscription counted as
# verse 1, or 1–2). Standard table; validated against source 1 below.
PSALM_TITLE = {p: 1 for p in [
    3, 4, 5, 6, 7, 8, 9, 12, 13, 18, 19, 20, 21, 22, 30, 31, 34, 36, 38, 39, 40, 41, 42, 44, 45, 46, 47,
    48, 49, 53, 55, 56, 57, 58, 59, 61, 62, 63, 64, 65, 67, 68, 69, 70, 75, 76, 77, 80, 81, 83, 84, 85, 88,
    89, 92, 102, 108, 140, 142]}
PSALM_TITLE.update({51: 2, 52: 2, 54: 2, 60: 2})


def to_hebrew(book, c, v):
    """English (KJV/RSV) chapter:verse → Hebrew/NAB chapter:verse."""
    if book == 'Psalm':
        return c, v + PSALM_TITLE.get(c, 0)
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
        if c == 64 and v == 1: return 63, 19
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
    if book == 'Daniel+':  # Greek additions, numbered on their own in Tamil
        if c == 1: return ('Daniel', 3, v + 23)
        if c == 2: return ('Daniel', 13, v)
        if c == 3: return ('Daniel', 14, v)
    return c, v


TOKEN = re.compile(r'^(\d?[^\d:()]+(?:\([^)]*\))?)(.*)$')
ITEM = re.compile(r'^(\d+)([a-z]*)(?:-(?:(\d+):)?(\d+)([a-z]*))?$')
LETTERS = re.compile(r'^(\d+)([a-z]*)-([a-z]+)$')  # "17b-e": parts of one verse


def convert(ref):
    """'திபா96:1,3.4-5.7-8.9-10ac' → 'Psalm 96:1 and 3, 4-5, 7-8, 9-10ac'. None if not a citation."""
    ref = ref.strip()
    cf = 'காண்க' in ref  # "see" — the lectionary's "Cf."
    ref = ref.replace('காண்க', '').strip()

    segments = []
    book = None
    for seg in ref.split(';'):
        seg = seg.strip().lstrip(':')
        if not seg:
            continue
        if not re.match(r'^\d+(:|$)', seg):
            m = TOKEN.match(seg)
            abbr = m.group(1).strip() if m else ''
            if abbr not in TA:
                return None
            book = TA[abbr]
            if book == 'Esther+':
                return None  # Greek Esther; the one reading using it is already in source 1
            seg = m.group(2).lstrip(':').strip()
        if not book:
            return None
        segments.append((book, seg))

    # (book, chapter, verse-text, joined-with-and, end-chapter)
    pieces = []
    for book, seg in segments:
        if ':' not in seg:
            if not re.match(r'^\d+$', seg):
                return None
            pieces.append(('Daniel' if book == 'Daniel+' else book, int(seg), None, False, int(seg)))
            continue
        ch_s, verses = seg.split(':', 1)
        ch = int(ch_s)
        # "." separates stanzas of any responsorial psalm, canticles included.
        stanzas = verses.split('.')
        for st in stanzas:
            first = True
            for it in st.split(','):
                it = it.strip()
                if not it:
                    continue
                m = ITEM.match(it)
                if m:
                    v1, p1 = int(m.group(1)), m.group(2)
                    c2 = int(m.group(3)) if m.group(3) else ch
                    v2 = int(m.group(4)) if m.group(4) else None
                    p2 = m.group(5) or ''
                else:
                    m = LETTERS.match(it)
                    if not m:
                        continue
                    v1, p1, c2, v2, p2 = int(m.group(1)), m.group(2) + m.group(3), ch, None, ''
                if book == 'Isaiah' and ch == 64 and v1 == 1:
                    p1 = 'b' + p1  # English 64:1 is the second half of Hebrew 63:19
                start = to_hebrew(book, ch, v1)
                bk = start[0] if len(start) == 3 else ('Daniel' if book == 'Daniel+' else book)
                hc1, hv1 = start[-2:]
                if v2 is None:
                    txt, end_ch = f'{hv1}{p1}', hc1
                else:
                    hc2, hv2 = to_hebrew(book, c2, v2)[-2:]
                    txt = f'{hv1}{p1}-{hc2}:{hv2}{p2}' if hc2 != hc1 else f'{hv1}{p1}-{hv2}{p2}'
                    end_ch = hc2
                pieces.append((bk, hc1, txt, not first, end_ch))
                first = False
                ch = c2

    out = ''
    cur_book = cur_ch = None
    for bk, hc, txt, joined, end_ch in pieces:
        if txt is None:
            out += ('; ' if out else '') + f'{bk} {hc}'
        elif bk != cur_book:
            out += ('; ' if out else '') + f'{bk} {hc}:{txt}'
        elif hc != cur_ch:
            out += f'; {hc}:{txt}'
        else:
            out += (' and ' if joined else ', ') + txt
        cur_book, cur_ch = bk, end_ch
    return ('Cf. ' if cf else '') + out


# --- Tamil day ids → calendar keys --------------------------------------------

DAYS = {'0Sun': 'Sunday', '1Mon': 'Monday', '2Tue': 'Tuesday', '3Wed': 'Wednesday', '4Thu': 'Thursday',
        '5Fri': 'Friday', '6Sat': 'Saturday'}
PART = {0: 'palm_gospel', 1: 'first_reading', 2: 'responsorial_psalm', 3: 'second_reading',
        5: 'gospel_acclamation', 6: 'gospel'}


def load_tamil():
    sql = (SRC / 'tamil_list.sql').read_text(encoding='utf8')
    rows = re.findall(r"\('((?:[^'\\]|\\.)*)',\s*([\d.]+),\s*'((?:[^'\\]|\\.)*)'\)", sql)
    days = OrderedDict()
    for d, t, r in rows:
        days.setdefault(d, []).append((t, r))
    return days


def readings_from(rows):
    """Tamil rows → { part: 'A|B' } with alternatives in decimal order."""
    by = defaultdict(list)
    for t, r in rows:
        tf = float(t)
        part = PART.get(int(tf))
        if not part:
            continue
        c = convert(r)
        if c:
            by[part].append((t, c))
    out = {}
    for part, lst in by.items():
        lst.sort(key=lambda x: float(x[0]))
        seen = []
        for _, c in lst:
            if c not in seen:
                seen.append(c)
        out[part] = '|'.join(seen)
    return out


def merged(days, *ids):
    rows = []
    for i in ids:
        rows += days.get(i, [])
    return readings_from(rows)


def tamil_map(days, litcal_names):
    """{ (section, key[, mass]) : readings }"""
    out = {}
    for d in days:
        m = re.match(r'^OW(\d\d)-(\d\w{3})(?: ([ABC12]))?$', d)
        if m:
            n, day, y = int(m.group(1)), m.group(2), m.group(3)
            if day == '0Sun' and y and y in 'ABC':
                key = {34: 'ChristKing'}.get(n, f'OrdSunday{n}')
                out[(y, key)] = merged(days, f'OW{m.group(1)}-0Sun', d)
            elif day != '0Sun' and y in ('1', '2'):
                out[('I' if y == '1' else 'II', f'OrdWeekday{n}{DAYS[day]}')] = merged(days, f'OW{m.group(1)}-{day}', d)
            continue
        m = re.match(r'^OW00-(Trinity|CorpusChristi|SacredHeart) ([ABC])$', d)
        if m:
            out[(m.group(2), m.group(1))] = merged(days, f'OW00-{m.group(1)}', d)
            continue
        if d == 'OW00-ImmaculateHeart':
            out[('saints', 'ImmaculateHeart')] = merged(days, d)
            continue
        m = re.match(r'^(AW|LW|EW)(\d\d)-0Sun ([ABC])$', d)
        if m:
            season, n, y = m.group(1), int(m.group(2)), m.group(3)
            key = {'AW': f'Advent{n}', 'LW': f'Lent{n}' if n < 6 else 'PalmSun', 'EW': f'Easter{n}'}[season]
            out[(y, key)] = merged(days, f'{season}{m.group(2)}-0Sun', d)
            continue
        m = re.match(r'^CW01-HolyFamily ([ABC])$', d) or re.match(r'^CW04-Baptism ([ABC])$', d)
        if m:
            key = 'HolyFamily' if 'Holy' in d else 'BaptismLord'
            out[(m.group(1), key)] = merged(days, d)
            continue
        m = re.match(r'^EW07-Ascension ([ABC])$', d) or re.match(r'^EW08-Pentecost ([ABC])$', d)
        if m:
            base = d[:-2]
            key = 'Ascension' if 'Ascension' in d else 'Pentecost'
            r = merged(days, base, d)
            if key == 'Pentecost':
                out[(m.group(1), key, 'day')] = r
                out[(m.group(1), key, 'vigil')] = merged(days, 'EW08-Pentecost - Vigil')
            else:
                out[(m.group(1), key)] = r
            continue
        m = re.match(r'^CW01-Dec(\d\d)$', d) or re.match(r'^CW02-Jan(\d)$', d)
        if m:
            key = f'ChristmasWeekday{"Dec" if "Dec" in d else "Jan"}{int(m.group(1))}'
            out[('christmas', key)] = merged(days, d)
            continue
        if d.startswith('Nativity of the Lord '):
            mass = {'1': 'vigil', '2': 'night', '3': 'dawn', '4': 'day'}[d[-1]]
            for y in 'ABC':
                out[(y, 'Christmas', mass)] = merged(days, d)
            continue
        if re.match(r'^Transfiguration of the Lord [ABC]$', d):
            out[(d[-1], 'Transfiguration')] = merged(days, 'Transfiguration of the Lord', d)
            continue
        if re.match(r'^All Souls [ABC]$', d):
            schema = {'A': 'schema_one', 'B': 'schema_two', 'C': 'schema_three'}[d[-1]]
            out[('saints', 'AllSouls', schema)] = merged(days, 'All Souls', d)
            continue
        # Saints and named feasts, matched to the calendar's own names.
        if not re.match(r'^(AW|CW|LW|EW|OW|_|IN )', d):  # "IN …": India's national calendar
            name = d.replace(' - Vigil', '')
            key = litcal_names.get(norm(name)) or match_name(name, litcal_names)
            if key:
                mass = 'vigil' if d.endswith(' - Vigil') else None
                out[('saints', key) + ((mass,) if mass else ())] = merged(days, d)
    return out


TITLE_WORDS = set("""
    saint saints st sts blessed the of and apostle apostles evangelist bishop bishops martyr martyrs priest priests
    doctor church virgin virgins religious pope abbot deacon companions their his monk hermit
""".split())


def tokens(name):
    n = name.lower().replace('birth of', 'nativity of')
    n = re.sub(r'\(.*?\)', ' ', n)
    n = re.sub(r'[^a-zà-ÿ ]', ' ', n)
    return {w for w in n.split() if w not in TITLE_WORDS}


def norm(s):
    return ' '.join(sorted(tokens(s)))


def match_name(name, names):
    """Calendar key for a saint's name, by shared distinctive words."""
    t = tokens(name)
    if not t:
        return None
    best, score = None, 0.0
    for other, key in names.items():
        o = set(other.split())
        if not o:
            continue
        j = len(t & o) / len(t | o)
        if j > score:
            best, score = key, j
    return best if score >= 0.6 else None


def empty(v):
    if isinstance(v, dict):
        return all(empty(x) for x in v.values())
    return not (v or '').strip()


def verse_set(c):
    """{(book, chapter, verse)} a citation covers — enough to compare two citations."""
    out = set()
    book = None
    c = c.replace('Cf.', '').replace('–', '-').replace('—', '-').replace(' and ', ', ')
    for seg in c.split(';'):
        seg = seg.strip()
        m = re.match(r'^((?:[1-3] )?[A-Za-z][A-Za-z ]*?)\s*(\d.*)$', seg)
        if m and not re.match(r'^\d', seg):
            book, seg = m.group(1).strip().replace('Psalms', 'Psalm'), m.group(2)
        if ':' not in seg:
            continue
        ch, vs = seg.split(':', 1)
        ch = int(re.sub(r'\D', '', ch) or 0)
        for it in vs.split(','):
            nums = re.match(r'^\s*(\d+)[a-g]*\s*(?:-\s*(?:(\d+):)?(\d+))?', it)
            if not nums:
                continue
            a = int(nums.group(1))
            c2 = int(nums.group(2)) if nums.group(2) else ch
            b = int(nums.group(3)) if nums.group(3) else a
            if c2 != ch:
                out.update((book, ch, v) for v in range(a, a + 40))
                out.update((book, c2, v) for v in range(1, b + 1))
                ch = c2
            else:
                out.update((book, ch, v) for v in range(a, b + 1))
    return out


def same_passage(x, y):
    a, b = verse_set(x), verse_set(y)
    if not a or not b:
        return False
    return len(a & b) / len(a | b) >= 0.5


def canon(c):
    """Comparable form of a citation: book + verse numbers, ignoring style."""
    c = c.replace('–', '-').replace('—', '-').replace('Cf.', '').replace(' and ', ',')
    c = re.sub(r'(\d)[a-g]+', r'\1', c)
    c = re.sub(r'\s+', '', c).lower()
    c = c.replace('psalms', 'psalm')
    return c


def main():
    litcal = {k: json.loads((SRC / f'{v}.json').read_text()) for k, v in SECTIONS.items()}

    # Calendar names → keys, for matching saints by name.
    names = {}
    for f in sorted((SRC / 'cal').glob('*.json')):
        for e in json.loads(f.read_text())['litcal']:
            names.setdefault(norm(e['name']), e['event_key'])
    for alias, key in {
        'Blessed Virgin Mary, the Mother of God': 'MaryMotherOfGod',
        'Birth of Saint John the Baptist': 'NativityJohnBaptist',
        'Saint Joseph Husband of the Blessed Virgin Mary': 'StJoseph',
        # Names too different to match safely by words.
        'Saint Alphonsus Maria de Liguori, bishop and doctor of the Church': 'StAlphonsusMariaDeLiguori',
        'Saint Andrew Dung-Lac and his companions, martyrs': 'StAndrewDungLac',
        'Saint Andrew Kim Taegon, priest, and Paul Chong Hasang and companions, martyrs': 'StAndrewKimTaegon',
        'Saint Anselm of Canterbury, bishop and doctor of the Church': 'StAnselm',
        'Saint Anthony of Egypt, abbot': 'StAnthonyEgypt',
        'Saint Augustine of Hippo, bishop and doctor of the Church': 'StAugustineHippo',
        'Saint Bernard of Clairvaux, abbot and doctor of the Church': 'StBernardClairvaux',
        'Saint Birgitta, religious': 'StBridget',
        'Saint Hilary of Poitiers, bishop and doctor': 'StHilaryPoitiers',
        'Saint Jean Vianney (the Curé of Ars), priest': 'StJeanVianney',
        'Saint John of Capistrano, priest': 'StJohnCapistrano',
        'Saint Pio of Pietrelcina (Padre Pio), priest': 'StPioPietrelcina',
        'Saints Joachim and Anne': 'StsJoachimAnne',
        'Saints Martha, Mary and Lazarus': 'StMartha',
        'First Martyrs of the Church of Rome': 'FirstMartyrsRome',
    }.items():
        names.setdefault(norm(alias), key)

    tamil = tamil_map(load_tamil(), names)

    # Validate on overlap.
    agree = disagree = 0
    report = []
    for (sec, key, *mass), tr in tamil.items():
        lc = litcal.get(sec, {}).get(key)
        if lc is None or empty(lc):
            continue
        if mass:
            lc = lc.get(mass[0]) if isinstance(lc, dict) else None
            if not lc or empty(lc):
                continue
        for part, tv in tr.items():
            lv = lc.get(part) if isinstance(lc, dict) else None
            if not lv or not isinstance(lv, str):
                continue
            if any(same_passage(x, y) for x in lv.split('|') for y in tv.split('|')):
                agree += 1
            else:
                disagree += 1
                report.append(f'{sec}/{key}{"/" + mass[0] if mass else ""} {part}: litcal={lv!r} tamil={tv!r}')

    # Fill gaps.
    filled = defaultdict(int)
    out = json.loads(json.dumps(litcal))
    for (sec, key, *mass), tr in tamil.items():
        if not tr:
            continue
        section = out.setdefault(sec, {})
        cur = section.get(key)
        if mass:
            if cur is None or not isinstance(cur, dict) or not all(isinstance(x, dict) for x in cur.values()):
                if cur is not None and not empty(cur):
                    continue  # a single-Mass entry upstream; keep it
                cur = {}
            if empty(cur.get(mass[0], {})):
                cur[mass[0]] = tr
                section[key] = cur
                filled[sec] += 1
        elif cur is None or empty(cur):
            section[key] = tr
            filled[sec] += 1

    # Where source 1 names only the psalm ("Psalm 96"), take source 2's stanzas.
    sharpened = 0
    for (sec, key, *mass), tr in tamil.items():
        cur = out.get(sec, {}).get(key)
        if mass and isinstance(cur, dict):
            cur = cur.get(mass[0])
        if not isinstance(cur, dict):
            continue
        lv, tv = cur.get('responsorial_psalm'), tr.get('responsorial_psalm')
        if not lv or not tv or ':' in lv or '|' in tv:
            continue
        nums = re.findall(r'\d+', lv)
        hebrew = nums[-1] if nums else None  # "Psalm 88 (89)": the Hebrew number is in brackets
        if hebrew and re.match(rf'^Psalm {hebrew}:', tv):
            cur['responsorial_psalm'] = tv
            sharpened += 1

    # The same every year: fill Years B and C from Year A.
    for key in ['Christmas2', 'Epiphany', 'HolyThursChrism', 'HolyThurs', 'GoodFri', 'Easter', 'MaryMotherOfGod']:
        for y in 'BC':
            if empty(out[y].get(key, {})) and not empty(out['A'].get(key, {})):
                out[y][key] = out['A'][key]
                filled[y] += 1

    # The one memorial missing from both: added in 2018.
    out['saints']['MaryMotherChurch'] = {
        'first_reading': 'Genesis 3:9-15, 20|Acts 1:12-14', 'responsorial_psalm': 'Psalm 87:1-2, 3 and 5, 6-7',
        'gospel_acclamation': 'Cf. Luke 1:28', 'gospel': 'John 19:25-34'}

    still = {sec: [k for k, v in d.items() if empty(v)] for sec, d in out.items()}
    text = json.dumps(out, ensure_ascii=False, separators=(',', ':'))
    # A slip in the source data (Jude has one chapter).
    text = text.replace('"Jude 17:20b-25"', '"Jude 1:17, 20b-25"')
    OUT.write_text(text)

    print(f'overlap check: {agree} parts agree, {disagree} differ ({agree / max(1, agree + disagree):.1%} agree)')
    print('filled:', dict(filled), '| psalms given their stanzas:', sharpened)
    print('still empty:', {k: len(v) for k, v in still.items() if v})
    for sec, ks in still.items():
        if ks:
            print(f'  {sec}: {ks[:30]}')
    (SRC / 'disagreements.txt').write_text('\n'.join(report))
    print(f'disagreements written to {SRC / "disagreements.txt"}')


if __name__ == '__main__':
    main()
