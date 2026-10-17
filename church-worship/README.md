# Church Worship

Presentation software for a Catholic parish, in the shape of EasyWorship: plan
the Mass, compose the slides, then drive the projector live. The Lectionary is
built in — pick a date and the day's readings arrive in the service, in the
right cycle, ready to project.

## Running it

Node 18+ is required (it isn't currently installed on this machine — see the note
at the bottom).

```bash
npm install
npm run dev
```

Open http://localhost:5173. To sync a projector or stage display on a *different*
machine, also run the relay:

```bash
npm run server
```

`npm start` runs both together.

## The five surfaces

| Surface | Where | What it does |
| --- | --- | --- |
| **Service Planner** | left rail, always visible | Drag-and-drop the running order. Click an item to **cue** it (nothing changes on screen), double-click to edit. ☆ saves it to the library. |
| **Readings** | `/readings` | The Lectionary for Mass by date: the celebration, Year A/B/C and I/II, the Mass options, and every reading — added to the service in one click. |
| **Prayers** | `/prayers` | The people's parts of the Order of Mass — traditional English, Latin, or your missal's wording pasted once. |
| **Services & Songs** | `/library` | Every saved service, newest first — open one, or start next week's as a copy. The song library, searchable by title, author or lyric. Export / import / back up. |
| **Slide Composer** | `/compose/:itemId` | Edit slide text, labels, theme and background. Paste a whole song and have it split into slides. |
| **Media Browser** | `/media` | Grid of images and video with tags and search. Drop files onto it. Star an image to make it the logo. |
| **Live Controller** | `/live` | Live and next preview, the cued item's slide grid, transport, blackout / clear / logo, countdown, stage messages. |
| **Stage Display** | `/stage`, own window | Current and next lyrics for the worship team, plus clock, countdown, notes and operator messages. |

The **Output** window (`/output`) is what the congregation sees. Open it with the
button in the top bar, drag it to the projector, double-click for fullscreen.

## Mass readings

Open **Readings** (or press *✠ Readings of the day* under the plan). It opens
on the service's date; the top bar shows the same day — "29th Sunday of
Ordinary Time · Year A" — next to the date.

- **The calendar decides.** Sundays follow Year A, B or C; weekdays Year I or
  II; solemnities and feasts replace the Sunday or weekday when they should
  (Christmas, the Assumption, All Saints, Saints Peter and Paul…); transfers
  are handled (the Annunciation out of Holy Week, the Immaculate Conception off
  an Advent Sunday). **Epiphany, the Ascension and Corpus Christi are kept on
  Sunday.** 2025–2040 are built in; later years are fetched once and kept.
- **Pick the Mass** where there is a choice: on a memorial, the weekday's
  readings or the saint's; on Saturday, the evening Mass of Sunday; Christmas
  (Night, Dawn, Day), Easter (Day, Evening), Pentecost and the other vigils,
  the three sets for All Souls.
- **Pick the readings.** Untick any part. Where the lectionary gives a choice
  — the longer or shorter Gospel, alternative first readings — choose it.
  Type the **psalm response** (it is not part of the citation); it goes before
  the psalm and after every stanza, and is remembered for next time.
- **Add readings to service.** Each part becomes its own item, in order —
  optional title slide, First Reading, Responsorial Psalm, Second Reading,
  Gospel Acclamation, Gospel. Building the same Mass again replaces it in
  place.
- **One screen per reading** (the default). Each reading appears whole, so
  nobody presses Next while it is proclaimed; what it is and where it's from
  run along the bottom ("Gospel · Matthew 22:15-21"). The psalm shows the
  response on top and every stanza below. Only a reading too long to read
  from the pews (over ~220 words: the Passion, some Easter Vigil readings) is
  split, into the fewest even screens — a typical Sunday is one screen per
  reading.
- **A few verses at a time** is the other choice under *On screen*: a heading
  slide ("A reading from the Book of the Prophet Isaiah"), a few verses per
  slide, and the closing dialogue ("The word of the Lord. / Thanks be to
  God."); the psalm stanza by stanza with the response between.

## The whole Mass

On the Readings page, **Add: Whole Mass** (the default) builds the entire
Order of Mass with the day's readings in their place — one item per part,
one screen each:

Entrance Hymn · Sign of the Cross and Greeting · Penitential Act · Kyrie ·
Gloria · *the readings* · Before the Gospel ("…according to Matthew. /
Glory to you, O Lord.") · Gospel · Creed · Universal Prayer · Offertory Hymn
· Pray, Brethren · Preface Dialogue · Holy, Holy, Holy · Mystery of Faith ·
Doxology · The Lord's Prayer · Sign of Peace · Lamb of God · Behold the Lamb
of God · Communion Hymn · Blessing and Dismissal · Recessional Hymn

- **Gloria and Creed follow the day**: Gloria on Sundays outside Advent and
  Lent, on solemnities and feasts, Holy Thursday and the Easter Octave; Creed
  on Sundays and solemnities. The checkboxes show what was decided and can be
  changed. Pick the Nicene or Apostles' Creed and the Mystery of Faith
  acclamation there too.
- **Hymn places**: four empty song items. Select one, type in *Add from
  library…* and the song takes that place. Rebuilding the Mass keeps the
  hymns already chosen.
- **Good Friday** has no Mass; only its readings are added.
- The priest's prayers that change every day (Collect, Prayer over the
  Offerings, Preface, Eucharistic Prayer) are not projected.

**The wording.** The **Prayers** page sets each prayer to *Traditional
English* (the long-standing public-domain Catholic texts — "Glory be to God
on high…", "I believe in one God…", "Lord, I am not worthy that thou
shouldst enter under my roof…" — and plain renderings of the Latin where the
text is newer), *Latin* (the Missale Romanum), or *Our missal*. The current
English translation of the Roman Missal (© ICEL) is licensed through each
bishops' conference, so it can't ship in a public app: paste it once under
*Our missal* and it is used at every Mass and saved in every backup file.
Lines starting `R.` are the people's.

**The text.** Readings fill in from the **Douay-Rheims** Bible — public domain,
and the free English Catholic Bible that has every book the Lectionary uses
(Sirach, Wisdom, Baruch, Tobit, Maccabees). Its English is older than the
lectionary at the ambo. For any reading choose **Paste** and paste your own
lectionary's text instead: it goes on one screen the same way, split at
sentence ends only if very long (psalms: blank line between stanzas, a line
starting `R.` is the response). The same
*Paste reading…* is in the composer for any scripture item.

Douay-Rheims follows the Vulgate's numbering and the Lectionary the Hebrew;
the app converts between them (most Psalms, Joel, Malachi, Hosea, Micah, parts
of Isaiah, Zechariah, John 6 and others), so the slides show the citation as
it is printed in the lectionary. For Sirach, Tobit, Judith and Esther, where
the Vulgate text itself differs, the item says to compare with the lectionary.

**Network.** The calendar and every citation are in the app. Only the
Douay-Rheims text is fetched — at prep time — and it is then saved with the
service, so Mass runs with the network off.

## Running a service

**Cue, then go live.** Clicking an item in the plan fills the slide grid but
doesn't touch the projector — the grid says *Cued — not on screen*. Click a
slide (or press `Enter`, or `1`–`9`) to put it up. A stray click, or the first
half of the double-click that opens the editor, can't put the wrong thing in
front of the room.

**Services.** One service is open at a time. *Services & Songs* keeps the
rest; *New from this one* copies the order into a fresh service dated next
Sunday. Opening or creating a service saves the current one first.

**Song library.** ☆ on a plan item (or *Save to library* in the composer)
keeps a copy. Type in *Add from library…* under the plan to drop it in after
the cued item. ★ means it came from the library; pressing it updates the
library copy with your edits.

**Scripture.** In the composer, *Look up scripture…* fetches any passage —
Douay-Rheims by default, or KJV, WEB, ASV, BBE and other public-domain
translations from bible-api.com — one
to four verses per slide, each slide with its own reference (`John 3:17 ·
KJV`) along the bottom. It needs the network **during prep only** — the verses
are saved into the service like any typed slide.

**Announcements loop.** Set *Auto-advance* on an item and it steps through
its slides on a timer and wraps round, staying on that item. It pauses during
blackout, clear and logo.

**Transitions.** The projector and live preview cross-fade (350ms) between
slides and into blackout or the logo, instead of hard-cutting.

**Typeface.** Slides are set in **EB Garamond** (SIL Open Font License), the
classic book face of missals and Bibles, in semibold so it holds up on a
projector. It is bundled with the app — no font is fetched at Mass — and the
app waits for it before drawing, so a slide never flashes in a fallback
font. Other fonts are in the Themes tab; Twi and Fante letters such as ɛ and
ɔ fall back to a system font if the theme's font lacks them.

**Footers.** Themes have a *Reference footer* toggle (on for Scripture). It
shows the slide's own footer, else the item's title and subtitle — good for
song credits too.

**Moving between laptops.** *Export this service* writes one
`.worship.json` file with the plan, its themes and its media inside;
*Import…* on the projection laptop merges it. *Back up everything* does the
same for every service, the library and all media. Re-importing the same file
updates rather than duplicates.

## Working offline

The app installs a service worker that precaches every surface, so after it has
been opened **once** it keeps running with nothing on the network — no wifi, no
dev server, no relay. That's the venue case: the building's internet is someone
else's problem, and Sunday morning is the worst time to find out it's down.

```bash
npm run build
npm run preview     # or serve dist/ with any static server
```

Open it once while the server is up. From then on the same URL loads from cache
even with the server stopped — verified by killing the server and reloading
`/live`, `/stage` and `/output`. In Chrome, *Install* puts it in the dock as a
standalone window.

### Hosted copy

There's a deployed copy at <https://eoforidanso.github.io/worship/>, built from
the same source with the base path set for the subpath Pages serves from:

```bash
npm run build:pages     # BASE_PATH=/worship/, plus 404.html and .nojekyll
npm run preview:pages   # check it locally at /worship/ before deploying
```

The `gh-pages` branch holds that build. The hosted copy is the app only — it
has no relay (a `ws://` relay can't be reached from an `https://` page), so it
runs windows-on-one-machine and reads "Local only". For an actual service, run
it locally.

### Media offline

Media files — images and video, at any size — are stored as Blobs in
IndexedDB, so a background survives a reload and projects with no network.
There is no size limit: IndexedDB's quota is a share of free disk (hundreds of
GB on a typical laptop), so a full-length video background simply fits.

Backgrounds reference media by **id**, never by URL. Object URLs are minted
fresh each session and are meaningless after a reload, so a URL-keyed
background would be dangling by Sunday.

The media library shows what is actually available:

| Dot | Meaning |
| --- | --- |
| green | Saved offline — will project with the network down |
| grey | Added by URL — needs the network |
| red | Referenced by the plan, but the bytes aren't on this machine |

A red dot also appears on the service plan item, so you find out on Thursday
rather than mid-service. If a background is missing the slide still draws, on
the theme colour, with the words intact — a missing file never costs the
congregation the lyrics.

The app asks for persistent storage so the browser won't quietly evict the
library between prep and Sunday. Browsers may grant or refuse that silently.

Three things to know:

- **Updates wait to be asked for.** A new build shows a banner in the operator
  window; nothing reloads until you click it. An unannounced reload mid-song
  would be worse than running last week's build.
- **The plan is in `localStorage`** and the media in IndexedDB — both are
  per-browser and per-machine. Nothing syncs between laptops on its own — use
  Export / Import to carry a service to the machine that will run it.
- **Media added by URL is the one thing not guaranteed offline.** It's fetched
  over the network and shows a grey dot. Drop the file in instead to make it
  green.

## Keyboard

| Key | Action |
| --- | --- |
| `→` `↓` `Space` `PgDn` | Next slide |
| `1`–`9` | Put that slide of the cued item on screen |
| `Enter` | Take the cued item live from its first slide |
| `←` `↑` `PgUp` | Previous slide |
| `B` | Blackout |
| `C` | Clear text, keep the background |
| `L` | Show the logo |
| `Esc` | Reset live state |

Shortcuts are suppressed while a text field has focus, so typing lyrics never
advances the projector.

## How it fits together

```
src/
  lib/render.js        one canvas renderer, used by every preview and the output
  lib/broadcast.js     BroadcastChannel + optional WebSocket, with reconnect
  store/useContent.js  plan, slides, themes, media — persisted to localStorage
  store/useLive.js     what is on screen right now — deliberately not persisted;
                       also the operator-only cue
  lib/scripture.js     passage lookup → slides (composer)
  lib/lectionary.js    date → celebration, cycles, Mass options, readings
  lib/bible.js         citation parser, Hebrew→Vulgate numbering, Douay-Rheims fetch
  lib/massBuilder.js   readings → plan items, the way they are proclaimed
  lib/orderOfMass.js   the whole Mass: Order of Mass + readings + hymn places
  data/orderOfMass.js  the people's parts, traditional English and Latin, Gloria/Creed rules
  data/                lectionary.json, calendar/2025–2040, NOTICE.md (sources, licences)
scripts/               build-lectionary.py, fetch-calendar.mjs — regenerate data/
  lib/bundle.js        .worship.json export / import, media included
  routes/              Shell, LiveController, SlideComposer, MediaBrowser,
                       ThemeEditor, Output, Stage
  components/          ServicePlanner (dnd-kit), SlideCanvas
server/index.js        WebSocket relay, replays the last state to late joiners
```

Two decisions worth knowing about:

**One renderer, four surfaces.** Thumbnails, the composer preview, the projector
and the theme editor all call `renderSlide`. Everything is authored against a
1920×1080 design space and scaled, so a 240px thumbnail and a 4K projector agree
on where the text lands — there is no second layout path that could drift.

**Content persists, live state doesn't.** The plan survives a reload; what's on
screen does not. Reloading the operator window mid-service should never
re-project a slide on its own.

## Limits

- **Readings need the network at prep time** to fetch the Douay-Rheims text,
  and only public-domain text is built in. The lectionary translations used at
  the ambo (Jerusalem Bible, NABRE, RSV-CE) are copyrighted — paste them,
  under your parish's licence.
- **Psalm responses and Lenten acclamations** aren't in the citations, so the
  operator types them (once — responses are remembered).
- **16 optional memorials have no proper readings** in the data (e.g. St Rita,
  St Pio); those days use the weekday's readings, which is the usual practice.
- **National and diocesan feasts** are not in the calendar — the General Roman
  Calendar only. Add a parish's own feast as a normal item.
- **Nothing syncs between machines automatically.** Carry a service across
  with Export / Import.
- **Video has no audio path.** Video backgrounds are drawn to the canvas muted
  (autoplay requires it, and slides carry no sound). Audio tracks as a media
  type aren't implemented.
- **The relay is unauthenticated.** It's fine on a closed church LAN and not fine
  anywhere else.

## Updating the lectionary data

`src/data/` is generated; see `src/data/NOTICE.md` for sources and licences.

```bash
node scripts/fetch-calendar.mjs 2041 2050
```

To rebuild `lectionary.json` (e.g. once the Liturgical Calendar Project
completes Years B and C upstream), download its `rite/roman/lectionary/*/en.json`
files, the Tamil lectionary's `readings__list.sql` (as `tamil_list.sql`) and
the calendar years (as `cal/YYYY.json`) into one folder, then:

```bash
python3 scripts/build-lectionary.py ./sources src/data/lectionary.json
```

It prints how many parts the two sources agree on, what it filled and what is
still empty.

## Verification status

Runs. `npm install`, `npm run dev` and `npm run build` all succeed on Node 24,
and the Live Controller, Stage and Output surfaces have been rendered and driven
in a browser — taking an item live shows the right slide and queues the next.

Offline has been tested the honest way: build, load once, stop the server
entirely (connection refused on the port), reload. `/live`, `/stage` and
`/output` all come back from cache.

Media offline was tested with real files: a 20MB image and a recorded video
imported, set as backgrounds, and still projecting after a reload; the video
verified as actually moving (sampled canvas pixels change over time) on both
the operator preview and the Output window. Deleting the stored bytes while
leaving the plan intact was tested too — the slide falls back to the theme
colour with the words intact and the item shows a red dot.

Service features (October 2026), driven in the browser: cue without going
live, `1`–`9` and Next across items, scripture lookup to slides with per-verse
footers, saving to and adding from the library, new service from the open one,
export → delete media → import restoring the image, auto-advance looping and
pausing on blackout, the Output window following with footer and a measured
cross-fade, and Stage showing position and the next item's title.

Mass readings (October 2026): all 2,375 citations in the data parse; a
random 60 of the converted ones resolve to Douay-Rheims text; the numbering
conversion was spot-checked by reading the text (Psalm 23 → DR 22, Joel 3 → DR
2:28, Micah's Bethlehem, Isaiah 9 and 64, Zechariah 2, John 6, Psalm 51:12
"Create a clean heart"). Built end to end in the browser: the 29th Sunday
(Year A), a Year II weekday, Christmas Night, Second Sunday of Lent (B), Palm
Sunday with the Passion, the full Easter Vigil, and Christ the King (B).

Whole Mass: Gloria/Creed decided correctly for an Ordinary Sunday, an
Ordinary weekday, Advent Sunday, St Andrew, Christmas, Ash Wednesday, Holy
Thursday, the Easter Octave and All Saints; 27 parts in order with the
evangelist named; a library song filling the Entrance Hymn place and
surviving a rebuild; pasted parish wording used in place of the built-in.

Not yet exercised: the WebSocket relay across two machines, the theme
editor, and importing a bundle with a large video.
