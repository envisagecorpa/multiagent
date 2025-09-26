import { defineConfig } from 'vite'

export default defineConfig({
  // SQLite WASM configuration
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
    fs: {
      // Allow serving files from sqlite-wasm
      allow: ['..']
    }
  },
  optimizeDeps: {
    exclude: ['@sqlite.org/sqlite-wasm']
  },
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        // Code splitting for performance
        manualChunks: {
          sqlite: ['@sqlite.org/sqlite-wasm']
        }
      }
    }
  },
  define: {
    // Enable SQLite WASM features
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
  }
})