import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { appendFileSync, writeFileSync } from 'fs'

function browserLogger(): Plugin {
  const logFile = resolve(__dirname, 'browser.log')
  return {
    name: 'browser-logger',
    apply: 'serve',
    configureServer(server) {
      writeFileSync(logFile, '')
      server.middlewares.use('/__browser_log', (req, res) => {
        if (req.method === 'POST') {
          let body = ''
          req.on('data', (chunk: Buffer) => { body += chunk })
          req.on('end', () => {
            try {
              const { level, args } = JSON.parse(body)
              appendFileSync(logFile, `[${level}] ${args.join(' ')}\n`)
            } catch {}
            res.writeHead(204)
            res.end()
          })
        } else {
          res.writeHead(204)
          res.end()
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), browserLogger()],
  optimizeDeps: {
    exclude: ['ty_wasm'],
  },
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
