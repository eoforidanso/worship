import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import Shell from './routes/Shell'
import LiveController from './routes/LiveController'
import SlideComposer from './routes/SlideComposer'
import MediaBrowser from './routes/MediaBrowser'
import ThemeEditor from './routes/ThemeEditor'
import Output from './routes/Output'
import Stage from './routes/Stage'
import './lib/pwa'
import { mediaReady } from './lib/hydrateMedia'
import './styles.css'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Shell />,
    children: [
      { index: true, element: <Navigate to="/live" replace /> },
      { path: 'live', element: <LiveController /> },
      { path: 'compose/:itemId?', element: <SlideComposer /> },
      { path: 'media', element: <MediaBrowser /> },
      { path: 'themes', element: <ThemeEditor /> },
    ],
  },
  // Standalone windows — no operator chrome.
  { path: '/output', element: <Output /> },
  { path: '/stage', element: <Stage /> },
], {
  // '/' locally, '/worship' on GitHub Pages. Vite fills in BASE_URL at build time.
  basename: import.meta.env.BASE_URL.replace(/\/$/, ''),
})

// Attach stored media before the first paint, so the projector never shows a
// slide with its background missing and then flashes it in a moment later.
mediaReady.finally(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>,
  )
})
