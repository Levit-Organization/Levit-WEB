import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  build: {
    /**
     * Vite 8 usa o Rolldown como bundler. A opção `manualChunks` do Rollup
     * não é suportada; a API equivalente é `rolldownOptions.output.codeSplitting`.
     *
     * Grupos de chunks definidos:
     *
     *  vendor            – React, Router e Axios (invariantes entre páginas)
     *  firebase_core     – firebase/app + firebase/auth (fluxo de autenticação)
     *  firebase_realtime – firebase/firestore + firebase/messaging
     *                      (carregados somente após o login)
     *
     * Resultado esperado: o bundle inicial da Landing/Login NÃO inclui
     * nenhum código Firebase; ele só é baixado quando a rota que o usa
     * é navegada pela primeira vez (lazy import em App.jsx + Suspense).
     */
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'firebase_realtime',
              test: /node_modules\/firebase\/(firestore|messaging)/,
              priority: 20,
            },
            {
              name: 'firebase_core',
              test: /node_modules\/firebase\//,
              priority: 10,
            },
            {
              name: 'vendor',
              test: /node_modules\/(react|react-dom|react-router|axios)\//,
              priority: 5,
            },
          ],
        },
      },
    },
  },
})
