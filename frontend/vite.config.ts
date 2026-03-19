import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const localApiTarget = process.env.VITE_LOCAL_API_PROXY_TARGET || 'http://127.0.0.1:5000'
const localProxy = {
  '/api': {
    target: localApiTarget,
    changeOrigin: true,
    secure: false
  },
  '/socket.io': {
    target: localApiTarget,
    changeOrigin: true,
    secure: false,
    ws: true
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    proxy: localProxy
  },
  preview: {
    host: '0.0.0.0',
    proxy: localProxy
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts': ['chart.js', 'react-chartjs-2', 'recharts'],
          'vendor-ui': ['framer-motion', 'lucide-react'],
          'vendor-data': ['axios', 'zustand', '@tanstack/react-query'],
        }
      }
    }
  }
})
