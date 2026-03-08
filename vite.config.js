import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Dynamically set base path for GitHub Pages deployment.
// When GITHUB_PAGES=true the base becomes /<repo-name>/
// For local dev and custom domains it stays at '/'
const isGitHubPages = process.env.GITHUB_PAGES === 'true'
const repoName = process.env.REPO_NAME || 'backtester-pro'

export default defineConfig({
  plugins: [react()],

  base: isGitHubPages ? `/${repoName}/` : '/',

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@engine': path.resolve(__dirname, './src/engine'),
      '@services': path.resolve(__dirname, './src/services'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@store': path.resolve(__dirname, './src/store'),
      '@utils': path.resolve(__dirname, './src/utils'),
    },
  },

  build: {
    outDir: 'dist',
    sourcemap: true,
    // Code-split vendor chunks for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'state-vendor': ['zustand', 'immer'],
        },
      },
    },
    // Warn on chunks > 600kb
    chunkSizeWarningLimit: 600,
  },

  server: {
    port: 5173,
    open: true,
    // Proxy API calls to avoid CORS in development
    proxy: {
      '/api/finnhub': {
        target: 'https://finnhub.io/api/v1',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/finnhub/, ''),
      },
      '/api/alphavantage': {
        target: 'https://www.alphavantage.co',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/alphavantage/, ''),
      },
    },
  },

  // Expose env variables with VITE_ prefix to client code
  envPrefix: 'VITE_',
})
