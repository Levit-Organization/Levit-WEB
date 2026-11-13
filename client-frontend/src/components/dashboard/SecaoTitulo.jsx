/** Título de seção da tela inicial, com uma ação opcional à direita. */
export default function SecaoTitulo({ children, acao }) {
  return (
    <div className="flex items-center justify-between gap-4 mb-3.5">
      <h2 className="text-base font-bold text-ink">{children}</h2>
      {acao}
    </div>
  );
}
