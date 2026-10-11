import { QueryClient } from '@tanstack/react-query';

// Erros 4xx são respostas definitivas do servidor (permissão, validação, não
// encontrado): repetir a chamada só atrasa a mensagem de erro.
function deveTentarNovamente(tentativas, error) {
  const status = error?.response?.status;
  if (status && status >= 400 && status < 500) return false;
  return tentativas < 2;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: deveTentarNovamente,
      refetchOnWindowFocus: false,
    },
  },
});

/** Extrai a mensagem amigável devolvida pela API (ou o texto padrão). */
export function mensagemDeErro(error, padrao = 'Algo deu errado. Tente novamente.') {
  const data = error?.response?.data;
  const errors = data?.errors && typeof data.errors === 'object' ? Object.values(data.errors) : [];
  if (data?.message && errors.length) return `${data.message} ${errors.join(' ')}`;
  return data?.message || padrao;
}
