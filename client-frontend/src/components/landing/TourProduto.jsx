import { useEffect, useRef, useState } from 'react';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useProgressoNoScroll } from './motion';
import { Revelar } from './primitivos';

/* ---------- Cenas: recortes do produto real, um por capítulo ---------- */

function CenaModulos({ ativa }) {
  const campos = [
    ['title', 'Empresa', 'Texto'],
    ['payments', 'Valor do contrato', 'Número'],
    ['flag', 'Status', 'Lista · Novo, Proposta, Fechado'],
    ['event', 'Data de fechamento', 'Data'],
  ];
  return (
    <div className={`lp-cena lp-cena-modulos ${ativa ? 'is-ativa' : ''}`}>
      <div className="lp-cena-topo">
        <span className="lp-cena-icone"><span className="material-icons">handshake</span></span>
        <div>
          <p className="lp-cena-titulo">Nova tabela: Vendas</p>
          <p className="lp-cena-sub">Colunas que a equipe preenche</p>
        </div>
      </div>
      <ol className="lp-campos">
        {campos.map(([icone, nome, tipo], i) => (
          <li key={nome} className="lp-campo" style={{ '--i': i }}>
            <span className="material-icons lp-campo-alca">drag_indicator</span>
            <span className="material-icons lp-campo-tipo">{icone}</span>
            <span className="lp-campo-nome">{nome}</span>
            <span className="lp-campo-desc">{tipo}</span>
          </li>
        ))}
        <li className="lp-campo is-adicionar" style={{ '--i': campos.length }}>
          <span className="material-icons">add</span>Adicionar coluna
        </li>
      </ol>
    </div>
  );
}

function CenaRecrutamento({ ativa }) {
  const colunas = [
    { nome: 'Triagem', cor: 1, cartoes: [['Ana S.', 'há 2 dias', 3], ['Diego M.', 'hoje', 6]] },
    { nome: 'Entrevista', cor: 3, cartoes: [['Bruno L.', 'há 1 dia', 5]], movel: true },
    { nome: 'Proposta', cor: 4, cartoes: [] },
    { nome: 'Contratado', cor: 5, cartoes: [['Carla D.', 'há 5 dias', 2]] },
  ];
  return (
    <div className={`lp-cena lp-cena-kanban ${ativa ? 'is-ativa' : ''}`}>
      <div className="lp-cena-topo">
        <span className="lp-cena-icone"><span className="material-icons">person_search</span></span>
        <div>
          <p className="lp-cena-titulo">Vaga: Desenvolvedor Front-end</p>
          <p className="lp-cena-sub">Arraste o candidato para a próxima etapa</p>
        </div>
      </div>
      <div className="lp-kanban">
        {colunas.map((col) => (
          <div key={col.nome} className={`lp-kanban-col is-etapa-${col.cor}`}>
            <p className="lp-kanban-nome"><i />{col.nome}</p>
            {col.cartoes.map(([nome, vaga, cor]) => (
              <div key={nome} className={`lp-kanban-cartao ${col.movel ? 'is-movel' : ''}`}>
                <span className={`lp-avatar is-cor-${cor}`}>{nome.replace('.', '').split(' ').map((p) => p[0]).join('')}</span>
                <span className="lp-app-texto"><strong>{nome}</strong><small>{vaga}</small></span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

const NIVEIS = { gerenciar: 'Tudo', editar: 'Editar', visualizar: 'Só ver', nenhum: '—' };

function CenaEquipe({ ativa }) {
  const pessoas = [
    ['Marina Costa', 'Comercial', 1, ['gerenciar', 'visualizar', 'nenhum']],
    ['Rafael Lima', 'RH', 3, ['nenhum', 'gerenciar', 'editar']],
    ['Júlia Prado', 'Financeiro', 4, ['visualizar', 'nenhum', 'gerenciar']],
    ['Caio Nunes', 'Operações', 6, ['editar', 'nenhum', 'visualizar']],
  ];
  return (
    <div className={`lp-cena lp-cena-equipe ${ativa ? 'is-ativa' : ''}`}>
      <div className="lp-cena-topo">
        <span className="lp-cena-icone"><span className="material-icons">admin_panel_settings</span></span>
        <div>
          <p className="lp-cena-titulo">Quem acessa o quê</p>
          <p className="lp-cena-sub">O que cada cargo pode fazer em cada tabela</p>
        </div>
      </div>
      <div className="lp-permissoes">
        <div className="lp-perm-linha is-cabecalho">
          <span>Pessoa</span><span>Vendas</span><span>Recrutamento</span><span>Financeiro</span>
        </div>
        {pessoas.map(([nome, cargo, cor, niveis], i) => (
          <div key={nome} className="lp-perm-linha" style={{ '--i': i }}>
            <span className="lp-perm-pessoa">
              <span className={`lp-avatar is-cor-${cor}`}>{nome.split(' ').map((p) => p[0]).join('')}</span>
              <span className="lp-app-texto"><strong>{nome}</strong><small>{cargo}</small></span>
            </span>
            {niveis.map((nivel, j) => (
              <span key={j} className={`lp-nivel is-${nivel}`}>{NIVEIS[nivel]}</span>
            ))}
          </div>
        ))}
        <div className="lp-perm-linha is-convidar" style={{ '--i': pessoas.length }}>
          <span className="material-icons">person_add</span>Convidar pessoa por e-mail
        </div>
      </div>
    </div>
  );
}

function CenaAutomacoes({ ativa }) {
  const etapas = [
    ['Quando', 'bolt', 'Um cliente for atualizado em Vendas'],
    ['Se', 'filter_alt', 'O status virar “Fechado” e o valor passar de 10.000'],
    ['Então', 'notifications_active', 'Avisar o comercial e criar a tarefa de boas-vindas'],
  ];
  return (
    <div className={`lp-cena lp-cena-automacao ${ativa ? 'is-ativa' : ''}`}>
      <div className="lp-cena-topo">
        <span className="lp-cena-icone"><span className="material-icons">bolt</span></span>
        <div>
          <p className="lp-cena-titulo">Negócio fechado</p>
          <p className="lp-cena-sub">Ligada · rodou 42 vezes esta semana</p>
        </div>
        <span className="lp-chave is-ligada" aria-hidden="true"><i /></span>
      </div>
      <ol className="lp-fluxo-mini">
        {etapas.map(([rotulo, icone, texto], i) => (
          <li key={rotulo} style={{ '--i': i }}>
            <span className="lp-fluxo-mini-rotulo">{rotulo}</span>
            <span className="material-icons">{icone}</span>
            <span>{texto}</span>
          </li>
        ))}
      </ol>
      <div className="lp-execucoes">
        <p className="lp-execucoes-titulo">Últimas vezes que rodou</p>
        {[['Studio Norte', 'há 2 min'], ['ACME Indústria', 'há 1 h'], ['Clínica Vida', 'ontem']].map(([nome, quando], i) => (
          <div key={nome} className="lp-execucao" style={{ '--i': i + 3 }}>
            <span className="lp-status is-fechado">Feito</span>
            <span className="lp-execucao-nome">{nome}</span>
            <span className="lp-execucao-quando">{quando}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const CAPITULOS = [
  {
    id: 'modulos',
    nome: 'Tabelas',
    titulo: 'Tabelas no lugar das planilhas.',
    texto: 'Crie uma tabela para clientes, pedidos ou estoque e escolha o que cada coluna guarda: texto, número, data ou uma lista de opções. Todo mundo preenche do mesmo jeito, sem bagunça.',
    Cena: CenaModulos,
  },
  {
    id: 'recrutamento',
    nome: 'Recrutamento',
    titulo: 'Veja cada candidato na etapa em que ele está.',
    texto: 'Cada vaga vira um quadro com colunas como Triagem, Entrevista e Contratado. Os candidatos se inscrevem por um link, você arrasta cada um para a próxima etapa e vê quem está parado há dias.',
    Cena: CenaRecrutamento,
  },
  {
    id: 'equipe',
    nome: 'Equipe',
    titulo: 'Cada pessoa vê só o que precisa.',
    texto: 'Convide a equipe por e-mail e escolha o que cada cargo pode fazer em cada tabela: só ver, editar ou cuidar de tudo. Quem é de vendas não vê o financeiro.',
    Cena: CenaEquipe,
  },
  {
    id: 'automacoes',
    nome: 'Automações',
    titulo: 'Tarefas repetitivas acontecem sozinhas.',
    texto: 'Você diz o que deve acontecer quando algo muda, e o Levit faz: avisa a equipe, manda e-mail, preenche uma coluna ou cria uma tarefa em outra tabela. E mostra tudo o que já fez.',
    Cena: CenaAutomacoes,
  },
];

/**
 * Tour do produto. No desktop, a tela fica presa à direita e troca de cena
 * conforme o capítulo da esquerda passa pelo meio da tela. No celular, cada
 * capítulo traz a sua cena logo abaixo do texto.
 */
export default function TourProduto() {
  const secao = useRef(null);
  const capitulos = useRef([]);
  const desktop = useMediaQuery('(min-width: 1024px)');
  const [ativo, setAtivo] = useState(0);

  // A seção escura "abre" sobre a página clara conforme entra (cantos e margem).
  useProgressoNoScroll(secao);

  useEffect(() => {
    if (!('IntersectionObserver' in window)) return undefined;
    const obs = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((e) => {
          if (e.isIntersecting) setAtivo(Number(e.target.dataset.indice));
        });
      },
      { rootMargin: '-45% 0px -45% 0px' }
    );
    capitulos.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={secao} id="produto" className="lp-tour" data-escuro aria-labelledby="tour-titulo">
      <div className="lp-tour-palco">
        <div className="lp-tour-cabecalho">
          <Revelar as="h2" id="tour-titulo" className="lp-h2 is-claro">
            Tudo o que a sua equipe usa, num lugar só.
          </Revelar>
          <Revelar as="p" atraso={80} className="lp-tour-intro">
            Tabelas, quadros, avisos e acessos da equipe ficam juntos e conversam entre si. Nada de copiar informação de um lugar para outro.
          </Revelar>
        </div>

        <div className="lp-tour-grade">
          <div className="lp-tour-capitulos">
            <nav className="lp-tour-indice" aria-label="Capítulos do tour">
              {CAPITULOS.map((c, i) => (
                <a
                  key={c.id}
                  href={`#cap-${c.id}`}
                  className={i === ativo ? 'is-ativo' : ''}
                  aria-current={i === ativo ? 'step' : undefined}
                >
                  <span className="lp-tour-indice-barra"><i /></span>
                  {c.nome}
                </a>
              ))}
            </nav>

            {CAPITULOS.map((c, i) => (
              <article
                key={c.id}
                id={`cap-${c.id}`}
                ref={(el) => (capitulos.current[i] = el)}
                data-indice={i}
                className={`lp-capitulo ${i === ativo ? 'is-ativo' : ''}`}
              >
                <p className="lp-capitulo-nome">{c.nome}</p>
                <h3 className="lp-h3">{c.titulo}</h3>
                <p className="lp-capitulo-texto">{c.texto}</p>
                {!desktop && (
                  <div className="lp-tela is-inline">
                    <c.Cena ativa={i === ativo} />
                  </div>
                )}
              </article>
            ))}
          </div>

          {desktop && (
            <div className="lp-tour-fixo">
              <div className="lp-tela" data-cena={ativo}>
                {CAPITULOS.map((c, i) => (
                  <div key={c.id} className={`lp-tela-camada ${i === ativo ? 'is-ativa' : i < ativo ? 'is-passada' : ''}`} aria-hidden={i !== ativo}>
                    <c.Cena ativa={i === ativo} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
