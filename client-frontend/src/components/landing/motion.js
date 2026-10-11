import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

const QUERY_REDUZIDO = '(prefers-reduced-motion: reduce)';

function lerMovimentoReduzido() {
  return typeof window !== 'undefined' && window.matchMedia?.(QUERY_REDUZIDO).matches;
}

/** true quando a pessoa pediu menos movimento no sistema operacional. */
export function useMovimentoReduzido() {
  return useSyncExternalStore(
    (avisar) => {
      const mq = window.matchMedia?.(QUERY_REDUZIDO);
      mq?.addEventListener('change', avisar);
      return () => mq?.removeEventListener('change', avisar);
    },
    lerMovimentoReduzido,
    () => false
  );
}

/**
 * Um único listener de scroll para a página inteira: cada inscrito recebe a
 * chamada no mesmo frame (requestAnimationFrame), em vez de cada componente
 * registrar o próprio listener.
 */
const inscritos = new Set();
let agendado = false;
let ultimoY = 0;
let velocidade = 0;

function aoRolar() {
  if (agendado) return;
  agendado = true;
  requestAnimationFrame(() => {
    agendado = false;
    const y = window.scrollY;
    velocidade = y - ultimoY;
    ultimoY = y;
    inscritos.forEach((fn) => fn());
  });
}

function inscrever(fn) {
  if (inscritos.size === 0) {
    ultimoY = window.scrollY;
    window.addEventListener('scroll', aoRolar, { passive: true });
    window.addEventListener('resize', aoRolar);
  }
  inscritos.add(fn);
  return () => {
    inscritos.delete(fn);
    if (inscritos.size === 0) {
      window.removeEventListener('scroll', aoRolar);
      window.removeEventListener('resize', aoRolar);
    }
  };
}

/** Pixels rolados desde o último frame (positivo = descendo). */
export function velocidadeDoScroll() {
  return velocidade;
}

/**
 * Progresso (0 a 1) do elemento atravessando a viewport: 0 quando o topo dele
 * encosta no fim da tela, 1 quando o fim dele passa do topo. Escreve direto
 * numa CSS custom property (`--p`) para não re-renderizar a cada frame.
 */
export function useProgressoNoScroll(ref, { propriedade = '--p', aoMudar } = {}) {
  const reduzido = useMovimentoReduzido();

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (reduzido) {
      el.style.setProperty(propriedade, '1');
      aoMudar?.(1);
      return undefined;
    }

    const medir = () => {
      const r = el.getBoundingClientRect();
      const total = r.height + window.innerHeight;
      const p = Math.min(1, Math.max(0, (window.innerHeight - r.top) / total));
      el.style.setProperty(propriedade, p.toFixed(4));
      aoMudar?.(p);
    };
    medir();
    return inscrever(medir);
  }, [ref, propriedade, aoMudar, reduzido]);
}

/** true depois que o elemento entra na tela (uma vez só, por padrão). */
export function useNaTela(ref, { margem = '0px 0px -15% 0px', umaVez = true } = {}) {
  // Sem IntersectionObserver (navegador antigo), considera visível desde o início.
  const [visivel, setVisivel] = useState(() => typeof window !== 'undefined' && !('IntersectionObserver' in window));

  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) return undefined;
    const obs = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setVisivel(true);
          if (umaVez) obs.disconnect();
        } else if (!umaVez) {
          setVisivel(false);
        }
      },
      { rootMargin: margem }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref, margem, umaVez]);

  return visivel;
}

/** Conta de 0 até `alvo` quando `ativo` vira true. */
export function useContagem(alvo, ativo, duracao = 1100) {
  const reduzido = useMovimentoReduzido();
  const [valor, setValor] = useState(0);
  const inicio = useRef(null);

  useEffect(() => {
    if (!ativo || reduzido) return undefined;
    let quadro;
    const passo = (t) => {
      if (inicio.current === null) inicio.current = t;
      const x = Math.min(1, (t - inicio.current) / duracao);
      const suave = 1 - (1 - x) ** 4; // ease-out-quart
      setValor(Math.round(alvo * suave));
      if (x < 1) quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [alvo, ativo, duracao, reduzido]);

  return reduzido ? alvo : valor;
}
