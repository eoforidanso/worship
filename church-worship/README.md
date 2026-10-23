# Ambo

*The Mass, on screen.* The ambo is where the Word of God is proclaimed;
this is the app that puts the readings, prayers and hymns before the people.

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
| **Announcements** | `/announcements` | Parish notices kept week to week, each with an optional end date; added to the Mass after Communion or as a loop before Mass. |
| **Services** | `/library` | Every saved service, newest first — open one, or start next week's as a copy. The song library, searchable by title, author or lyric. Export / import / back up. |
| **Slide Composer** | `/compose/:itemId` | Edit slide text, labels, theme and background. Paste a whole song and have it split into slides. |
| **Media Browser** | `/media` | Grid of images and video with tags and search. Drop files onto it. Star an image to make it the logo. |
| **Live Controller** | `/live` | Live and next preview, the cued item's slide grid, transport, blackout / clear / logo, countdown, stage messages. |
| **Stage Display** | `/stage`, own window | Current and next lyrics for the worship team, plus clock, countdown, notes and operator messages. |

The **Output** window (`/output`) is what the congregation sees. Open it with the
button in the top bar, drag it to the projector, double-click for fullscreen.

## Planning a Mass

**Everything is built in.** The calendar, the whole Lectionary, the prayers
of the Mass, the starter hymnal *and two whole Catholic Bibles* — the World
English Bible and the Douay-Rheims, all 73 books each — ship inside the app.
A Mass builds in well under a second on a laptop with no internet at all.
`scripts/build-webbe.py` and `scripts/fetch-bible.mjs` regenerate the Bible
files.

**Templates.** Under the one-click button, *Other services…* builds a
**Saturday Vigil** (Sunday's readings, dated the Saturday), a **Weekday
Mass**, a **School Mass**, or the **next Holy Day**. **Funeral Mass** and
**Wedding Mass** open the Readings page with the rite's own readings from the
Lectionary — choose each with the family from the list in its row (the first
is the usual default) — and a box for the name of the deceased or the
couple, which goes on the title slide. The rite's moments go in as title
slides: for a funeral the *Final Commendation* and a *Song of Farewell* place
in place of the dismissal; for a wedding *The Celebration of Matrimony* after
the Gospel and the *Nuptial Blessing* before the Sign of Peace. Funerals have
no Gloria; weddings do; neither has the Creed (change any under Options).

**One click.** On an empty service, *✠ Build this day's Mass* adds
everything at once: the readings, the Order of Mass (Gloria and Creed as
the day requires), hymns suggested from the library for each place, and
this week's notices after Communion. Everything stays editable. *Choose
readings and hymns first →* opens the Readings page instead.

**The Readings page**, top to bottom:

- **Find the day.** *◀◀ Sunday* and *Sunday ▶▶* step a week at a time,
  ◀ ▶ a day; *Jump to…* goes to the next Advent, Christmas, Ash Wednesday,
  Palm Sunday, Easter, Ascension, Pentecost, Assumption, All Saints or Christ
  the King; *Find a feast or saint…* searches the next year by name
  ("Assumption", "Joseph"); *Week / Month* switches between the week strip
  and a month calendar showing each day's colour and feasts. On a tablet,
  swipe left or right to change day.
- **Check the readings.** Each reading has its citation, a choice of text
  (*World English Bible*, *Douay-Rheims* or *Our lectionary (paste)*), and for the psalm
  the response, outlined until it is filled in. Click a reading to see its
  full text in the **preview** beside the list (inside the row on a tablet).
- **Hymns.** One suggestion per place — Entrance, Offertory, Communion,
  Recessional — chosen for the season and feast from the library: Advent and
  Christmas hymns only in their seasons, Communion hymns at Communion (the
  Benediction hymns only after them), Our Lady's hymns at the end, or
  throughout on her feasts. Choices rotate week to week. Change any, or leave
  a place empty. The parish's own songs are matched by their words (Mary,
  Bread, Spirit, Alleluia…).
- **One button.** *Add Mass to service* sits in a bar at the bottom of the
  page with a one-line summary of what it will add ("4 readings · Whole Mass
  · Gloria · Creed · one screen per reading · 1 notice"). *Options* holds the
  rest: whole Mass or readings only, whole reading or a few verses a slide,
  title slide, Gloria and Creed, the Creed and Mystery of Faith wording,
  notices, and *Paste a list of psalm responses…*. Afterwards a checklist
  shows ✓ for each part added and ⚠ for what still needs attention.
- **Psalm responses for the year.** Paste lines like
  `2026-10-18 | Give the Lord glory and honor.` or
  `Psalm 23:1-3a, 3b-4, 5, 6 | The Lord is my shepherd…` and they fill in
  when those days are opened. The app never invents a response — the wording
  is your lectionary's.

**Reading cards** show how long each reading takes at a lector's pace, and
the *names to practise* — the unusual proper names in it (Nabuchodonosor,
Melchisedech, Ephrata…), so the lector can rehearse them.

**Drag into the plan.** Drag a song from the library (Services tab) or a
reading from the Readings page onto the service plan: a blue line shows where
it will land; dropped on an empty hymn place, it fills it.

**Preview beside the plan.** On the Prayers, Announcements, Services, Media
and Themes tabs, a panel on the right shows the selected item exactly as the
projector will draw it — ◀ ▶ through its slides, *Go live* — or what's on
screen now. *Preview ◂* reopens it when hidden.

**Timeline.** *List / Timeline* in the plan header. The timeline gives every
part its start time and length — readings at a lector's pace, prayers said
together, hymns by their verses — with the unprojected parts in between
(Collect, Homily, Preface, Eucharistic Prayer, Communion). Set the start
time and the homily's length; the total and the end time show at the top.

**Undo, redo, history.** ⌘Z / Ctrl+Z undoes any change to the plan, ⇧⌘Z /
Ctrl+Y redoes; ↶ ↷ in the plan header do the same. Before every big change
(building a Mass, clearing, adding notices, opening another service,
restoring) a snapshot is kept, and one when the app opens; 🕘 lists the
last 25 and restores any of them, keeping a copy of what was there.

**Keyboard.** Press **?** anywhere for the full list. On Readings: `N` / `P`
next or previous Sunday, `]` / `[` a day, `T` today, `J` / `K` step the
preview through the readings, `F` or `/` find a feast, `A` add the Mass.
Anywhere: `S` find a song. On Live only: `Enter` puts the selected item on
screen and `Esc` resets it — on the planning tabs those keys do nothing to
the projector.

**Is it ready?** The service plan shows *Ready 24 of 27* with a bar, a ✓ or
⚠ on every row (hover for what's missing), and a count per part of the Mass
(*Liturgy of the Word 7/8*). It flags an empty hymn place, a psalm without its
response, the Lenten acclamation still to add, a reading whose text didn't
arrive, a picture missing on this computer, and empty slides. Press the
readiness bar to jump to the first thing to check. Editing a flagged item
clears its flag.

**On a tablet or phone**, *☰* in the top bar shows and hides the service
plan; on a narrow screen it slides over the page and closes after an item is
picked. Buttons and rows are larger on touch screens. On a phone the whole
app fits the screen — nothing scrolls sideways except the tab row and the
week strip, which you swipe: the top bar is two compact rows (the service
date moves to Readings and Services), Live has big *Previous* / *Next*
buttons, the Readings controls stack, hymn choices stack, the *Add Mass*
bar spans the screen, and pop-ups stay inside it. Checked at 390 × 844
(iPhone size) on every tab.

## Mass readings

Open **Readings** (or, on an empty service, press *✠ Add this day's Mass* in
the plan). It opens
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
- **Large print** (the default). Each reading is cut into the fewest even
  screens of about 60 words, never mid-verse, so the text stays near full
  size (~80px on a 1080p screen) for the back pews; what it is and where
  it's from run along the bottom ("Gospel · Matthew 22:15-21 · 1/2"). The
  psalm shows the response on top of each screen with the stanzas below.
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

**The text.** The readings are the current Lectionary for Mass's — every
Sunday, weekday and feast — and fill in from one of two public-domain
Bibles that have every book the Lectionary uses (Sirach, Wisdom, Baruch,
Tobit, Judith, Maccabees, and the Greek parts of Daniel and Esther):

- the **World English Bible, British Edition** (the default) — modern
  English, close to what is read at the ambo today;
- the **Douay-Rheims** — the traditional Catholic English Bible ("thee" and
  "thou").

Choose between them under *Options → Bible* (remembered on the device), or
for one reading in its row. Neither is the lectionary translation your
parish proclaims from, which is licensed: for any reading choose **Paste** and paste your own
lectionary's text instead: it goes on one screen the same way, split at
sentence ends only if very long (psalms: blank line between stanzas, a line
starting `R.` is the response). The same
*Paste reading…* is in the composer for any scripture item.

The World English Bible is stored already renumbered to the Lectionary's
(Hebrew) verse numbers — psalm headings removed, Joel 3, Malachi 3, Isaiah 9,
Micah 5, Esther C:1–30 and the rest where English Bibles differ.
Douay-Rheims follows the Vulgate's numbering; the app converts (most Psalms, Joel, Malachi, Hosea, Micah, parts
of Isaiah, Zechariah, John 6 and others), so the slides show the citation as
it is printed in the lectionary. For Sirach, Tobit, Judith and Esther, where
the Vulgate text itself differs, the item says to compare with the lectionary.

**Network.** None needed. The calendar, every citation and both Bibles are in
the app, and the text is saved with the service.

## Running a service

**Made for a laptop at the back of church.** The Stage and Output buttons
are always in the top bar (the tabs wrap to a second row on a small
screen). Previous, Next and Blackout stay on screen without scrolling. The
plan shows each part on one line under the headings of the Mass —
Introductory Rites, Liturgy of the Word, … — and scrolls itself to keep the
live part in view. Before Mass starts, *Next* and the stage display show
what the first press will put up. A new service is named after its
liturgical day ("29th Sunday of Ordinary Time") until you type a name.
*Clear* empties the plan.

**Announcements.** Keep the parish notices in the *Announcements* tab — a
title and a few lines each, or a poster as a picture (choose a file or paste
one). Give a notice an *Until* date and it stops showing after that day; untick
*Show* to hold one back. *Add to service* puts one slide per notice either
**after Communion** (just before the Blessing and Dismissal, where notices are
given) or **before Mass, on a loop** that changes every few seconds. Adding
again replaces the notices already in the service. Notices are saved, and
travel in *Back up everything* files with their pictures.

**Starter hymnal.** The song library starts with 25 well-loved hymns and
chants whose words are public domain — *Holy God, We Praise Thy Name*,
*Faith of Our Fathers*, *Immaculate Mary*, *Hail, Holy Queen*, *Sweet
Sacrament Divine*, *Soul of My Saviour*, *O Come, All Ye Faithful*, *O
Sacred Head Surrounded*, *Come, Holy Ghost*, the *Tantum Ergo*, *Salve
Regina*, *Regina Caeli* and more — one verse per slide with its refrain.
Search by name, a line, or a season (*Christmas*, *Lent*, *Our Lady*,
*Eucharist*). Edit or delete any; *Restore starter hymns* puts deleted ones
back.

**Parish name and logo.** Set them at the top of the *Services* tab. The
name heads every Mass title slide and the window title; the logo is what
`L` shows.

**Backups.** Everything lives in this one browser, so once there is real
work in it the app asks — at most weekly, and never on the projector — to
*Back up now* (a single file with every service, hymn, notice, prayer text
and picture). *Later* asks again in three days.

**Paste or add files.** *⊕ Paste or file* under the plan (or drop files
anywhere on the plan) brings in outside content, after the selected item:

| What | Becomes |
| --- | --- |
| Pasted text, `.txt` | Slides — a blank line starts a new one, `[Verse 1]` labels one |
| A picture (pasted from the clipboard, or a file) | One slide each, shown whole, never cropped |
| A PDF | One slide per page, each page as a picture, so its layout is kept |
| Word, PowerPoint | Not read directly — save as PDF first |

Pictures and PDF pages go into the offline media library, so they project
with the network off and travel inside exported service files.

**Output on the projector in one click.** With a projector connected,
*Output* (in Chrome or Edge, after you allow it once) opens the projector
window filling the second screen. Elsewhere it opens a window to drag
across. In the Output window, double-click or press `F` for full screen; the
hint shows only while the mouse moves over it.

**Never an error on the projector.** If anything goes wrong while drawing,
the Output and Stage windows show plain black — as if Blackout were pressed
— and recover by themselves a moment later. A fault in one operator tab
shows a short recovery card there; the plan, the controls and the projector
keep running. Damaged items (a bad import, a hand-edited file) are repaired
as the app loads.

**Phone remote.** Run the app with `npm start` (app + relay) on the laptop.
On Live, press *📱 Phone remote*: scan the QR code with a phone on the same
wifi and it opens big *Previous / Next* buttons, *Blackout*, *Hide text* and
*Logo*, with what's on screen and what's next. The QR code carries the
laptop's 4-digit PIN; anyone typing the address by hand needs the PIN too,
so nobody else on the wifi can drive the projector (*New PIN* changes it).
If two operator windows are open, only the first obeys the phone. The phone
remote needs the app running on the laptop — the hosted `https://` copy
can't reach the relay.

**Cue, then go live.** Clicking an item in the plan fills the slide grid but
doesn't touch the projector — the grid says *Cued — not on screen*. Click a
slide (or press `Enter`, or `1`–`9`) to put it up. A stray click, or the first
half of the double-click that opens the editor, can't put the wrong thing in
front of the room.

**Services.** One service is open at a time. *Services* keeps the
rest; *New from this one* copies the order into a fresh service dated next
Sunday. Opening or creating a service saves the current one first.

**Song library.** ☆ on a plan item (or *Save to library* in the composer)
keeps a copy. Type in *Add from library…* under the plan to drop it in after
the cued item. ★ means it came from the library; pressing it updates the
library copy with your edits.

**Scripture.** In the composer, *Look up scripture…* fetches any passage —
the built-in World English Bible (British) or Douay-Rheims by default (they
work offline), or KJV, ASV, BBE and other public-domain translations from
bible-api.com — one
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
font. Other fonts are in the Themes tab. Garamond includes the letters of Twi,
Fante, Ga and Ewe — ɛ, ɔ, ŋ, ɖ, ʋ — and they are loaded before the first
slide is drawn, so a hymn in Twi is set in the same face as the Latin.

**Liturgical colours.** The built-in themes take their background from the
day: violet in Advent and Lent, a warm gold for white days (Christmas,
Easter, feasts of the Lord and of Our Lady), green in Ordinary Time, red for
Pentecost, the Passion and martyrs, rose for Gaudete and Laetare — deep
tones with a soft light from above, so white text stays easy to read. Turn
it off per theme (*Liturgical colour background* in Themes), or pick a
colour, which switches it off.

**Footers.** Themes have a *Reference footer* toggle (on for Scripture). It
shows the slide's own footer, else the item's title and subtitle — good for
song credits too.

**Moving between laptops.** *Export this service* writes one
`.worship.json` file with the plan, its themes and its media inside;
*Import…* on the projection laptop merges it. *Back up everything* does the
same for every service, the library and all media. Re-importing the same file
updates rather than duplicates.

## Installing it as an app

Press **⤓ Install app** in the top bar. In Chrome and Edge that installs it in
one click; in Safari (Mac) it's *File → Add to Dock*, on an iPad *Share → Add
to Home Screen* — the button shows the steps for the browser you're in. Once
installed it:

- has its own icon (a gold cross) in the dock, Launchpad or Start menu, and
  opens in its own window straight onto **Live** — no browser tabs or address
  bar in front of the congregation;
- runs with **no internet and no server**: the readings calendar, lectionary,
  prayers, font and PDF reader are all inside;
- offers shortcuts on its icon (right-click): Live, Readings of the day,
  Announcements, Projector output.

Install from the hosted copy (an `https://` address) or from `localhost`
while the app is running; after that the installed app no longer needs either.
The button disappears once the app is installed. Icons are drawn by
`scripts/make-icons.py`.

Verified in Chrome: service worker active with 42 files cached, Chrome
reports the app installable with no manifest errors, and with the network
off `/live`, `/readings` (showing the day from the built-in calendar),
`/prayers`, `/announcements`, `/output` and `/stage` all open.

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
| `?` | All shortcuts |
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
  lib/bible.js         citation parser, the built-in Bibles, Hebrew→Vulgate numbering
  lib/massBuilder.js   readings → plan items, the way they are proclaimed
  lib/orderOfMass.js   the whole Mass: Order of Mass + readings + hymn places
  data/orderOfMass.js  the people's parts, traditional English and Latin, Gloria/Creed rules
  data/                lectionary.json, calendar/2025–2040, NOTICE.md (sources, licences)
scripts/               build-lectionary.py, fetch-calendar.mjs, build-webbe.py, fetch-bible.mjs — regenerate data/
  lib/bundle.js        .worship.json export / import, media included
  lib/importer.js      pasted text, .txt, PDFs (pdf.js) and pictures → plan items
  lib/announcements.js parish notices → the Announcements item
  lib/remote.js        phone remote: PIN, commands, status for the phone
  lib/redraw.js        redraw on font load; the day's liturgical colour
  lib/autoMass.js      "Build this day's Mass" in one press
  lib/hymnSuggest.js   hymn suggestions per place, by season and feast
  lib/readiness.js     what each plan item still needs
  lib/responses.js     psalm responses: remembered, and imported by the year
  lib/history.js       undo / redo and snapshots (IndexedDB)
  lib/timing.js        part lengths, the timeline, names to practise
  lib/dragTypes.js     dragging songs and readings into the plan
  components/PreviewDock.jsx  the projector preview beside the planning tabs
  data/bible-web/      the World English Bible (British), lectionary numbering, one file per book
  data/bible/          the Douay-Rheims, one file per book
  data/ritual.js       Funeral and Wedding readings and their rites
  components/SafeBoundary.jsx  black-not-error on the projector; recovery card elsewhere
  data/hymns.js        the starter hymnal (public-domain texts)
  routes/              Shell, LiveController, SlideComposer, MediaBrowser,
                       ThemeEditor, Output, Stage
  components/          ServicePlanner (dnd-kit), SlideCanvas
server/index.js        WebSocket relay (replays the last state to late joiners) and
                       /info: this laptop's address for the phone remote
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

- **Only public-domain text is built in.** The lectionary translations used
  at the ambo (Jerusalem Bible, NABRE, ESV-CE, RSV-CE) are copyrighted — paste
  them, under your parish's licence. The World English Bible is close to them
  in style but not word for word.
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
- **The relay is unauthenticated.** Projector and stage windows on other
  machines trust it; the phone remote is protected by its PIN. Fine on a
  church wifi, not on the open internet.
- **Ghana's own feasts** (national or diocesan) are not in the calendar yet —
  send the list and they can be added.

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

World English Bible (October 2026): all 2,452 citations in the lectionary and
the funeral and wedding readings resolve to text; the renumbering was checked
by reading (Isaiah 9:1 "The people who walked in darkness", Micah 5:1
"Bethlehem Ephrathah", Joel 3:1, Malachi 3:19, Jonah 2:1, Zechariah 2:14,
Esther C:12, Daniel 3:52 and 13, Romans 16:25–27, Psalm 51:3, Psalm 18 (19)),
and a Mass built offline from the installed app in 0.3 s.

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

Final touches, end to end in a clean Chrome profile: a fresh install is
named after its day, has the 25 starter hymns and no backup nag; season
search finds the Christmas hymns; the parish name heads the Mass title slide
and window title; Garamond's extended-Latin file loads up front and a Twi
line renders in it; the 29th Sunday's background samples green; Output
opens; through the relay a second device with the wrong PIN is refused, with
the right PIN advances the laptop and mirrors the slide, and Blackout
reaches the laptop. A deliberately corrupt item is repaired on load; before
that repair, the projector showed black and recovered on the next good
slide, and the broken tab showed its recovery card with the rest working.

Planning workflow, end to end in a clean Chrome profile: one-click Mass on a
fresh install (27 items, four hymns suggested, "Ready 26 of 27" with only the
psalm response flagged); feast search to the Assumption; Jump to Easter;
Next Sunday; the month view; the preview pane's text; Easter hymn
suggestions; the options panel; a pasted response list filling in after a
reload; the checklist after adding. On a 768×1024 touch tablet: the plan
panel starts closed and ☰ opens it, swiping changes day, the preview opens in
the reading row, and the action bar stays on screen. Hymn suggestions checked
across Ordinary Time, Advent, Christmas, Lent, Easter, Pentecost and the
Assumption.

Workstation features, in a production build in clean Chrome with the network
switched off before anything was built: one-click Mass (27 items, Gospel text
from the built-in Bible, 0.2 s); timeline from 09:00 ending ≈ 09:51 with the
Collect, Homily, Preface, Eucharistic Prayer and Communion gaps; Clear then
⌘Z restoring all 27 items, with the snapshot listed; the preview panel
following the selection; a library song dragged in above the Gospel;
Funeral (name on the title slide, Final Commendation and Song of Farewell,
no Blessing, no Gloria, no Creed) and Wedding (Celebration of Matrimony after
the Gospel, Nuptial Blessing before the Sign of Peace, Gloria, no Creed);
`N` and `?`; no page errors.

Not yet exercised: the WebSocket relay across two machines, the theme
editor, and importing a bundle with a large video.
