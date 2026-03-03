import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeManifestIcons: false,
      manifest: false, // we provide our own public/manifest.json
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/logo\.clearbit\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'clearbit-logos', expiration: { maxEntries: 80, maxAgeSeconds: 7 * 24 * 60 * 60 } },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('jspdf') || id.includes('html2canvas')) return 'pdf-vendor';
          if (id.includes('recharts') || id.includes('d3-')) return 'chart-vendor';
          if (id.includes('@radix-ui') || id.includes('cmdk') || id.includes('vaul')) return 'ui-vendor';
          if (id.includes('react-dom') || id.includes('react/')) return 'react-vendor';
          if (id.includes('react-router')) return 'router-vendor';
          if (id.includes('/motion/') || id.includes('framer-motion')) return 'motion-vendor';
        },
      },
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
