import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

const PROFILE_PATH = path.resolve('./profile.md')

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'profile-api',
      configureServer(server) {
        server.middlewares.use('/api/profile', (req, res) => {
          res.setHeader('Content-Type', 'application/json')
          if (req.method === 'GET') {
            const content = fs.existsSync(PROFILE_PATH)
              ? fs.readFileSync(PROFILE_PATH, 'utf8')
              : null
            res.end(JSON.stringify({ content }))
          } else if (req.method === 'POST') {
            let body = ''
            req.on('data', chunk => (body += chunk))
            req.on('end', () => {
              const { content } = JSON.parse(body)
              fs.writeFileSync(PROFILE_PATH, content, 'utf8')
              res.end(JSON.stringify({ ok: true }))
            })
          }
        })
      },
    },
  ],
  server: {
    proxy: {
      '/api/tinyfish': {
        target: 'https://agent.tinyfish.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/tinyfish/, ''),
      },
      '/api/openai': {
        target: 'https://api.openai.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/openai/, ''),
      }
    }
  }
})
