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
        name: 'Church Worship',
        short_name: 'Worship',
        description: 'Plan the service, compose the slides, drive the projector.',
        start_url: `${base}live`,
        scope: base,
        display: 'standalone',
        orientation: 'landscape',
        background_color: '#0d1117',
        theme_color: '#0d1117',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff,woff2}'],
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
  server: { port: 5173 },
})
