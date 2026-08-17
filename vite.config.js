import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: {
    watch: {
      ignored: ['**/.vs/**', '**/node_modules/**', '**/dist/**'],
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      // The NavigationRoute that serves index.html for SPA routing must NOT
      // intercept navigation to /api/* paths. In the split-deployment setup
      // (SPA on Vercel, backend on Render), the Google OAuth callback redirects
      // the browser to /api/auth/google/callback. If the PWA service worker
      // catches that navigation and serves index.html, the SPA router tries to
      // match /api/auth/google/callback as a client route, finds no match, and
      // renders a blank screen. navigateFallbackDenylist excludes /api/* so
      // those requests go to the network (Vercel's edge → backend proxy).
      //
      // NOTE: this must be inside workbox, not at the top level of VitePWA,
      // because vite-plugin-pwa v1.x spreads ...options.workbox and then
      // overrides navigateFallbackAllowlist but does NOT pass
      // navigateFallbackDenylist from the top level.
      workbox: {
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [
          /^\/api\//,
        ],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
      manifest: {
        name: 'AFIT Nests',
        short_name: 'AFIT Nests',
        description: 'Find verified student accommodation near AFIT Barkallahu',
        theme_color: '#1B3A6B',
        background_color: '#F5F0E8',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
})
