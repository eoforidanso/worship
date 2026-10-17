import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * Where the app will be served from.
 *
 * Default '/' keeps the venue case simple — a laptop serving the build at the
 * root of localhost. GitHub Pages serves from a subpath, so `npm run
 * build:pages` sets BASE_PATH=/worship/ and everything below follows from it.
 */
const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    /**
     * Offline support.
     *
     * A church laptop can't count on a network — the venue wifi is someone
     * else's, and Sunday morning is the worst possible time to discover it's
     * down. The service worker precaches the whole app, so once it has been
     * opened one time it keeps loading with nothing at all on the network:
     * no wifi, no dev server, no relay.
     *
     * `registerType: 'prompt'` is deliberate. An automatic update would
     * reload the operator window whenever a new build landed — possibly
     * mid-song, in front of the congregation. Instead Shell shows a banner
     * and the operator picks the moment.
     */
    VitePWA({
      registerType: 'prompt',
      injectRegister: false, // src/lib/pwa.js registers it, so the UI can prompt
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        id: `${base}live`,
        name: 'Church Worship — Mass projection',
        short_name: 'Church Worship',
        description:
          'Project the Mass: the day’s readings from the Lectionary, the Order of Mass with its prayers, hymns and parish announcements. Works offline.',
        start_url: `${base}live`,
        scope: base,
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'any',
        background_color: '#0d1117',
        theme_color: '#0d1117',
        categories: ['productivity', 'utilities'],
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        // Right-click the dock / taskbar icon to jump straight to these.
        shortcuts: [
          {
            name: 'Live',
            short_name: 'Live',
            url: `${base}live`,
            icons: [{ src: 'icon-192.png', sizes: '192x192' }],
          },
          {
            name: 'Readings of the day',
            short_name: 'Readings',
            url: `${base}readings`,
            icons: [{ src: 'icon-192.png', sizes: '192x192' }],
          },
          {
            name: 'Announcements',
            short_name: 'Notices',
            url: `${base}announcements`,
            icons: [{ src: 'icon-192.png', sizes: '192x192' }],
          },
          {
            name: 'Projector output',
            short_name: 'Output',
            url: `${base}output`,
            icons: [{ src: 'icon-192.png', sizes: '192x192' }],
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,mjs,css,html,png,svg,woff2}'], // woff2 only: every current browser reads it
        // pdf.js (PDF import) is ~2MB; still precached so a PDF can be added offline.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Every surface is a client-side route: /live, /compose/:id, /media,
        // /themes, /output, /stage. Offline, none of them exist as files, so
        // navigations fall back to the cached shell and the router takes over.
        navigateFallback: `${base}index.html`,
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        // So offline behaviour can be exercised in `npm run dev`, not just builds.
        enabled: true,
        type: 'module',
      },
    }),
  ],
  // Listen on the local network too, so a phone on the church wifi can open
  // the remote at http://<this laptop>:5173/remote.
  server: { port: 5173, host: true },
  preview: { host: true },
})
