import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useConfirm } from '../../hooks/useFeedback';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Vários diálogos empilhados (ex.: confirmação sobre um drawer) travam o scroll
// uma única vez e só liberam quando o último fecha.
let scrollLocks = 0;

export const EXIT_MS = 160;

/**
 * Mantém o diálogo montado durante a animação de saída.
 * `mounted` = deve existir no DOM; `closing` = está animando a saída.
 */
function usePresence(open) {
  const [mounted, setMounted] = useState(open);

  // Ajuste de estado durante o render (padrão recomendado pelo React): evita um
  // frame sem o diálogo entre `open` virar true e o efeito rodar.
  if (open && !mounted) setMounted(true);

  useEffect(() => {
    if (open || !mounted) return undefined;
    const timer = setTimeout(() => setMounted(false), EXIT_MS);
    return () => clearTimeout(timer);
  }, [open, mounted]);

  return { mounted, closing: mounted && !open };
}

/**
 * Comportamento comum de Modal/Drawer: presença animada, trava de scroll, foco
 * inicial + armadilha de foco + retorno do foco, Esc, e confirmação ao fechar
 * quando há alterações não salvas (`dirty`).
 */
export function useDialog({ open, onClose, dirty = false }) {
  const confirm = useConfirm();
  const { mounted, closing } = usePresence(open);
  const panelRef = useRef(null);
  const titleId = useId();

  const requestClose = useCallback(async () => {
    if (dirty) {
      const descartar = await confirm({
        title: 'Descartar alterações?',
        message: 'Você tem informações que ainda não foram salvas. Se fechar agora, elas serão perdidas.',
        confirmLabel: 'Descartar',
        cancelLabel: 'Continuar editando',
        variant: 'danger',
      });
      if (!descartar) return;
    }
    onClose();
  }, [dirty, confirm, onClose]);

  useEffect(() => {
    if (!mounted) return undefined;

    const anterior = document.activeElement;
    scrollLocks += 1;
    document.body.style.overflow = 'hidden';

    const panel = panelRef.current;
    // Se algum campo já pegou o foco via autoFocus, respeita. Senão: o primeiro
    // elemento marcado, o primeiro campo do corpo, ou o próprio painel.
    if (panel && !panel.contains(document.activeElement)) {
      const alvo =
        panel.querySelector('[data-autofocus]') ||
        panel.querySelector('[data-dialog-body] input, [data-dialog-body] select, [data-dialog-body] textarea') ||
        panel.querySelector('[data-dialog-footer] button:last-child') ||
        panel;
      alvo.focus({ preventScroll: true });
    }

    return () => {
      scrollLocks -= 1;
      if (scrollLocks === 0) document.body.style.overflow = '';
      if (anterior instanceof HTMLElement && document.contains(anterior)) {
        anterior.focus({ preventScroll: true });
      }
    };
  }, [mounted]);

  const onKeyDown = useCallback(
    (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        requestClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const focaveis = [...panelRef.current.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (focaveis.length === 0) {
        event.preventDefault();
        return;
      }
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      const ativo = document.activeElement;

      if (event.shiftKey && (ativo === primeiro || ativo === panelRef.current)) {
        event.preventDefault();
        ultimo.focus();
      } else if (!event.shiftKey && ativo === ultimo) {
        event.preventDefault();
        primeiro.focus();
      }
    },
    [requestClose]
  );

  return { mounted, closing, panelRef, titleId, requestClose, onKeyDown };
}
