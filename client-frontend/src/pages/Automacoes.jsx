import { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { GATILHO_INFO, ACAO_INFO, gatilhoLabel, acaoLabel } from '../utils/automacaoConstants';

function ToggleAtivo({ ativo, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ativo}
      onClick={() => onChange(!ativo)}
      title={ativo ? 'Ativo' : 'Inativo'}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
        ativo ? 'bg-primary' : 'bg-slate-200'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
          ativo ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function RowMenu({ automacao, onDelete, onOpenChange, isOpen }) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onOpenChange(isOpen ? null : automacao.id)}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-light-text hover:bg-background transition-colors"
        title="Mais ações"
      >
        <span className="material-icons text-[19px]">more_vert</span>
      </button>

      {isOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => onOpenChange(null)}
            aria-label="Fechar menu"
          />
          <div className="absolute right-0 top-9 z-20 w-40 bg-white border border-divider rounded-lg shadow-lg py-1.5">
            <Link
              to={`/automacoes/${automacao.modulo_id}/${automacao.id}/editar`}
              className="flex items-center gap-2 px-3.5 py-2 text-sm text-gray-700 hover:bg-background transition-colors"
            >
              <span className="material-icons text-[17px] text-light-text">edit</span>
              Editar
            </Link>
            <button
              type="button"
              onClick={() => {
                onOpenChange(null);
                onDelete(automacao);
              }}
              className="w-full flex items-center gap-2 px-3.5 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <span className="material-icons text-[17px]">delete_outline</span>
              Excluir
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function Automacoes({
  automacoes = [],
  modulos = [],
  loading = false,
  onToggleAtivo,
  onDelete,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filtradas = automacoes.filter((automacao) => {
    if (!normalizedSearch) return true;
    return (
      (automacao.nome || '').toLowerCase().includes(normalizedSearch) ||
      (automacao.modulo_nome || '').toLowerCase().includes(normalizedSearch)
    );
  });

  const total = automacoes.length;
  const ativas = automacoes.filter((a) => a.ativo).length;

  return (
    <Layout>
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div className="relative w-full sm:max-w-xs">
          <span className="material-icons absolute left-3.5 top-1/2 -translate-y-1/2 text-[19px] text-light-text pointer-events-none">
            search
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar automações..."
            className="w-full h-11 pl-10 pr-4 border border-divider rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-colors"
          />
        </div>

        <Link
          to="/automacoes/nova"
          className="h-11 px-5 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors flex items-center gap-1.5 justify-center shrink-0"
        >
          <span className="material-icons text-base">add</span>
          Criar Automação
        </Link>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 shrink-0">
        <div className="bg-white border border-divider rounded-2xl p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <span className="material-icons text-primary text-[22px]">bolt</span>
          </div>
          <div>
            <p className="text-2xl font-bold tracking-tight">{total}</p>
            <p className="text-xs text-light-text mt-0.5">Total de Automações</p>
          </div>
        </div>

        <div className="bg-white border border-divider rounded-2xl p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
            <span className="material-icons text-emerald-600 text-[22px]">check_circle</span>
          </div>
          <div>
            <p className="text-2xl font-bold tracking-tight">{ativas}</p>
            <p className="text-xs text-light-text mt-0.5">Ativas</p>
          </div>
        </div>

        <div className="bg-white border border-divider rounded-2xl p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-background flex items-center justify-center shrink-0">
            <span className="material-icons text-light-text text-[22px]">insights</span>
          </div>
          <div className="flex items-center gap-2">
            <div>
              <p className="text-2xl font-bold tracking-tight text-light-text">—</p>
              <p className="text-xs text-light-text mt-0.5">Execuções</p>
            </div>
            <span className="text-[10px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full">Em breve</span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-divider rounded-2xl overflow-hidden flex-1 flex flex-col min-h-0">
        {loading ? (
          <div className="flex-1 flex flex-col gap-2 p-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-background animate-pulse" />
            ))}
          </div>
        ) : filtradas.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-background flex items-center justify-center mb-3">
              <span className="material-icons text-2xl text-light-text">bolt</span>
            </div>
            <p className="text-sm font-medium text-gray-700 mb-1">
              {normalizedSearch ? 'Nenhuma automação encontrada' : 'Nenhuma automação criada ainda'}
            </p>
            <p className="text-xs text-light-text mb-4">
              {normalizedSearch ? 'Tente outro termo de busca.' : 'Crie sua primeira automação para agilizar processos.'}
            </p>
            {!normalizedSearch && (
              <Link to="/automacoes/nova" className="text-primary text-sm font-medium hover:underline">
                + Criar Automação
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-divider text-left text-xs text-light-text uppercase tracking-wide">
                  <th className="px-5 py-3.5 font-medium">Automação</th>
                  <th className="px-5 py-3.5 font-medium">Fluxo</th>
                  <th className="px-5 py-3.5 font-medium">Execuções</th>
                  <th className="px-5 py-3.5 font-medium">Última execução</th>
                  <th className="px-5 py-3.5 font-medium">Status</th>
                  <th className="px-5 py-3.5 font-medium w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {filtradas.map((automacao) => {
                  const gatilhoInfo = GATILHO_INFO[automacao.gatilho] || {};
                  const primeiraAcao = automacao.acoes?.[0];
                  const acaoInfo = primeiraAcao ? ACAO_INFO[primeiraAcao.tipo] : null;
                  const acoesExtras = (automacao.acoes?.length || 0) - 1;

                  return (
                    <tr key={automacao.id} className="hover:bg-background/40 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="material-icons text-primary text-[18px]">
                              {gatilhoInfo.icon || 'bolt'}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">{automacao.nome}</p>
                            <p className="text-xs text-light-text truncate">{automacao.modulo_nome}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1 rounded-md bg-background px-2 py-1 text-xs font-medium text-gray-700">
                            {gatilhoLabel(automacao.gatilho)}
                          </span>
                          <span className="material-icons text-[15px] text-light-text">arrow_forward</span>
                          <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                            {acaoInfo ? acaoLabel(primeiraAcao.tipo) : '—'}
                          </span>
                          {acoesExtras > 0 && (
                            <span className="text-[11px] text-light-text">+{acoesExtras}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-light-text">—</td>
                      <td className="px-5 py-4 text-light-text">—</td>
                      <td className="px-5 py-4">
                        <ToggleAtivo
                          ativo={!!automacao.ativo}
                          onChange={(novoValor) => onToggleAtivo(automacao, novoValor)}
                        />
                      </td>
                      <td className="px-5 py-4">
                        <RowMenu
                          automacao={automacao}
                          onDelete={onDelete}
                          isOpen={openMenuId === automacao.id}
                          onOpenChange={setOpenMenuId}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
