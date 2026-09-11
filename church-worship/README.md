# Church Worship

Presentation software for a church service, in the shape of EasyWorship: plan the
service, compose the slides, then drive the projector live.

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
| **Service Planner** | left rail, always visible | Drag-and-drop the running order. Click an item to take it live, double-click to edit. |
| **Slide Composer** | `/compose/:itemId` | Edit slide text, labels, theme and background. Paste a whole song and have it split into slides. |
| **Media Browser** | `/media` | Grid of images and video with tags and search. Drop files onto it. Star an image to make it the logo. |
| **Live Controller** | `/live` | Live and next preview, slide grid, transport, blackout / clear / logo, countdown, stage messages. |
| **Stage Display** | `/stage`, own window | Current and next lyrics for the worship team, plus clock, countdown, notes and operator messages. |

The **Output** window (`/output`) is what the congregation sees. Open it with the
button in the top bar, drag it to the projector, double-click for fullscreen.

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
  per-browser and per-machine. Nothing syncs between laptops; carry the service
  on the machine that will run it.
- **Media added by URL is the one thing not guaranteed offline.** It's fetched
  over the network and shows a grey dot. Drop the file in instead to make it
  green.

## Keyboard

| Key | Action |
| --- | --- |
| `→` `↓` `Space` `PgDn` | Next slide |
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
  store/useLive.js     what is on screen right now — deliberately not persisted
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

- **No scripture lookup.** Scripture items are typed or pasted; wiring in an API
  or a local Bible database is the obvious next step.
- **Nothing syncs between machines.** The plan and the media live in the
  browser that created them. Moving a service to another laptop means
  re-importing it there.
- **Video has no audio path.** Video backgrounds are drawn to the canvas muted
  (autoplay requires it, and slides carry no sound). Audio tracks as a media
  type aren't implemented.
- **The relay is unauthenticated.** It's fine on a closed church LAN and not fine
  anywhere else.

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

Not yet exercised: the WebSocket relay across two machines, and the theme
editor.
