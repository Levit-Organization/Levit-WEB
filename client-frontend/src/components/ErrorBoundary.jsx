import { Component } from 'react';

/**
 * Um erro de render numa tela não derruba o app inteiro em branco: mostra uma
 * saída (recarregar / voltar ao início). `resetKey` limpa o erro ao navegar.
 */
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Erro de renderização:', error, info?.componentStack);
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div role="alert" className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md text-center flex flex-col items-center">
          <div className="w-14 h-14 rounded-xl bg-danger-bg text-danger flex items-center justify-center mb-4">
            <span className="material-icons text-[26px]" aria-hidden="true">error_outline</span>
          </div>
          <h1 className="text-xl font-bold text-ink">Algo deu errado nesta tela</h1>
          <p className="text-sm text-light-text mt-2 leading-relaxed">
            Ocorreu um erro inesperado. Seus dados não foram perdidos — recarregue a página ou volte ao início.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="h-11 px-5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-600 transition-colors"
            >
              Recarregar página
            </button>
            <a
              href="/"
              className="h-11 px-5 inline-flex items-center rounded-lg border border-divider-strong bg-surface text-ink text-sm font-semibold hover:bg-background transition-colors"
            >
              Ir para o início
            </a>
          </div>
        </div>
      </div>
    );
  }
}
