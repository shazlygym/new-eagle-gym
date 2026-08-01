import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon-180.png', 'icons/favicon.svg'],
      manifest: {
        // Pins the app's identity independently of start_url, so a later change
        // to the landing route doesn't read as a different app and orphan the
        // copy already installed on someone's phone.
        id: '/',
        name: 'Workout — Gym Tracker',
        short_name: 'Workout',
        description: 'Track your workouts, routines and progress. Works offline.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        // Falls back left to right. A packaged Android build honours the first
        // one and drops the status-bar chrome; a browser that doesn't know
        // 'window-controls-overlay' keeps walking down to plain 'standalone'.
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'portrait',
        lang: 'ar',
        dir: 'rtl',
        theme_color: '#09090B',
        background_color: '#09090B',
        categories: ['fitness', 'health', 'sports'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        // Long-press the installed icon. The two things anyone opens the app to
        // do — start today's session, or log what they just ate.
        shortcuts: [
          {
            name: 'ابدأ تمرين',
            short_name: 'تمرين',
            url: '/train',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'سجّل أكلة',
            short_name: 'الأكل',
            url: '/nutrition',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
        // What Android puts in the rich install dialog, and what PWABuilder
        // asks for when packaging. Regenerate with `npm run screenshots` —
        // 824×1830 is a 412×915 phone at 2×, which satisfies Chrome's rule that
        // the long side stay under 2.3× the short one.
        screenshots: [
          {
            src: '/screenshots/home.png',
            sizes: '824x1830',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'الرئيسية — تمرينك الجاي والتقدم بتاعك',
          },
          {
            src: '/screenshots/nutrition.png',
            sizes: '824x1830',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'الأكل — سعرات وبروتين ودهون بالمصري',
          },
          {
            src: '/screenshots/progress.png',
            sizes: '824x1830',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'التقدم — وزنك وحجم شغلك على الوقت',
          },
          {
            src: '/screenshots/exercises.png',
            sizes: '824x1830',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'التمارين — مكتبتك أنت، بنطاق عدات لكل تمرين',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Half a megabyte of store artwork that only the install dialog ever
        // reads. Precaching it would make every first load pay for pictures of
        // the app the user is already looking at.
        globIgnores: ['**/screenshots/**'],
        // The app is local-first: everything it needs is precached, so any
        // navigation can fall back to the shell and deep links work offline.
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: {
    port: 5173,
  },
})
