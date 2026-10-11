import { useContext } from 'react';
import { FeedbackContext } from '../context/feedbackContext';

function useFeedbackContext() {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useToast/useConfirm devem ser usados dentro de <FeedbackProvider>');
  }
  return context;
}

/** toast.success('Salvo'), toast.error('Falhou'), toast.info(...), toast.warning(...) */
export function useToast() {
  return useFeedbackContext().toast;
}

/**
 * Diálogo de confirmação assíncrono, no lugar de window.confirm:
 *   if (!(await confirm({ title: 'Excluir?', message: '...', variant: 'danger' }))) return;
 */
export function useConfirm() {
  return useFeedbackContext().confirm;
}
