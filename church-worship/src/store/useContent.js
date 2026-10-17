import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { uid } from '../lib/id'

/**
 * Everything that survives a reload: the service plan, the slide content, the
 * media library and the themes. Persisted to localStorage so the projector and
 * stage windows read the same data without a round trip.
 *
 * Live playback state lives in `useLive` instead — it is deliberately not
 * persisted.
 */

export const DEFAULT_THEME = {
  id: 'theme_default',
  name: 'Default',
  fontFamily: "'Inter', system-ui, sans-serif",
  fontSize: 64, // px, relative to a 1920x1080 canvas
  fontWeight: 700,
  color: '#ffffff',
  align: 'center', // left | center | right
  valign: 'middle', // top | middle | bottom
  lineHeight: 1.25,
  uppercase: false,
  shadow: true,
  outline: false,
  padding: 120,
  showFooter: false, // reference line along the bottom (scripture, credits)
  background: { kind: 'color', value: '#0b1020' },
}

const SCRIPTURE_THEME = {
  ...DEFAULT_THEME,
  id: 'theme_scripture',
  name: 'Scripture',
  fontSize: 52,
  fontWeight: 500,
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
})

const seedPlan = () => ({
  id: uid('pl'),
  title: 'Sunday Morning',
  date: new Date().toISOString().slice(0, 10),
  items: [
    makeItem('text', {
      title: 'Welcome',
      slides: [blankSlide('Welcome\nto our gathering')],
    }),
    makeItem('song', {
      title: 'Amazing Grace',
      subtitle: 'John Newton',
      slides: [
        { id: uid('sl'), label: 'Verse 1', body: 'Amazing grace how sweet the sound\nThat saved a wretch like me' },
        { id: uid('sl'), label: 'Verse 1', body: 'I once was lost but now am found\nWas blind but now I see' },
        { id: uid('sl'), label: 'Verse 2', body: "'Twas grace that taught my heart to fear\nAnd grace my fears relieved" },
        { id: uid('sl'), label: 'Verse 2', body: 'How precious did that grace appear\nThe hour I first believed' },
      ],
    }),
    makeItem('scripture', {
      title: 'Psalm 23:1–3',
      subtitle: 'ESV',
      slides: [
        { id: uid('sl'), label: 'v1', body: 'The Lord is my shepherd; I shall not want.' },
        { id: uid('sl'), label: 'v2', body: 'He makes me lie down in green pastures.\nHe leads me beside still waters.' },
        { id: uid('sl'), label: 'v3', body: 'He restores my soul.' },
      ],
    }),
  ],
})

export const useContent = create(
  persist(
    (set, get) => ({
      plan: seedPlan(),
      services: [], // saved services, newest first; `plan` is the open one
      songs: [], // reusable library items (songs, liturgy, standing announcements)
      themes: [DEFAULT_THEME, SCRIPTURE_THEME],
      media: [],
      logoUrl: null,
      logoId: null,

      // --- plan -----------------------------------------------------------
      setPlanTitle: (title) => set((s) => ({ plan: { ...s.plan, title } })),
      setPlanDate: (date) => set((s) => ({ plan: { ...s.plan, date } })),

      addItem: (type) => {
        const item = makeItem(type, { title: defaultTitle(type) })
        set((s) => ({ plan: { ...s.plan, items: [...s.plan.items, item] } }))
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
              it.id !== itemId
                ? it
                : { ...it, slides: it.slides.filter((sl) => sl.id !== slideId) },
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
                it.id === itemId ? { ...it, slides: slides.length ? slides : [blankSlide()] } : it,
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
              it.id === itemId ? { ...it, slides: slides.length ? slides : [blankSlide()] } : it,
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
          const kept = items.filter((it) => it.lectionary?.group !== group)
          let at
          if (first !== -1) at = first
          else if (afterId && kept.some((it) => it.id === afterId)) at = kept.findIndex((it) => it.id === afterId) + 1
          else at = kept.length
          kept.splice(at, 0, ...newItems)
          return { plan: { ...s.plan, items: kept } }
        }),

      // --- services --------------------------------------------------------
      // One service is open at a time (`plan`). The others are kept whole in
      // `services`, so last week's order is a click away and next week can
      // start from it instead of from nothing.

      /** Store the open service in the saved list (upsert by id). */
      saveService: () =>
        set((s) => ({ services: upsert(s.services, { ...s.plan, savedAt: Date.now() }) })),

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
          const next = blankPlan(src ? src.title : 'New service')
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
      addFromLibrary: (libId, afterId = null) => {
        const src = get().songs.find((x) => x.id === libId)
        if (!src) return null
        const item = cloneItem(src, { libraryId: libId })
        delete item.savedAt
        set((s) => {
          const items = [...s.plan.items]
          const at = afterId ? items.findIndex((it) => it.id === afterId) + 1 : items.length
          items.splice(at || items.length, 0, item)
          return { plan: { ...s.plan, items } }
        })
        return item.id
      },

      updateLibraryEntry: (libId, patch) =>
        set((s) => ({ songs: s.songs.map((x) => (x.id === libId ? { ...x, ...patch } : x)) })),

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
          return { themes, media, songs, services }
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

      // --- selectors -------------------------------------------------------
      getItem: (id) => get().plan.items.find((it) => it.id === id) ?? null,
      getTheme: (id) => get().themes.find((t) => t.id === id) ?? get().themes[0] ?? DEFAULT_THEME,
    }),
    {
      name: 'worship-content-v1',
      version: 1,
      // v0 → v1: services and library arrived, and the Scripture theme gained
      // a reference footer. Earlier saves get both without losing anything.
      migrate: (state, from) => {
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
        themes: s.themes,
        logoId: s.logoId,
        logoUrl: s.logoUrl?.startsWith('blob:') ? null : s.logoUrl,
        media: s.media.map(({ url, ...rest }) => rest),
      }),
    },
  ),
)

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
    { song: 'New song', scripture: 'New scripture', text: 'New text', media: 'Media', countdown: 'Countdown' }[
      type
    ] ?? 'Untitled'
  )
}
