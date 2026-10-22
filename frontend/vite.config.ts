import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

const appVersion = process.env.VERCEL_GIT_COMMIT_SHA
  || process.env.VERCEL_DEPLOYMENT_ID
  || `local-${Date.now()}`

const appVersionAsset = {
  name: 'app-version-asset',
  generateBundle(this: { emitFile: (asset: { type: 'asset'; fileName: string; source: string }) => void }) {
    this.emitFile({
      type: 'asset',
      fileName: 'version.json',
      source: JSON.stringify({ version: appVersion }),
    })
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    appVersionAsset,
    VitePWA({
      registerType: 'prompt',
      includeAssets: [
        'A1raters_black_bg.png',
        'apple-touch-icon-180x180.png',
        'maskable-icon-512x512.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'pwa-icon.svg',
      ],
      manifest: {
        name: 'A1 Raters',
        short_name: 'A1 Raters',
        description: 'Professional AI rating platform',
        theme_color: '#0a0e1a',
        background_color: '#0a0e1a',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/A1raters_black_bg.png',
            sizes: '257x257',
            type: 'image/png',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
    __APP_VERSION__: JSON.stringify(appVersion),
  },
})
