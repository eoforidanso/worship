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

Two things to know:

- **Updates wait to be asked for.** A new build shows a banner in the operator
  window; nothing reloads until you click it. An unannounced reload mid-song
  would be worse than running last week's build.
- **The plan is in `localStorage`**, which is per-browser and per-machine. The
  projector laptop caches the *app* offline, not your service — carry the plan
  on the machine that will run it.

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

- **Video backgrounds** are modelled in the renderer (`bg.kind === 'video'`) but
  the output surface doesn't yet mount a `<video>` element to feed it — images
  and colours work today.
- **Media over 2MB** is kept as an object URL for the session only; smaller files
  are inlined as data URIs so they survive a reload. A real deployment wants a
  file server or the File System Access API instead of localStorage.
- **No scripture lookup.** Scripture items are typed or pasted; wiring in an API
  or a local Bible database is the obvious next step.
- **The relay is unauthenticated.** It's fine on a closed church LAN and not fine
  anywhere else.

## Verification status

Runs. `npm install`, `npm run dev` and `npm run build` all succeed on Node 24,
and the Live Controller, Stage and Output surfaces have been rendered and driven
in a browser — taking an item live shows the right slide and queues the next.

Offline has been tested the honest way: build, load once, stop the server
entirely (connection refused on the port), reload. `/live`, `/stage` and
`/output` all come back from cache.

Not yet exercised: the WebSocket relay across two machines, the media browser
with real files, and the theme editor.
