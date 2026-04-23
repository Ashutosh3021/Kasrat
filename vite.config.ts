import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/Kasrat/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.svg', 'Assets/icons/*.png', 'Assets/logo.ico'],
      manifest: {
        name: 'KASRAT',
        short_name: 'KASRAT',
        description: 'Minimalist fitness tracker',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/Kasrat/',
        scope: '/Kasrat/',
        icons: [
          { src: 'Assets/icons/icon-48x48.png',   sizes: '48x48',   type: 'image/png' },
          { src: 'Assets/icons/icon-72x72.png',   sizes: '72x72',   type: 'image/png' },
          { src: 'Assets/icons/icon-96x96.png',   sizes: '96x96',   type: 'image/png' },
          { src: 'Assets/icons/icon-128x128.png', sizes: '128x128', type: 'image/png' },
          { src: 'Assets/icons/icon-144x144.png', sizes: '144x144', type: 'image/png' },
          { src: 'Assets/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
          { src: 'Assets/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'Assets/icons/icon-256x256.png', sizes: '256x256', type: 'image/png' },
          { src: 'Assets/icons/icon-384x384.png', sizes: '384x384', type: 'image/png' },
          { src: 'Assets/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      }
    })
  ],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/recharts') || id.includes('node_modules/react-is') || id.includes('node_modules/d3')) {
            return 'charts'
          }
          if (id.includes('node_modules/dexie')) {
            return 'db'
          }
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
            return 'vendor'
          }
        }
      }
    }
  }
})
