/** Número do passo no construtor de automação (1 Quando, 2 Se, 3 Então). */
export function NumeroDoNo({ children }) {
  return (
    <span className="w-6 h-6 rounded-full bg-primary text-white text-2xs font-bold flex items-center justify-center shrink-0 tabular">
      {children}
    </span>
  );
}

/** Linha vertical que liga um passo ao seguinte. */
export function Conector() {
  return (
    <div className="flex justify-center py-1">
      <div className="w-px h-6 bg-divider" />
    </div>
  );
}

/** Botões de escolha com ícone (gatilhos e tipos de ação). */
export function BotaoDeEscolha({ info, ativo, ...rest }) {
  return (
    <button
      type="button"
      title={info.label}
      className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-4 text-center transition-colors ${
        ativo
          ? 'border-primary bg-primary-50 text-primary-700 shadow-xs'
          : 'border-divider-strong text-light-text hover:border-primary-300 hover:bg-primary-50/60 hover:text-ink-soft'
      }`}
      {...rest}
    >
      <span className="material-icons text-[24px]">{info.icon}</span>
      <span className="text-xs font-medium">{info.label}</span>
    </button>
  );
}
