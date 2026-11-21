import { Link } from 'react-router-dom';
import '@fontsource-variable/archivo/wdth.css';

const PILARES = [
  ['table_chart', 'Tabelas', 'no lugar das planilhas espalhadas'],
  ['view_kanban', 'Quadros', 'para acompanhar cada etapa do trabalho'],
  ['bolt', 'Automações', 'que avisam a pessoa certa na hora certa'],
];

/** Mesma tipografia expandida dos títulos da landing. */
const DISPLAY = { fontFamily: "'Archivo Variable', 'Archivo', sans-serif", fontStretch: '118%' };

/**
 * Moldura das telas de acesso (entrar, criar conta, senha, convite). Continua a
 * landing: painel escuro com a proposta do Levit no desktop e o formulário sobre
 * o fundo claro do app. No celular, só o formulário com a marca no topo.
 */
export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] bg-background">
      <aside className="hidden lg:flex flex-col justify-between gap-12 p-12 xl:p-16 bg-[oklch(16.5%_0.032_282)] text-[oklch(82%_0.02_282)]">
        <Link to="/" className="flex items-center gap-3 self-start rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-300">
          <img src="/Logo.png" alt="" className="h-9 w-9 object-contain" />
          <span className="text-xl font-extrabold text-white" style={DISPLAY}>Levit</span>
        </Link>

        <div className="max-w-md">
          <p className="text-[clamp(2.25rem,3.4vw,3.25rem)] leading-[1.02] font-extrabold tracking-[-0.025em] text-white text-balance" style={DISPLAY}>
            Sua empresa inteira em um só <span className="text-primary-300">lugar.</span>
          </p>
          <ul className="mt-10 flex flex-col gap-5">
            {PILARES.map(([icone, titulo, texto]) => (
              <li key={titulo} className="flex items-start gap-3.5">
                <span className="w-10 h-10 shrink-0 rounded-xl bg-[oklch(22%_0.038_282)] text-primary-300 flex items-center justify-center" aria-hidden="true">
                  <span className="material-icons text-[20px]">{icone}</span>
                </span>
                <p className="text-base leading-snug pt-2">
                  <strong className="font-semibold text-white">{titulo}</strong> {texto}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-[oklch(64%_0.02_282)]">© 2026 Levit</p>
      </aside>

      <main className="flex flex-col items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <Link
            to="/"
            className="lg:hidden flex items-center justify-center gap-2.5 mb-6 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            <img src="/Logo.png" alt="" className="h-9 w-9 object-contain" />
            <span className="text-xl font-extrabold text-ink" style={DISPLAY}>Levit</span>
          </Link>

          <div className="bg-surface p-7 sm:p-9 rounded-2xl shadow-md border border-divider flex flex-col items-center">
            {children}
          </div>

          <Link to="/" className="mt-6 flex items-center justify-center gap-1.5 text-xs font-medium text-light-text hover:text-ink transition-colors">
            <span className="material-icons text-[16px]" aria-hidden="true">arrow_back</span>
            Voltar para o site
          </Link>
        </div>
      </main>
    </div>
  );
}
