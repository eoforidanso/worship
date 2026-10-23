import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { uid } from '../lib/id'
import { starterSongs } from '../data/hymns'

/**
 * Everything that survives a reload: the service plan, the slide content, the
 * media library and the themes. Persisted to localStorage so the projector and
 * stage windows read the same data without a round trip.
 *
 * Live playback state lives in `useLive` instead — it is deliberately not
 * persisted.
 */

export const SERIF = "'EB Garamond', Georgia, 'Times New Roman', serif"
const OLD_SANS = "'Inter', system-ui, sans-serif"

export const DEFAULT_THEME = {
  id: 'theme_default',
  name: 'Default',
  // A missal's typeface. Bundled (see main.jsx), so it projects offline.
  fontFamily: SERIF,
  fontSize: 96, // px, relative to a 1920x1080 canvas — sized for the back pews
  fontWeight: 600, // semibold: Garamond's regular is too fine for a projector
  color: '#ffffff',
  align: 'center', // left | center | right
  valign: 'middle', // top | middle | bottom
  lineHeight: 1.25,
  uppercase: false,
  shadow: true,
  outline: false,
  padding: 80,
  showFooter: false, // reference line along the bottom (scripture, credits)
  liturgical: true, // background follows the day's liturgical colour
  background: { kind: 'color', value: '#0b1020' },
}

const SCRIPTURE_THEME = {
  ...DEFAULT_THEME,
  id: 'theme_scripture',
  name: 'Scripture',
  fontSize: 84,
  fontWeight: 600,
  align: 'left',
  showFooter: true,
  background: { kind: 'color', value: '#101418' },
}

const blankSlide = (body = '') => ({ id: uid('sl'), label: '', body })

export const makeItem = (type = 'text', overrides = {}) => ({
  id: uid('it'),
  type,
  title: 'Untitled',
  subtitle: '',
  themeId: type === 'scripture' ? SCRIPTURE_THEME.id : DEFAULT_THEME.id,
  background: null, // null => inherit from theme
  slides: [blankSlide()],
  notes: '',
  autoAdvance: 0, // seconds; > 0 loops the item's slides (announcements, pre-service)
  ...overrides,
})

/** Deep copy with fresh ids, so a copy never shares slides with its source. */
const cloneItem = (item, patch = {}) => ({
  ...item,
  id: uid('it'),
  slides: item.slides.map((sl) => ({ ...sl, id: uid('sl') })),
  ...patch,
})

const blankPlan = (title = 'New service') => ({
  id: uid('pl'),
  title,
  date: nextSunday(),
  items: [],
  autoTitle: true, // follow the liturgical day until someone types a title
})

// A fresh install starts on an empty Mass for the coming Sunday; the planner
// offers to add the day's Mass, and the title follows the liturgical day.
const seedPlan = () => blankPlan('Sunday Mass')

export const useContent = create(
  persist(
    (set, get) => ({
      plan: seedPlan(),
      services: [], // saved services, newest first; `plan` is the open one
      songs: starterSongs(), // reusable library items; a fresh install starts with the starter hymnal
      // Order of Mass texts: { [prayerId]: { use: 'en'|'la'|'parish', text, choice } }.
      // `text` is the parish's own wording, pasted once from its missal.
      prayers: {},
      // Parish notices: [{ id, title, text, mediaId?, until?, active }], in display order.
      announcements: [],
      themes: [DEFAULT_THEME, SCRIPTURE_THEME],
      media: [],
      logoUrl: null,
      logoId: null,
      parish: { name: '' }, // shown on the Mass title slide and the window title
      lastBackupAt: null, // epoch ms of the last "Back up everything"
      backupSnoozedUntil: 0,

      // --- plan -----------------------------------------------------------
      setPlanTitle: (title) => set((s) => ({ plan: { ...s.plan, title, autoTitle: false } })),
      /** Name the service after its liturgical day, unless someone has named it. */
      setAutoTitle: (title) => set((s) => (s.plan.autoTitle ? { plan: { ...s.plan, title } } : s)),
      setPlanDate: (date) => set((s) => ({ plan: { ...s.plan, date } })),

      /** Add a new item after `afterId` (the selected item), or at the end. */
      addItem: (type, afterId = null) => {
        const item = makeItem(type, { title: defaultTitle(type) })
        set((s) => {
          const items = [...s.plan.items]
          const at = items.findIndex((it) => it.id === afterId)
          items.splice(at === -1 ? items.length : at + 1, 0, item)
          return { plan: { ...s.plan, items } }
        })
        return item.id
      },

      duplicateItem: (id) =>
        set((s) => {
          const i = s.plan.items.findIndex((it) => it.id === id)
          if (i === -1) return s
          const src = s.plan.items[i]
          const copy = cloneItem(src, { title: `${src.title} (copy)` })
          const items = [...s.plan.items]
          items.splice(i + 1, 0, copy)
          return { plan: { ...s.plan, items } }
        }),

      /** Put items next to `id` — before it or after it — or at the end. */
      insertItemsAt: (newItems, id = null, before = false) =>
        set((s) => {
          const items = [...s.plan.items]
          const at = items.findIndex((it) => it.id === id)
          items.splice(at === -1 ? items.length : before ? at : at + 1, 0, ...newItems)
          return { plan: { ...s.plan, items } }
        }),

      /** Put ready-made items (imports) after `afterId`, or at the end. */
      insertItems: (newItems, afterId = null) =>
        set((s) => {
          const items = [...s.plan.items]
          const at = items.findIndex((it) => it.id === afterId)
          items.splice(at === -1 ? items.length : at + 1, 0, ...newItems)
          return { plan: { ...s.plan, items } }
        }),

      // --- announcements ---------------------------------------------------
      addAnnouncement: (patch = {}) => {
        const a = { id: uid('an'), title: '', text: '', mediaId: null, until: '', active: true, ...patch }
        set((s) => ({ announcements: [...s.announcements, a] }))
        return a.id
      },
      updateAnnouncement: (id, patch) =>
        set((s) => ({ announcements: s.announcements.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),
      removeAnnouncement: (id) => set((s) => ({ announcements: s.announcements.filter((a) => a.id !== id) })),
      moveAnnouncement: (id, by) =>
        set((s) => {
          const list = [...s.announcements]
          const i = list.findIndex((a) => a.id === id)
          const j = i + by
          if (i === -1 || j < 0 || j >= list.length) return s
          ;[list[i], list[j]] = [list[j], list[i]]
          return { announcements: list }
        }),

      /**
       * Put the announcements item in the service, replacing any earlier one:
       * 'after-communion' goes just before the Blessing and Dismissal (where
       * notices are given at Mass), 'before' at the very start.
       */
      placeAnnouncements: (item, where = 'after-communion') =>
        set((s) => {
          const items = s.plan.items.filter((it) => !it.announcements)
          let at = items.length
          if (where === 'before') at = items[0]?.lectionary?.part === 'title' ? 1 : 0
          else {
            const blessing = items.findIndex((it) => it.lectionary?.part === 'blessing-dismissal')
            if (blessing !== -1) at = blessing
          }
          items.splice(at, 0, item)
          return { plan: { ...s.plan, items } }
        }),

      clearPlan: () => set((s) => ({ plan: { ...s.plan, items: [] } })),

      removeItem: (id) =>
        set((s) => ({
          plan: { ...s.plan, items: s.plan.items.filter((it) => it.id !== id) },
        })),

      /** Move an item to a new index. Used by the drag-and-drop planner. */
      moveItem: (from, to) =>
        set((s) => {
          const items = [...s.plan.items]
          if (from < 0 || from >= items.length || to < 0 || to >= items.length) return s
          const [moved] = items.splice(from, 1)
          items.splice(to, 0, moved)
          return { plan: { ...s.plan, items } }
        }),

      updateItem: (id, patch) =>
        set((s) => ({
          plan: {
            ...s.plan,
            items: s.plan.items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
          },
        })),

      // --- slides ----------------------------------------------------------
      addSlide: (itemId, atIndex) =>
        set((s) => ({
          plan: {
            ...s.plan,
            items: s.plan.items.map((it) => {
              if (it.id !== itemId) return it
              const slides = [...it.slides]
              const at = atIndex == null ? slides.length : atIndex + 1
              slides.splice(at, 0, blankSlide())
              return { ...it, slides }
            }),
          },
        })),

      updateSlide: (itemId, slideId, patch) =>
        set((s) => ({
          plan: {
            ...s.plan,
            items: s.plan.items.map((it) =>
              it.id !== itemId
                ? it
                : {
                    ...it,
                    needs: undefined, // edited by hand: whatever the builder flagged is the operator's call now
                    slides: it.slides.map((sl) => (sl.id === slideId ? { ...sl, ...patch } : sl)),
                  },
            ),
          },
        })),

      removeSlide: (itemId, slideId) =>
        set((s) => ({
          plan: {
            ...s.plan,
            items: s.plan.items.map((it) =>
              it.id !== itemId ? it : { ...it, slides: it.slides.filter((sl) => sl.id !== slideId) },
            ),
          },
        })),

      moveSlide: (itemId, from, to) =>
        set((s) => ({
          plan: {
            ...s.plan,
            items: s.plan.items.map((it) => {
              if (it.id !== itemId) return it
              const slides = [...it.slides]
              if (from < 0 || from >= slides.length || to < 0 || to >= slides.length) return it
              const [moved] = slides.splice(from, 1)
              slides.splice(to, 0, moved)
              return { ...it, slides }
            }),
          },
        })),

      /**
       * Split a block of lyrics into slides. Blank lines separate slides; a
       * leading `[Verse 1]` style bracket becomes the slide label.
       */
      importLyrics: (itemId, raw) =>
        set((s) => {
          const blocks = raw
            .replace(/\r\n/g, '\n')
            .split(/\n\s*\n/)
            .map((b) => b.trim())
            .filter(Boolean)

          const slides = blocks.map((block) => {
            const lines = block.split('\n')
            const m = lines[0].match(/^\[(.+)\]$/)
            if (m) return { id: uid('sl'), label: m[1], body: lines.slice(1).join('\n').trim() }
            return { id: uid('sl'), label: '', body: block }
          })

          return {
            plan: {
              ...s.plan,
              items: s.plan.items.map((it) =>
                it.id === itemId
                  ? { ...it, needs: undefined, slides: slides.length ? slides : [blankSlide()] }
                  : it,
              ),
            },
          }
        }),

      /** Replace an item's slides wholesale — scripture lookup uses this. */
      setSlides: (itemId, slides) =>
        set((s) => ({
          plan: {
            ...s.plan,
            items: s.plan.items.map((it) =>
              it.id === itemId
                ? { ...it, needs: undefined, slides: slides.length ? slides : [blankSlide()] }
                : it,
            ),
          },
        })),

      /**
       * Put a Mass's readings into the service. Building the same Mass again
       * replaces the earlier copy in place rather than adding a second set.
       */
      insertLectionary: (group, newItems, afterId = null) =>
        set((s) => {
          const items = [...s.plan.items]
          const first = items.findIndex((it) => it.lectionary?.group === group)
          // Hymns already chosen for this Mass survive a rebuild in their slot.
          const chosen = new Map(
            items
              // Hymns the operator chose (not empty places, not mere suggestions) are kept.
              .filter(
                (it) =>
                  it.lectionary?.group === group && it.lectionary.slot && !it.placeholder && !it.suggested,
              )
              .map((it) => [it.lectionary.slot, it]),
          )
          const fresh = newItems.map(
            (it) => ((it.placeholder || it.suggested) && chosen.get(it.lectionary?.slot)) || it,
          )
          const kept = items.filter((it) => it.lectionary?.group !== group)
          let at
          if (first !== -1) at = first
          else if (afterId && kept.some((it) => it.id === afterId))
            at = kept.findIndex((it) => it.id === afterId) + 1
          else at = kept.length
          kept.splice(at, 0, ...fresh)
          return { plan: { ...s.plan, items: kept } }
        }),

      setPrayer: (id, patch) =>
        set((s) => ({ prayers: { ...s.prayers, [id]: { ...s.prayers[id], ...patch } } })),

      // --- services --------------------------------------------------------
      // One service is open at a time (`plan`). The others are kept whole in
      // `services`, so last week's order is a click away and next week can
      // start from it instead of from nothing.

      /** Store the open service in the saved list (upsert by id). */
      saveService: () => set((s) => ({ services: upsert(s.services, { ...s.plan, savedAt: Date.now() }) })),

      openService: (id) =>
        set((s) => {
          const target = s.services.find((p) => p.id === id)
          if (!target || target.id === s.plan.id) return s
          return {
            services: upsert(s.services, { ...s.plan, savedAt: Date.now() }),
            plan: stripSaved(target),
          }
        }),

      /**
       * Start a new service. `fromId` uses a saved service (or the open one)
       * as the template: same order, fresh ids, so editing the new one never
       * touches the original.
       */
      newService: (fromId = null) =>
        set((s) => {
          const all = [s.plan, ...s.services.filter((p) => p.id !== s.plan.id)]
          const src = fromId ? all.find((p) => p.id === fromId) : null
          const next = blankPlan('New service')
          if (src) next.items = src.items.map((it) => cloneItem(it))
          return {
            services: upsert(s.services, { ...s.plan, savedAt: Date.now() }),
            plan: next,
          }
        }),

      deleteService: (id) =>
        set((s) => ({ services: s.services.filter((p) => p.id !== id || p.id === s.plan.id) })),

      // --- library ---------------------------------------------------------

      /** Save a plan item to the library, updating its earlier copy if any. */
      saveToLibrary: (itemId) =>
        set((s) => {
          const item = s.plan.items.find((it) => it.id === itemId)
          if (!item) return s
          const libId = item.libraryId ?? uid('lib')
          const entry = { ...item, id: libId, libraryId: undefined, savedAt: Date.now() }
          return {
            songs: upsert(s.songs, entry),
            plan: {
              ...s.plan,
              items: s.plan.items.map((it) => (it.id === itemId ? { ...it, libraryId: libId } : it)),
            },
          }
        }),

      /** Copy a library entry into the open service, after `afterId` if given. */
      addFromLibrary: (libId, afterId = null, before = false) => {
        const src = get().songs.find((x) => x.id === libId)
        if (!src) return null
        const item = cloneItem(src, { libraryId: libId })
        delete item.savedAt
        set((s) => {
          const items = [...s.plan.items]
          const target = items.findIndex((it) => it.id === afterId)
          // A hymn placeholder in the Order of Mass is filled, not appended to.
          if (target !== -1 && (items[target].placeholder || items[target].suggested)) {
            const ph = items[target]
            item.subtitle = ph.title
            item.lectionary = ph.lectionary
            items[target] = item
            return { plan: { ...s.plan, items } }
          }
          const at = target === -1 ? items.length : before ? target : target + 1
          items.splice(at, 0, item)
          return { plan: { ...s.plan, items } }
        })
        return item.id
      },

      updateLibraryEntry: (libId, patch) =>
        set((s) => ({ songs: s.songs.map((x) => (x.id === libId ? { ...x, ...patch } : x)) })),

      /** Put back any starter hymns that were deleted. */
      restoreStarterHymns: () =>
        set((s) => {
          const have = new Set(s.songs.map((x) => x.id))
          return { songs: [...s.songs, ...starterSongs().filter((x) => !have.has(x.id))] }
        }),

      removeFromLibrary: (libId) => set((s) => ({ songs: s.songs.filter((x) => x.id !== libId) })),

      /**
       * Merge an exported file. Services and library entries keep their ids so
       * importing the same file twice updates rather than duplicates; themes
       * and media are added only when missing.
       */
      importBundle: (bundle) =>
        set((s) => {
          const themes = [...s.themes]
          for (const t of bundle.themes ?? []) if (!themes.some((x) => x.id === t.id)) themes.push(t)
          const media = [...s.media]
          for (const m of bundle.media ?? []) if (!media.some((x) => x.id === m.id)) media.push(m)
          let songs = s.songs
          for (const x of bundle.songs ?? []) songs = upsert(songs, x)
          let services = s.services
          for (const p of bundle.services ?? []) {
            if (p.id === s.plan.id) continue // never overwrite the open service underneath the operator
            services = upsert(services, p)
          }
          const prayers = { ...(bundle.prayers ?? {}), ...s.prayers }
          for (const [id, p] of Object.entries(bundle.prayers ?? {})) {
            if (!s.prayers[id]?.text?.trim()) prayers[id] = p // fill, never overwrite a parish's own text
          }
          let announcements = s.announcements
          for (const a of bundle.announcements ?? []) announcements = upsert(announcements, a)
          return { themes, media, songs, services, prayers, announcements }
        }),

      // --- themes ----------------------------------------------------------
      addTheme: (base) => {
        const theme = { ...(base ?? DEFAULT_THEME), id: uid('th'), name: 'New theme' }
        set((s) => ({ themes: [...s.themes, theme] }))
        return theme.id
      },
      updateTheme: (id, patch) =>
        set((s) => ({ themes: s.themes.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      removeTheme: (id) =>
        set((s) => ({ themes: s.themes.filter((t) => t.id !== id || t.id === DEFAULT_THEME.id) })),

      // --- media -----------------------------------------------------------
      addMedia: (entry) => {
        const m = { id: uid('md'), tags: [], addedAt: Date.now(), ...entry }
        set((s) => ({ media: [m, ...s.media] }))
        return m.id
      },
      updateMedia: (id, patch) =>
        set((s) => ({ media: s.media.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
      removeMedia: (id) => set((s) => ({ media: s.media.filter((m) => m.id !== id) })),

      /**
       * Re-attach this session's object URLs after a reload, and mark anything
       * whose bytes are gone so the UI can say so instead of drawing nothing.
       */
      attachMediaUrls: (resolve, stored) =>
        set((s) => ({
          media: s.media.map((m) => ({
            ...m,
            url: resolve(m.id) ?? undefined,
            offline: stored ? stored.has(m.id) : m.offline,
          })),
          logoUrl: s.logoId ? (resolve(s.logoId) ?? s.logoUrl) : s.logoUrl,
        })),

      setLogo: (url, id = null) => set({ logoUrl: url, logoId: id }),
      setParish: (patch) => set((s) => ({ parish: { ...s.parish, ...patch } })),
      markBackedUp: () => set({ lastBackupAt: Date.now(), backupSnoozedUntil: 0 }),
      snoozeBackup: (days = 3) => set({ backupSnoozedUntil: Date.now() + days * 86400000 }),

      // --- selectors -------------------------------------------------------
      getItem: (id) => get().plan.items.find((it) => it.id === id) ?? null,
      getTheme: (id) => get().themes.find((t) => t.id === id) ?? get().themes[0] ?? DEFAULT_THEME,
    }),
    {
      name: 'worship-content-v1',
      // Repair anything damaged on the way in (a bad import, a hand-edited
      // file): every item gets a title and at least one slide, so nothing in
      // the plan can break a screen.
      merge: (persisted, current) => {
        const merged = { ...current, ...(persisted ?? {}) }
        const fix = (plan) => plan && { ...plan, items: (plan.items ?? []).filter(Boolean).map(repairItem) }
        merged.plan = fix(merged.plan) ?? current.plan
        merged.services = (merged.services ?? []).map(fix)
        merged.songs = (merged.songs ?? []).filter(Boolean).map(repairItem)
        return merged
      },
      version: 7,
      // v0 → v1: services and library arrived, and the Scripture theme gained
      // a reference footer. Earlier saves get both without losing anything.
      migrate: (state, from) => {
        if (from < 7) {
          // v7: larger text for the back pews. Only values still at the old
          // defaults change — a parish's own tuning is kept.
          const was = { theme_default: 72, theme_scripture: 60 }
          const now = { theme_default: 96, theme_scripture: 84 }
          state.themes = (state.themes ?? []).map((t) =>
            t.id in was
              ? {
                  ...t,
                  fontSize: t.fontSize === was[t.id] ? now[t.id] : t.fontSize,
                  padding: t.padding === 120 ? 80 : t.padding,
                }
              : t,
          )
        }
        if (from < 6) {
          // v6: the starter hymnal, added once (anything already there is kept).
          const have = new Set((state.songs ?? []).map((x) => x.id))
          state.songs = [...(state.songs ?? []), ...starterSongs().filter((x) => !have.has(x.id))]
        }
        if (from < 5) {
          // v5: the built-in themes take the liturgical colour as background.
          state.themes = (state.themes ?? []).map((t) =>
            (t.id === 'theme_default' || t.id === 'theme_scripture') && t.liturgical == null
              ? { ...t, liturgical: true }
              : t,
          )
          state.parish ??= { name: '' }
          state.lastBackupAt ??= null
        }
        if (from < 4) state.announcements ??= []
        if (from < 3) {
          // v3: the built-in themes move to the bundled serif. Only values still
          // at the old defaults change — a parish's own tuning is kept.
          const was = { theme_default: [64, 700], theme_scripture: [52, 500] }
          const now = { theme_default: [72, 600], theme_scripture: [60, 600] }
          state.themes = (state.themes ?? []).map((t) => {
            if (!was[t.id] || t.fontFamily !== OLD_SANS) return t
            const [size, weight] = was[t.id]
            return {
              ...t,
              fontFamily: SERIF,
              fontSize: t.fontSize === size ? now[t.id][0] : t.fontSize,
              fontWeight: t.fontWeight === weight ? now[t.id][1] : t.fontWeight,
            }
          })
        }
        if (from < 2) state.prayers ??= {}
        if (from < 1) {
          state.services ??= []
          state.songs ??= []
          state.themes = (state.themes ?? []).map((t) =>
            t.id === SCRIPTURE_THEME.id && t.showFooter == null ? { ...t, showFooter: true } : t,
          )
        }
        return state
      },
      // Only metadata lives here. The bytes are Blobs in IndexedDB (see
      // lib/mediaStore.js) and `url` is a per-session object URL, so persisting
      // it would just store a dead reference.
      partialize: (s) => ({
        plan: s.plan,
        services: s.services,
        songs: s.songs,
        prayers: s.prayers,
        announcements: s.announcements,
        themes: s.themes,
        logoId: s.logoId,
        parish: s.parish,
        lastBackupAt: s.lastBackupAt,
        backupSnoozedUntil: s.backupSnoozedUntil,
        logoUrl: s.logoUrl?.startsWith('blob:') ? null : s.logoUrl,
        media: s.media.map(({ url, ...rest }) => rest),
      }),
    },
  ),
)

function repairItem(it) {
  const slides =
    Array.isArray(it.slides) && it.slides.length ? it.slides : [{ id: uid('sl'), label: '', body: '' }]
  return {
    ...it,
    id: it.id ?? uid('it'),
    title: typeof it.title === 'string' ? it.title : 'Untitled',
    slides: slides.map((sl) => ({
      ...sl,
      id: sl?.id ?? uid('sl'),
      body: typeof sl?.body === 'string' ? sl.body : '',
    })),
  }
}

function upsert(list, entry) {
  const i = list.findIndex((x) => x.id === entry.id)
  if (i === -1) return [entry, ...list]
  const out = [...list]
  out[i] = entry
  return out
}

function stripSaved({ savedAt, ...plan }) {
  return plan
}

function nextSunday() {
  const d = new Date()
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7))
  // Local date, not toISOString — that's UTC, and Saturday night prep would
  // land on the wrong day.
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function defaultTitle(type) {
  return (
    {
      song: 'New song',
      scripture: 'New scripture',
      text: 'New text',
      media: 'Media',
      countdown: 'Countdown',
    }[type] ?? 'Untitled'
  )
}
