import { useAuth } from '../hooks/useAuth';
import Layout from '../components/Layout';
import PainelPrazos from '../components/prazos/PainelPrazos';
import IndicadoresDoDashboard from '../components/dashboard/IndicadoresDoDashboard';
import PainelAtencao from '../components/dashboard/PainelAtencao';
import SuasTabelas from '../components/dashboard/SuasTabelas';
import ResumoRecrutamento from '../components/dashboard/ResumoRecrutamento';
import ResumoEquipe from '../components/dashboard/ResumoEquipe';
import { useDadosDoDashboard } from '../components/dashboard/useDadosDoDashboard';
import { saudacaoDaHora } from '../utils/dashboard';

/**
 * Tela inicial: primeiro o que ninguém pode esquecer (prazos e o que pede
 * atenção), depois as tabelas; recrutamento e equipe como resumo.
 */
export default function Dashboard() {
  const { primeiroNome, empresa } = useAuth();
  const dados = useDadosDoDashboard();
  const hoje = new Date();

  return (
    <Layout>
      <header className="mb-7 shrink-0">
        <h1 className="text-2xl font-bold text-ink">
          {saudacaoDaHora(hoje.getHours())}, {primeiroNome}
        </h1>
        <p className="text-sm text-light-text mt-1 first-letter:uppercase">
          {hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          {empresa?.nome ? ` · ${empresa.nome}` : ''}
        </p>
      </header>

      {/* INDICADORES: a operação inteira */}
      <IndicadoresDoDashboard
        carregando={dados.modulosQuery.isLoading}
        tabelas={dados.tabelas}
        totalItens={dados.totalItens}
        resumoAutomacoes={dados.resumoAutomacoes}
        equipe={dados.equipe}
      />

      {/* PRAZOS E ATENÇÃO: o que ninguém pode esquecer */}
      <section className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-8 shrink-0">
        <div className="lg:col-span-3 min-w-0">
          <PainelPrazos query={dados.prazosQuery} />
        </div>
        <PainelAtencao itens={dados.atencao} />
      </section>

      {/* TABELAS: o centro do trabalho */}
      <SuasTabelas modulosQuery={dados.modulosQuery} tabelas={dados.tabelas} />

      {/* RECRUTAMENTO E EQUIPE (resumo) */}
      <section className="mb-4 shrink-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
          <ResumoRecrutamento
            vagaDestaque={dados.vagaDestaque}
            vagas={dados.vagas}
            kanbanQuery={dados.kanbanQuery}
            vagaIndisponivel={dados.vagaIndisponivel}
            resumoVaga={dados.resumoVaga}
          />
          <ResumoEquipe equipeQuery={dados.equipeQuery} equipe={dados.equipe} equipeIndisponivel={dados.equipeIndisponivel} />
        </div>
      </section>
    </Layout>
  );
}
