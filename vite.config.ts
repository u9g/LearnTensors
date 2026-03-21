import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        'problem-page': resolve(__dirname, 'src/entry-client-problem.ts'),
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === 'problem-page') return 'assets/problem-page.js'
          return 'assets/[name]-[hash].js'
        },
        assetFileNames: (asset) => {
          if (asset.names?.includes('problem-page.css')) return 'assets/problem-page.css'
          return 'assets/[name]-[hash][extname]'
        },
      },
    },
  },
  ssr: {
    target: 'webworker',
    noExternal: true,
  },
  environments: {
    ssr: {
      build: {
        rollupOptions: {
          output: {
            entryFileNames: '[name].js',
          },
        },
      },
    },
  },
})
