import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    visualizer({
      template: 'treemap',
      open: false,
      gzipSize: true,
      brotliSize: true,
      filename: 'bundle-analysis.html'
    })
  ],
  server: {
    fs: {
      strict: false
    }
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'clerk': ['@clerk/clerk-react'],
          'ui-libs': ['date-fns'],
          'utils': [
            './src/utils/adaptiveTDEE.ts',
            './src/utils/weightTrend.ts',
            './src/utils/energyExpenditure.ts',
            './src/utils/behavioralModeling.ts'
          ]
        }
      }
    },
    chunkSizeWarningLimit: 500,
    sourcemap: false,
    reportCompressedSize: true
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
    exclude: ['@vite/client', '@vite/env']
  }
})
