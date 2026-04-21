import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    include: ['jspdf', 'html2canvas'],
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  esbuild: {
    drop: mode === 'production' ? ['debugger'] : [],
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('recharts')) return 'charts'
          if (id.includes('lucide-react')) return 'icons'
          if (id.includes('xlsx')) return 'xlsx'
          if (id.includes('react-dom') || id.includes('react-router') || (id.includes('node_modules/react/') )) return 'vendor'
        },
      },
    },
  },
}))
