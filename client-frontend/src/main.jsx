import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import App from './App.jsx';

/**
 * QueryClient global – única fonte de verdade para cache de dados.
 *
 * Políticas padrão:
 *  - staleTime 0     → dados ficam "stale" imediatamente (refetch on focus/reconnect
 *                       só ocorre quando o hook optar por staleTime maior)
 *  - gcTime 5 min    → dados são coletados 5 min após não terem mais observadores
 *  - retry 1         → uma única tentativa extra em caso de falha de rede
 *  - refetchOnWindowFocus false → evita re-fetch desnecessário ao alternar abas
 *                                  (cada hook pode sobrescrever se precisar)
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      gcTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
