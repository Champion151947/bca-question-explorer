import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

/** When the data is gated behind a server, don't ship the papers in dist/. */
function stripPrivateData(enabled: boolean): Plugin {
  return {
    name: 'strip-private-data',
    apply: 'build',
    closeBundle() {
      if (!enabled) return
      const dir = path.resolve(process.cwd(), 'dist/data')
      fs.rmSync(dir, { recursive: true, force: true })
      console.log('[strip-private-data] removed dist/data (served by the gated API instead)')
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const gated = env.VITE_REQUIRE_AUTH === 'true'

  return {
    base: './',
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg'],
        manifest: {
          name: 'BCA Question Explorer',
          short_name: 'BCA Explorer',
          description:
            'Unofficial BCA question-paper pattern explorer. Not affiliated with Calicut University.',
          theme_color: '#2563EB',
          background_color: '#F0F5FF',
          display: 'standalone',
          start_url: './',
          icons: [
            {
              src: 'pwa-192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'pwa-512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: 'pwa-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.pathname.includes('/data/'),
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'bca-data',
                expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 60 },
              },
            },
          ],
        },
      }),
      stripPrivateData(gated),
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            search: ['minisearch'],
          },
        },
      },
    },
  }
})
