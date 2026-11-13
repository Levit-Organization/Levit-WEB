import { useState } from 'react';
import Layout from '../components/Layout';
import { Button, Card, EmptyState, PageHeader, Tabs } from '../components/ui';
import { usePessoas, useRelatorios } from '../hooks/queries';
import { hojeISO } from '../utils/prazos';
import { somarDias } from '../utils/relatorios';
import { RELATORIO_VAZIO } from '../utils/relatoriosAgendados';
import PainelIndicadores from '../components/relatorios/PainelIndicadores';
import MontarRelatorio from '../components/relatorios/MontarRelatorio';
import SeletorPeriodo from '../components/relatorios/SeletorPeriodo';
import BaixarAgora from '../components/relatorios/BaixarAgora';
import RelatoriosAgendados from '../components/relatorios/RelatoriosAgendados';
import FormularioRelatorio from '../components/relatorios/FormularioRelatorio';

const ABAS = [
  { id: 'painel', label: 'Painel' },
  { id: 'montar', label: 'Montar relatório' },
  { id: 'pdf', label: 'Históricos' },
];

/**
 * Relatórios: painel com os números do período (comparados ao anterior),
 * relatório montado pela pessoa (agrupar uma tabela por uma coluna) e PDFs,
 * baixados na hora ou agendados por e-mail.
 */
export default function Relatorios() {
  const relatorios = useRelatorios();
  const pessoas = usePessoas();
  const nomes = Object.fromEntries((pessoas.data ?? []).map((p) => [p.id, p.nome]));
  const [form, setForm] = useState(null); // { chave, inicial }
  const [aba, setAba] = useState('painel');
  const [periodo, setPeriodo] = useState(() => ({ atalho: '30d', inicio: somarDias(hojeISO(), -29), fim: hojeISO() }));
  const semAcesso = relatorios.error?.response?.status === 403;
  const periodoValido = periodo.inicio && periodo.fim && periodo.inicio <= periodo.fim;

  const abrir = (relatorio = null) =>
    setForm({ chave: Date.now(), inicial: relatorio ? { ...RELATORIO_VAZIO, ...relatorio } : RELATORIO_VAZIO });

  return (
    <Layout>
      <PageHeader
        title="Relatórios"
        subtitle="Números do período e PDFs por e-mail"
        actions={!semAcesso && aba === 'pdf' && <Button icon="add" onClick={() => abrir()}>Novo relatório</Button>}
      />

      {semAcesso ? (
        <Card padding="lg" className="py-12">
          <EmptyState
            icon="lock"
            size="lg"
            title="Relatórios são para quem tem acesso total"
            description="O relatório mostra tudo o que acontece na empresa, em todas as tabelas. Peça a alguém com acesso total para agendar e incluir você entre quem recebe."
          />
        </Card>
      ) : (
        <>
          <Tabs abas={ABAS} ativa={aba} onChange={setAba} label="Tipo de relatório" />
          <div className="flex flex-col gap-6">
            <SeletorPeriodo periodo={periodo} onChange={setPeriodo} />
            {!periodoValido && <p className="text-sm text-danger -mt-3" role="alert">Escolha um período válido (início antes do fim).</p>}

            <div role="tabpanel" id={`painel-${aba}`} aria-labelledby={`aba-${aba}`}>
              {aba === 'painel' && <PainelIndicadores inicio={periodo.inicio} fim={periodo.fim} />}
              {aba === 'montar' && <MontarRelatorio inicio={periodo.inicio} fim={periodo.fim} />}
              {aba === 'pdf' && (
                <div className="flex flex-col gap-6">
                  <BaixarAgora inicio={periodo.inicio} fim={periodo.fim} />
                  <RelatoriosAgendados relatorios={relatorios} nomes={nomes} onNovo={() => abrir()} onEditar={abrir} />
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {form && (
        <FormularioRelatorio
          key={form.chave}
          aberto
          inicial={form.inicial}
          pessoas={pessoas.data ?? []}
          onFechar={() => setForm(null)}
        />
      )}
    </Layout>
  );
}
