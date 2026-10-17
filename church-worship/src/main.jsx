import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import Shell from './routes/Shell'
import LiveController from './routes/LiveController'
import SlideComposer from './routes/SlideComposer'
import MediaBrowser from './routes/MediaBrowser'
import ThemeEditor from './routes/ThemeEditor'
import Library from './routes/Library'
import Readings from './routes/Readings'
import Prayers from './routes/Prayers'
import Announcements from './routes/Announcements'
import Remote from './routes/Remote'
import Output from './routes/Output'
import Stage from './routes/Stage'
import SafeBoundary from './components/SafeBoundary'
import './lib/pwa'
import { mediaReady } from './lib/hydrateMedia'
import './styles.css'
// The slide typeface, bundled so it projects with no network (OFL-1.1).
// Per-weight sheets declare each file's unicode-range, so Latin, extended
// Latin (ɛ ɔ ŋ — Twi, Fante, Ga, Ewe) and the rest each load only when used.
import '@fontsource/eb-garamond/400.css'
import '@fontsource/eb-garamond/500.css'
import '@fontsource/eb-garamond/600.css'
import '@fontsource/eb-garamond/700.css'

const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <Shell />,
      children: [
        { index: true, element: <Navigate to="/live" replace /> },
        { path: 'live', element: <LiveController /> },
        { path: 'compose/:itemId?', element: <SlideComposer /> },
        { path: 'media', element: <MediaBrowser /> },
        { path: 'themes', element: <ThemeEditor /> },
        { path: 'library', element: <Library /> },
        { path: 'readings', element: <Readings /> },
        { path: 'prayers', element: <Prayers /> },
        { path: 'announcements', element: <Announcements /> },
      ],
    },
    // Standalone windows — no operator chrome.
    { path: '/remote', element: <Remote /> },
    // A fault on the projector or stage shows black and retries — never an error.
    {
      path: '/output',
      element: (
        <SafeBoundary variant="screen">
          <Output />
        </SafeBoundary>
      ),
    },
    {
      path: '/stage',
      element: (
        <SafeBoundary variant="screen">
          <Stage />
        </SafeBoundary>
      ),
    },
  ],
  {
    // '/' locally, '/worship' on GitHub Pages. Vite fills in BASE_URL at build time.
    basename: import.meta.env.BASE_URL.replace(/\/$/, ''),
  },
)

// Attach stored media before the first paint, so the projector never shows a
// slide with its background missing and then flashes it in a moment later.
// Canvas text doesn't wait for web fonts the way HTML does: a slide drawn
// before the font arrives is drawn in the fallback and stays that way.
// Load the slide weights first (briefly — never hold up a service for a font).
const fontsReady = Promise.race([
  // The sample text includes ɛ ɔ ŋ so the extended-Latin file (Twi, Fante,
  // Ga, Ewe) is fetched now, not halfway through the first hymn.
  Promise.all(
    ['500', '600', '700'].map((w) => document.fonts?.load(`${w} 64px "EB Garamond"`, 'Aa ɛɔŋ ƐƆŊ')),
  ),
  new Promise((r) => setTimeout(r, 1500)),
]).catch(() => {})

Promise.all([mediaReady, fontsReady]).finally(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>,
  )
})
