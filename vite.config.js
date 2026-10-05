import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            if (id.includes('recharts')) {
              return 'vendor-recharts';
            }
            if (id.includes('jspdf') || id.includes('html-to-image') || id.includes('html2canvas') || id.includes('purify')) {
              return 'vendor-pdf';
            }
            return 'vendor';
          }
        }
      }
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173,

    proxy: {
      '/appsheet-img': {
        target: 'https://www.appsheet.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/appsheet-img/, '')
      }
    }
  }
})