/**
 * src/hooks/useFirebaseSync.js
 *
 * Hook de ponte entre Firebase (Firestore onSnapshot / FCM onMessage)
 * e o cache do TanStack Query.
 *
 * Estratégia de uma única fonte de verdade:
 *  - O estado canônico da UI vive EXCLUSIVAMENTE no QueryClient.
 *  - O Firebase apenas sinaliza "algo mudou" → o hook responde com
 *    queryClient.invalidateQueries() ou queryClient.setQueryData().
 *  - Nunca há dois estados concorrentes (estado local vs. Firebase).
 *
 * Uso:
 *   // Em qualquer componente autenticado (ex: Layout)
 *   useFirebaseSync({ moduloId, vagaId });
 */
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { MODULOS_KEY } from './useModulos';
import { EQUIPE_KEY } from './useEquipe';
import { kanbanKey } from './useKanban';
import { registrosKey } from './useRegistros';

/**
 * @param {{
 *   moduloId?: string   - ID do módulo ativo (para onSnapshot de registros)
 *   vagaId?:  string   - ID da vaga ativa (para onSnapshot do kanban)
 *   habilitado?: boolean - desativa o hook sem precisar de if fora do hook
 * }} params
 */
export function useFirebaseSync({ moduloId, vagaId, habilitado = true } = {}) {
  const queryClient = useQueryClient();
  const unsubscribeRefs = useRef([]);

  useEffect(() => {
    if (!habilitado) return;

    let cancelled = false;

    async function iniciarListeners() {
      // ── 1. Importação lazy do Firebase (tree-shaking via chunk dedicado) ───
      const [{ getFirestore }, { getFirebaseApp }, { collection, onSnapshot, doc }] =
        await Promise.all([
          import('firebase/firestore'),
          import('../services/firebase'),
          import('firebase/firestore'),
        ]);

      if (cancelled) return;

      const db = getFirestore(getFirebaseApp());

      // ── 2. Listener: coleção de módulos ────────────────────────────────────
      // Quando o Firestore sinaliza mudança em qualquer módulo da empresa,
      // invalidamos a query sem substituir dados — o TanStack refaz o fetch REST.
      const modulosRef = collection(db, 'modulos');
      const unsubModulos = onSnapshot(
        modulosRef,
        { includeMetadataChanges: false },
        () => {
          queryClient.invalidateQueries({ queryKey: MODULOS_KEY });
        },
        (err) => console.warn('[FirebaseSync] módulos:', err.message)
      );
      unsubscribeRefs.current.push(unsubModulos);

      // ── 3. Listener: equipe ────────────────────────────────────────────────
      const equipeRef = collection(db, 'equipe');
      const unsubEquipe = onSnapshot(
        equipeRef,
        { includeMetadataChanges: false },
        () => {
          queryClient.invalidateQueries({ queryKey: EQUIPE_KEY });
        },
        (err) => console.warn('[FirebaseSync] equipe:', err.message)
      );
      unsubscribeRefs.current.push(unsubEquipe);

      // ── 4. Listener: registros do módulo ativo (se houver) ─────────────────
      if (moduloId) {
        const registrosRef = collection(db, `modulos/${moduloId}/registros`);
        const unsubRegistros = onSnapshot(
          registrosRef,
          { includeMetadataChanges: false },
          () => {
            // Invalida TODAS as variações de query para este moduloId
            queryClient.invalidateQueries({ queryKey: ['registros', moduloId] });
          },
          (err) => console.warn('[FirebaseSync] registros:', err.message)
        );
        unsubscribeRefs.current.push(unsubRegistros);
      }

      // ── 5. Listener: kanban da vaga ativa (se houver) ─────────────────────
      if (vagaId && vagaId !== 'all') {
        const kanbanRef = doc(db, `kanban/${vagaId}`);
        const unsubKanban = onSnapshot(
          kanbanRef,
          { includeMetadataChanges: false },
          (snap) => {
            if (snap.exists()) {
              // Se o Firestore retornar os dados completos, injetamos direto no cache
              // sem precisar de uma round-trip REST (setQueryData = zero latência).
              queryClient.setQueryData(kanbanKey(vagaId), snap.data());
            } else {
              queryClient.invalidateQueries({ queryKey: kanbanKey(vagaId) });
            }
          },
          (err) => console.warn('[FirebaseSync] kanban:', err.message)
        );
        unsubscribeRefs.current.push(unsubKanban);
      }

      // ── 6. FCM: mensagens push em primeiro plano ───────────────────────────
      try {
        const { getMessaging, onMessage } = await import('firebase/messaging');
        const { getFirebaseApp: getApp } = await import('../services/firebase');
        if (cancelled) return;
        const messaging = getMessaging(getApp());

        const unsubFCM = onMessage(messaging, (payload) => {
          const { tipo, referencia_id } = payload.data ?? {};

          switch (tipo) {
            case 'modulo':
              queryClient.invalidateQueries({ queryKey: MODULOS_KEY });
              break;
            case 'kanban':
              queryClient.invalidateQueries({ queryKey: kanbanKey(referencia_id ?? vagaId) });
              break;
            case 'equipe':
              queryClient.invalidateQueries({ queryKey: EQUIPE_KEY });
              break;
            case 'registro':
              queryClient.invalidateQueries({
                queryKey: registrosKey(referencia_id ?? moduloId),
              });
              break;
            default:
              // Notificação genérica: invalida tudo
              queryClient.invalidateQueries();
          }
        });

        unsubscribeRefs.current.push(unsubFCM);
      } catch {
        // FCM não suportado ou sem permissão — silencioso
      }
    }

    iniciarListeners();

    return () => {
      cancelled = true;
      unsubscribeRefs.current.forEach((unsub) => unsub?.());
      unsubscribeRefs.current = [];
    };
  }, [queryClient, moduloId, vagaId, habilitado]);
}
