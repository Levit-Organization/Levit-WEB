import { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { Button, Badge, Toggle, StatCard, EmptyState, Card, Input, Skeleton, PageHeader } from '../components/ui';
import { GATILHO_INFO, ACAO_INFO, gatilhoLabel, acaoLabel } from '../utils/automacaoConstants';

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
          <div className="absolute right-0 top-9 z-20 w-40 bg-surface border border-divider rounded-lg shadow-lg py-1.5">
            <Link
              to={`/automacoes/${automacao.modulo_id}/${automacao.id}/editar`}
              className="flex items-center gap-2 px-3.5 py-2 text-sm text-ink-soft hover:bg-background transition-colors"
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
              className="w-full flex items-center gap-2 px-3.5 py-2 text-sm text-danger hover:bg-danger-bg transition-colors"
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
      <PageHeader
        title="Automações"
        subtitle={
          total === 0
            ? 'Dispare e-mails e webhooks quando um registro muda'
            : `${ativas} de ${total} ${total === 1 ? 'automação ativa' : 'automações ativas'}`
        }
        actions={
          <>
            <div className="w-full sm:w-64">
              <Input
                type="search"
                icon="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar automações..."
                aria-label="Buscar automações"
              />
            </div>
            <Button to="/automacoes/nova" icon="add">
              Criar automação
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 shrink-0">
        <StatCard icon="bolt" value={total} label={total === 1 ? 'Automação criada' : 'Automações criadas'} variant="primary" />
        <StatCard icon="check_circle" value={ativas} label={ativas === 1 ? 'Ativa agora' : 'Ativas agora'} variant="success" />
        <StatCard
          icon="insights"
          value="—"
          empty
          label="Execuções"
          variant="default"
          badge={<Badge variant="outline" size="sm">Em breve</Badge>}
        />
      </div>

      <Card padding="none" className="overflow-hidden flex-1 flex flex-col min-h-0">
        {loading ? (
          <div className="flex-1 flex flex-col gap-2 p-5">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : filtradas.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16">
            <EmptyState
              icon="bolt"
              title={normalizedSearch ? 'Nenhuma automação encontrada' : 'Nenhuma automação ainda'}
              description={
                normalizedSearch
                  ? `Nada bate com "${searchTerm.trim()}". Tente outro termo ou limpe a busca.`
                  : 'Uma automação observa um módulo e age sozinha: quando um registro é criado ou muda, ela dispara um e-mail ou chama um webhook.'
              }
              actionLabel={!normalizedSearch ? 'Criar automação' : undefined}
              actionIcon={!normalizedSearch ? 'add' : undefined}
              actionTo={!normalizedSearch ? '/automacoes/nova' : undefined}
            />
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
                          <div className="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center shrink-0">
                            <span className="material-icons text-primary text-[18px]">
                              {gatilhoInfo.icon || 'bolt'}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-ink truncate">{automacao.nome}</p>
                            <p className="text-xs text-light-text truncate">{automacao.modulo_nome}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="default">{gatilhoLabel(automacao.gatilho)}</Badge>
                          <span className="material-icons text-[15px] text-light-text">arrow_forward</span>
                          <Badge variant="primary">{acaoInfo ? acaoLabel(primeiraAcao.tipo) : '—'}</Badge>
                          {acoesExtras > 0 && (
                            <span className="text-2xs text-light-text">+{acoesExtras}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-light-text">—</td>
                      <td className="px-5 py-4 text-light-text">—</td>
                      <td className="px-5 py-4">
                        <Toggle
                          checked={!!automacao.ativo}
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
      </Card>
    </Layout>
  );
}
