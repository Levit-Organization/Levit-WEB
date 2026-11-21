import { render } from '@testing-library/react';
import { FeedbackProvider } from '../context/FeedbackProvider';

/** Renderiza dentro do FeedbackProvider (toasts e confirmações), exigido por Modal/Drawer. */
export function renderComFeedback(ui) {
  return render(<FeedbackProvider>{ui}</FeedbackProvider>);
}
