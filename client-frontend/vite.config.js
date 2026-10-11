import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Content-Security-Policy do build de produção. Só scripts do próprio site
 * rodam e a página só conversa com a API, o que limita o estrago de uma
 * eventual falha de XSS (o token de sessão fica no localStorage).
 * Fica fora do `vite dev`, que precisa de scripts inline e websocket.
 */
function politicaDeSeguranca(apiUrl) {
  const api = new URL(apiUrl).origin
  const diretivas = {
    'default-src': ["'self'"],
    'script-src': ["'self'"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:', 'https://github.com', 'https://avatars.githubusercontent.com'],
    'font-src': ["'self'", 'data:'],
    'connect-src': ["'self'", api],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
  }
  const conteudo = Object.entries(diretivas).map(([nome, fontes]) => `${nome} ${fontes.join(' ')}`).join('; ')
  return {
    name: 'levit-csp',
    apply: 'build',
    transformIndexHtml: () => [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: conteudo }, injectTo: 'head-prepend' }],
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), politicaDeSeguranca(loadEnv(mode, process.cwd()).VITE_API_URL || 'http://localhost:8080/api/v1')],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx}'],
    css: false,
  },
  build: {
    rollupOptions: {
      output: {
        // Bibliotecas estáveis em chunks próprios: ficam em cache entre deploys
        // e não pesam no chunk de cada página.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'vendor-react';
          if (/node_modules\/(react-router|react-router-dom)\//.test(id)) return 'vendor-router';
          if (/node_modules\/@tanstack\//.test(id)) return 'vendor-query';
          if (/node_modules\/(axios)\//.test(id)) return 'vendor-http';
          return undefined;
        },
      },
    },
  },
}))
