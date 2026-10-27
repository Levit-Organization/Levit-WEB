import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import '@fontsource-variable/archivo/wdth.css';
import './Landing.css';
import { BotaoCta, Revelar, TituloRevelado } from '../components/landing/primitivos';
import { useMovimentoReduzido, useNaTela } from '../components/landing/motion';

/**
 * Quem faz o Levit. Nome e foto vêm do perfil público no GitHub.
 * `cor` é um índice da paleta de pessoas do app (people-1 a people-6).
 */
const EQUIPE = [
  {
    nome: 'Cauã Rosa do Espírito Santo',
    papel: 'Front-end e design',
    github: 'cauaresdev',
    cor: 5,
    texto: 'Desenha as telas e cuida de como o Levit parece e se comporta, do sistema visual às animações desta página.',
    cuida: ['Interface', 'Design system', 'React'],
  },
  {
    nome: 'Thiago de Aguiar da Silva',
    papel: 'Front-end',
    github: 'Thigasprogrammer',
    cor: 4,
    texto: 'Transforma as telas em componentes que funcionam: os quadros, tabelas e formulários que a equipe usa todo dia.',
    cuida: ['React', 'Quadros', 'Formulários'],
  },
  {
    nome: 'Guilherme Villas Boas Braz',
    papel: 'Back-end e API',
    github: 'GuiVillas',
    cor: 1,
    texto: 'Constrói a API que guarda e entrega os dados, com as regras de acesso e as automações por trás de cada aviso.',
    cuida: ['API', 'Automações', 'Permissões'],
  },
  {
    nome: 'Guilherme Brandão Costa',
    papel: 'Banco de dados',
    github: 'gbrandev',
    cor: 3,
    texto: 'Modela onde cada informação mora, para que tabelas, quadros e relatórios continuem rápidos conforme a empresa cresce.',
    cuida: ['Modelagem', 'Migrações', 'Relatórios'],
  },
  {
    nome: 'Andriy Gabriel',
    papel: 'App para celular',
    github: 'AndriyBrine',
    cor: 6,
    texto: 'Leva o Levit para o bolso: o app para acompanhar o quadro e receber os avisos longe do computador.',
    cuida: ['Mobile', 'Notificações', 'Quadros'],
  },
];

const PRINCIPIOS = [
  ['Um lugar só', 'Tabelas, quadros, avisos e equipe juntos. Ninguém precisa procurar em cinco ferramentas o que já devia estar à mão.'],
  ['Do seu jeito, sem programar', 'Cada empresa trabalha de um jeito. Você monta as tabelas e os quadros que fazem sentido para a sua, sem pedir para ninguém.'],
  ['A pessoa certa, na hora certa', 'As automações avisam quem precisa saber quando algo muda, em vez de depender de alguém lembrar de mandar mensagem.'],
];

const CAMINHO = [
  ['Mês 1', 'O começo', 'Entrar, criar conta, as primeiras tabelas e o quadro de recrutamento.'],
  ['Mês 2', 'A equipe entra', 'Cargos e níveis de acesso, automações por e-mail e o controle financeiro.'],
  ['Mês 3', 'Trabalhando sozinho', 'Automações com condições, avisos dentro da plataforma, convites por e-mail e qualquer tabela vista como quadro.'],
];

function iniciais(nome) {
  const partes = nome.split(' ');
  return (partes[0][0] + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase();
}

function corDaPessoa(cor) {
  return { '--cor': `var(--color-people-${cor})`, '--cor-fundo': `var(--color-people-${cor}-bg)` };
}

/** Foto que segue levemente o ponteiro (só mouse, e nunca com movimento reduzido). */
function FotoMembro({ nome, github, numero }) {
  const ref = useRef(null);
  const reduzido = useMovimentoReduzido();
  const [semFoto, setSemFoto] = useState(false);

  const mover = (e) => {
    if (reduzido || e.pointerType !== 'mouse') return;
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    ref.current.style.setProperty('--rx', `${(-y * 8).toFixed(2)}deg`);
    ref.current.style.setProperty('--ry', `${(x * 10).toFixed(2)}deg`);
  };
  const soltar = () => {
    ref.current?.style.setProperty('--rx', '0deg');
    ref.current?.style.setProperty('--ry', '0deg');
  };

  return (
    <div className="lp-membro-palco" onPointerMove={mover} onPointerLeave={soltar}>
      <span className="lp-membro-num" aria-hidden="true">{numero}</span>
      <div ref={ref} className="lp-membro-foto">
        {semFoto ? (
          <span className="lp-membro-iniciais" aria-hidden="true">{iniciais(nome)}</span>
        ) : (
          <img
            src={`https://github.com/${github}.png?size=640`}
            alt=""
            width="420"
            height="525"
            loading="lazy"
            onError={() => setSemFoto(true)}
          />
        )}
      </div>
    </div>
  );
}

function Membro({ nome, papel, github, cor, texto, cuida, indice }) {
  const [primeiro, ...resto] = nome.split(' ');
  const numero = String(indice + 1).padStart(2, '0');
  return (
    <li id={`membro-${github}`} className="lp-membro" style={corDaPessoa(cor)}>
      <Revelar className="lp-membro-visual">
        <FotoMembro nome={nome} github={github} numero={numero} />
      </Revelar>
      <Revelar className="lp-membro-texto" atraso={140}>
        <span className="lp-membro-papel">{papel}</span>
        <h3 className="lp-membro-nome">
          <span className="lp-membro-primeiro">{primeiro}</span>
          {resto.length > 0 && <span className="lp-membro-resto"> {resto.join(' ')}</span>}
        </h3>
        <p className="lp-membro-descricao">{texto}</p>
        <ul className="lp-membro-cuida" aria-label="Cuida de">
          {cuida.map((c) => <li key={c}>{c}</li>)}
        </ul>
        <a className="lp-membro-link" href={`https://github.com/${github}`} target="_blank" rel="noreferrer">
          <span className="lp-membro-link-icone" aria-hidden="true">
            <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </span>
          @{github}
          <span className="material-icons lp-membro-link-seta" aria-hidden="true">arrow_outward</span>
          <span className="sr-only"> no GitHub (abre em nova aba)</span>
        </a>
      </Revelar>
    </li>
  );
}

/** Fileira de rostos no topo da seção: atalho para cada membro. */
function Rostos() {
  return (
    <Revelar as="nav" atraso={240} className="lp-rostos" aria-label="Pular para um membro">
      <ul>
        {EQUIPE.map((p) => (
          <li key={p.github} style={corDaPessoa(p.cor)}>
            <a href={`#membro-${p.github}`}>
              <img
                src={`https://github.com/${p.github}.png?size=96`}
                alt=""
                width="48"
                height="48"
                loading="lazy"
                onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
              />
              <span className="lp-rostos-nome">{p.nome.split(' ')[0]}</span>
            </a>
          </li>
        ))}
      </ul>
    </Revelar>
  );
}

function Cabecalho() {
  const [rolou, setRolou] = useState(false);
  useEffect(() => {
    const aoRolar = () => setRolou(window.scrollY > 12);
    aoRolar();
    window.addEventListener('scroll', aoRolar, { passive: true });
    return () => window.removeEventListener('scroll', aoRolar);
  }, []);

  return (
    <header className={`lp-nav ${rolou ? 'is-rolou' : ''}`}>
      <div className="lp-nav-interno">
        <Link to="/" className="lp-nav-marca">
          <img src="/Logo.png" alt="" width="28" height="28" />
          <span>Levit</span>
        </Link>
        <nav className="lp-nav-links" aria-label="Páginas">
          <Link to="/">O produto</Link>
          <Link to="/sobre" className="is-atual" aria-current="page">Sobre nós</Link>
        </nav>
        <div className="lp-nav-acoes">
          <Link to="/login" className="lp-nav-entrar">Entrar</Link>
          <BotaoCta to="/register" tamanho="pequeno" icone={null}>
            Criar conta<span className="lp-so-desktop"> grátis</span>
          </BotaoCta>
        </div>
      </div>
    </header>
  );
}

function ChamadaFinal() {
  const ref = useRef(null);
  const visivel = useNaTela(ref, { margem: '0px 0px -25% 0px' });
  return (
    <section ref={ref} className="lp-final" data-escuro aria-labelledby="sobre-final">
      <div className="lp-largura lp-final-interno">
        <TituloRevelado as="h2" texto="Venha organizar com a gente." destaque={['gente']} className="lp-final-titulo" ativo={visivel} />
        <div className="lp-final-acoes">
          <BotaoCta to="/register" variante="claro" magnetico>Criar conta grátis</BotaoCta>
          <Link to="/" className="lp-final-entrar">Conhecer o produto</Link>
        </div>
      </div>
    </section>
  );
}

export default function Sobre() {
  return (
    <div className="lp">
      <a href="#conteudo" className="lp-pular">Pular para o conteúdo</a>
      <Cabecalho />
      <main id="conteudo">
        <section className="lp-largura lp-sobre-hero" aria-labelledby="sobre-titulo">
          <TituloRevelado as="h1" texto="Feito por quem também cansou da bagunça." destaque={['bagunça']} className="lp-h1" />
          <Revelar as="p" atraso={480} className="lp-lede lp-sobre-lede">
            O Levit é feito por cinco estudantes do Ifes, campus Serra. A ideia é simples: o trabalho de uma equipe
            não devia ficar espalhado entre planilhas, mensagens e caixa de entrada. Então juntamos tudo num lugar só.
          </Revelar>
        </section>

        <section className="lp-sobre-secao" aria-labelledby="sobre-principios">
          <div className="lp-largura">
            <Revelar as="h2" id="sobre-principios" className="lp-h2 lp-cabecalho-secao">No que a gente acredita</Revelar>
            <ol className="lp-principios">
              {PRINCIPIOS.map(([titulo, texto], i) => (
                <Revelar as="li" key={titulo} atraso={i * 120} className="lp-principio">
                  <span className="lp-principio-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                  <h3 className="lp-h3">{titulo}</h3>
                  <p>{texto}</p>
                </Revelar>
              ))}
            </ol>
          </div>
        </section>

        <section className="lp-sobre-secao lp-sobre-equipe" aria-labelledby="sobre-equipe">
          <div className="lp-largura">
            <div className="lp-cabecalho-secao">
              <Revelar as="h2" id="sobre-equipe" className="lp-h2">Quem faz</Revelar>
              <Revelar as="p" atraso={120} className="lp-lede">
                Um time pequeno que cuida de tudo: das telas ao banco de dados, do site ao app para celular.
              </Revelar>
            </div>
            <Rostos />
            <ol className="lp-membros">
              {EQUIPE.map((p, i) => <Membro key={p.github} {...p} indice={i} />)}
            </ol>
          </div>
        </section>

        <section className="lp-sobre-secao" aria-labelledby="sobre-caminho">
          <div className="lp-largura">
            <Revelar as="h2" id="sobre-caminho" className="lp-h2 lp-cabecalho-secao">Como chegamos aqui</Revelar>
            <ol className="lp-caminho">
              {CAMINHO.map(([quando, titulo, texto], i) => (
                <Revelar as="li" key={quando} atraso={i * 120} className="lp-etapa">
                  <span className="lp-etapa-quando">{quando}</span>
                  <h3 className="lp-etapa-titulo">{titulo}</h3>
                  <p>{texto}</p>
                </Revelar>
              ))}
            </ol>
          </div>
        </section>

        <ChamadaFinal />
      </main>
      <footer className="lp-rodape" data-escuro>
        <div className="lp-largura lp-rodape-interno">
          <span className="lp-nav-marca"><img src="/Logo.png" alt="" width="24" height="24" /><span>Levit</span></span>
          <nav aria-label="Rodapé" className="lp-rodape-links">
            <Link to="/">O produto</Link>
            <Link to="/login">Entrar</Link>
            <Link to="/register">Criar conta</Link>
          </nav>
          <p>© 2026 Levit</p>
        </div>
      </footer>
    </div>
  );
}
