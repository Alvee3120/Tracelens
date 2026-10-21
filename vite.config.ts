import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import type { PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import mkcert from 'vite-plugin-mkcert';

const useHttps = process.env.VITE_HTTPS === 'true';

const plugins: PluginOption[] = [react()];

// vite-plugin-mkcert issues a locally-trusted certificate so the camera works
// over the LAN (getUserMedia requires a secure context). Enabled only when
// VITE_HTTPS=true to avoid installing a local CA during a plain `npm run dev`.
if (useHttps) {
  const mk = mkcert() as unknown as PluginOption | PluginOption[];
  if (Array.isArray(mk)) plugins.push(...mk);
  else plugins.push(mk);
}

plugins.push(
  VitePWA({
    registerType: 'prompt',
    injectRegister: null,
    strategies: 'generateSW',
    includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'icons/*.png', 'icons/*.svg'],
    manifest: {
      id: '/',
      name: 'TraceLens',
      short_name: 'TraceLens',
      description:
        'Trace any reference image onto real paper. Overlay a sketch on your live camera feed and draw.',
      display: 'standalone',
      display_override: ['standalone', 'fullscreen', 'minimal-ui'],
      start_url: '/',
      scope: '/',
      orientation: 'any',
      theme_color: '#0b0b0f',
      background_color: '#0b0b0f',
      categories: ['art', 'productivity', 'utilities'],
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        {
          src: '/icons/icon-maskable-192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'maskable',
        },
        {
          src: '/icons/icon-maskable-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
        { src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      ],
      screenshots: [
        {
          src: '/icons/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
          form_factor: 'narrow',
          label: 'Trace a sketch over the live camera feed',
        },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
      navigateFallback: '/index.html',
      maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      cleanupOutdatedCaches: true,
      clientsClaim: false,
    },
    devOptions: {
      enabled: false,
      navigateFallback: 'index.html',
    },
  }),
);

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom', 'zustand', 'idb'],
        },
      },
    },
  },
  worker: {
    format: 'es',
  },
  test: {
    environment: 'node',
    include: ['src/tests/**/*.test.ts'],
    globals: false,
    passWithNoTests: false,
  },
});
