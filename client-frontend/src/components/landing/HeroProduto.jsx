import { useEffect, useRef, useState } from 'react';
import { useMovimentoReduzido, useNaTela } from './motion';

const LINHAS = [
  { id: 'acme', nome: 'ACME Indústria', contato: 'Marina Costa', valor: 'R$ 48.000', status: 'proposta', cor: 1 },
  { id: 'sol', nome: 'Padaria Sol', contato: 'Rafael Lima', valor: 'R$ 6.200', status: 'novo', cor: 3 },
  { id: 'vida', nome: 'Clínica Vida', contato: 'Júlia Prado', valor: 'R$ 21.500', status: 'fechado', cor: 4 },
  { id: 'rota', nome: 'Transportes Rota', contato: 'Caio Nunes', valor: 'R$ 33.900', status: 'proposta', cor: 6 },
];
const NOVA = { id: 'norte', nome: 'Studio Norte', contato: 'Beatriz Alves', valor: 'R$ 12.800', status: 'novo', cor: 5 };

const STATUS = {
  novo: { rotulo: 'Novo', classe: 'is-novo' },
  proposta: { rotulo: 'Proposta', classe: 'is-proposta' },
  fechado: { rotulo: 'Fechado', classe: 'is-fechado' },
};

/**
 * Uma única linha do tempo (em vez de vários loops soltos): cada passo é um
 * momento real do produto. 0 parado · 1 registro novo entra · 2 status muda
 * para Fechado · 3 automação roda e avisa · 4 respiro antes de recomeçar.
 */
const DURACAO_PASSO = [1600, 2200, 2200, 3600, 1400];
const PASSO_FINAL = 3;

function iniciais(nome) {
  return nome.split(' ').map((p) => p[0]).slice(0, 2).join('');
}

function Linha({ linha, status, nova, mudou }) {
  const s = STATUS[status];
  return (
    <div className={`lp-app-linha ${nova ? 'is-nova' : ''}`}>
      <span className="lp-app-celula is-nome">
        <span className={`lp-avatar is-cor-${linha.cor}`} aria-hidden="true">{iniciais(linha.contato)}</span>
        <span className="lp-app-texto">
          <strong>{linha.nome}</strong>
          <small>{linha.contato}</small>
        </span>
      </span>
      <span className="lp-app-celula is-valor">{linha.valor}</span>
      <span className="lp-app-celula">
        <span className={`lp-status ${s.classe} ${mudou ? 'is-mudou' : ''}`}>{s.rotulo}</span>
      </span>
    </div>
  );
}

export default function HeroProduto() {
  const ref = useRef(null);
  const reduzido = useMovimentoReduzido();
  const visivel = useNaTela(ref, { margem: '0px', umaVez: false });
  const [passo, setPasso] = useState(0);

  // Só anima com o hero na tela e a aba visível; com movimento reduzido, mostra
  // direto o estado final (a história inteira num quadro).
  useEffect(() => {
    if (reduzido || !visivel) return undefined;
    const timer = setTimeout(() => {
      if (document.hidden) return;
      setPasso((p) => (p + 1) % DURACAO_PASSO.length);
    }, DURACAO_PASSO[passo]);
    return () => clearTimeout(timer);
  }, [passo, visivel, reduzido]);

  const p = reduzido ? PASSO_FINAL : passo;
  // A linha nova e o "Fechado" ficam até o fim do ciclo: o recomeço acontece
  // com o conteúdo esmaecido (passo 4), sem salto visível.
  const temNova = p >= 1;
  const fechou = p >= 2;
  const avisou = p === 3;
  const notificacoes = avisou ? 3 : 2;

  return (
    <div ref={ref} className={`lp-app ${p === 4 ? 'is-recomecando' : ''}`} aria-label="Exemplo do Levit: uma tabela de clientes em uso" role="img">
      <aside className="lp-app-menu" aria-hidden="true">
        <div className="lp-app-marca"><img src="/Logo.png" alt="" /><span>Acme</span></div>
        {[
          ['space_dashboard', 'Início'],
          ['person_search', 'Recrutamento'],
          ['groups', 'Equipe'],
          ['widgets', 'Clientes', true],
          ['bolt', 'Automações'],
        ].map(([icone, nome, ativo]) => (
          <span key={nome} className={`lp-app-item ${ativo ? 'is-ativo' : ''}`}>
            <span className="material-icons">{icone}</span>{nome}
          </span>
        ))}
        <span className="lp-app-item is-sino">
          <span className="material-icons">{avisou ? 'notifications_active' : 'notifications_none'}</span>
          Notificações
          <b key={notificacoes} className="lp-app-contador">{notificacoes}</b>
        </span>
      </aside>

      <div className="lp-app-corpo" aria-hidden="true">
        <div className="lp-app-topo">
          <div>
            <p className="lp-app-titulo">Clientes</p>
            <p className="lp-app-sub">{temNova ? 5 : 4} clientes · colunas do seu jeito</p>
          </div>
          <span className={`lp-app-botao ${p === 1 ? 'is-pressionado' : ''}`}>
            <span className="material-icons">add</span>Novo cliente
          </span>
        </div>

        <div className="lp-app-tabela">
          <div className="lp-app-cabecalho">
            <span>Empresa</span>
            <span>Valor</span>
            <span>Status</span>
          </div>
          {temNova && <Linha linha={NOVA} status="novo" nova />}
          {LINHAS.map((linha) => (
            <Linha
              key={linha.id}
              linha={linha}
              status={linha.id === 'acme' && fechou ? 'fechado' : linha.status}
              mudou={linha.id === 'acme' && fechou}
            />
          ))}
        </div>

        <div className={`lp-app-aviso ${avisou ? 'is-visivel' : ''}`}>
          <span className="lp-app-aviso-icone"><span className="material-icons">bolt</span></span>
          <span className="lp-app-texto">
            <strong>Tarefa automática “Negócio fechado” feita</strong>
            <small>
              <span className="material-icons">check</span>3 pessoas avisadas
              <span className="material-icons">check</span>Tarefa criada para a equipe
            </small>
          </span>
        </div>
      </div>
    </div>
  );
}
