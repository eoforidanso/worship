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
  background: { kind: 'color', value: '#0b1020' },
}

const SCRIPTURE_THEME = {
  ...DEFAULT_THEME,
  id: 'theme_scripture',
  name: 'Scripture',
  fontSize: 52,
  fontWeight: 500,
  align: 'left',
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
  ...overrides,
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
          const copy = {
            ...src,
            id: uid('it'),
            title: `${src.title} (copy)`,
            slides: src.slides.map((sl) => ({ ...sl, id: uid('sl') })),
          }
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
      // Only metadata lives here. The bytes are Blobs in IndexedDB (see
      // lib/mediaStore.js) and `url` is a per-session object URL, so persisting
      // it would just store a dead reference.
      partialize: (s) => ({
        plan: s.plan,
        themes: s.themes,
        logoId: s.logoId,
        logoUrl: s.logoUrl?.startsWith('blob:') ? null : s.logoUrl,
        media: s.media.map(({ url, ...rest }) => rest),
      }),
    },
  ),
)

function defaultTitle(type) {
  return (
    { song: 'New song', scripture: 'New scripture', text: 'New text', media: 'Media', countdown: 'Countdown' }[
      type
    ] ?? 'Untitled'
  )
}
