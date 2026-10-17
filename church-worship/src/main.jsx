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
import Output from './routes/Output'
import Stage from './routes/Stage'
import './lib/pwa'
import { mediaReady } from './lib/hydrateMedia'
import './styles.css'
// The slide typeface, bundled so it projects with no network (OFL-1.1).
import '@fontsource/eb-garamond/latin-400.css'
import '@fontsource/eb-garamond/latin-500.css'
import '@fontsource/eb-garamond/latin-600.css'
import '@fontsource/eb-garamond/latin-700.css'
import '@fontsource/eb-garamond/latin-ext-500.css'
import '@fontsource/eb-garamond/latin-ext-600.css'
import '@fontsource/eb-garamond/latin-ext-700.css'

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
    { path: '/output', element: <Output /> },
    { path: '/stage', element: <Stage /> },
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
  Promise.all(['500', '600', '700'].map((w) => document.fonts?.load(`${w} 64px "EB Garamond"`))),
  new Promise((r) => setTimeout(r, 1500)),
]).catch(() => {})

Promise.all([mediaReady, fontsReady]).finally(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>,
  )
})
