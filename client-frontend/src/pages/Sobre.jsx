import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import '@fontsource-variable/archivo/wdth.css';
import './Landing.css';
import { BotaoCta, Revelar, TituloRevelado } from '../components/landing/primitivos';
import { useNaTela } from '../components/landing/motion';

/** Quem faz o Levit. Nome e foto vêm do perfil público no GitHub. */
const EQUIPE = [
  { nome: 'Cauã Rosa do Espírito Santo', papel: 'Front-end e design', github: 'cauaresdev' },
  { nome: 'Thiago de Aguiar da Silva', papel: 'Front-end', github: 'Thigasprogrammer' },
  { nome: 'Guilherme Villas Boas Braz', papel: 'Back-end e API', github: 'GuiVillas' },
  { nome: 'Guilherme Brandão Costa', papel: 'Banco de dados', github: 'gbrandev' },
  { nome: 'Andriy Gabriel', papel: 'App para celular', github: 'AndriyBrine' },
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

function Pessoa({ nome, papel, github, atraso }) {
  const [semFoto, setSemFoto] = useState(false);
  return (
    <Revelar as="li" atraso={atraso} className="lp-pessoa">
      <div className="lp-pessoa-foto">
        {semFoto ? (
          <span aria-hidden="true">{iniciais(nome)}</span>
        ) : (
          <img
            src={`https://github.com/${github}.png?size=320`}
            alt=""
            width="160"
            height="160"
            loading="lazy"
            onError={() => setSemFoto(true)}
          />
        )}
      </div>
      <p className="lp-pessoa-nome">{nome}</p>
      <p className="lp-pessoa-papel">{papel}</p>
      <a className="lp-pessoa-link" href={`https://github.com/${github}`} target="_blank" rel="noreferrer">
        @{github}
        <span className="sr-only"> no GitHub (abre em nova aba)</span>
      </a>
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
            <ul className="lp-pessoas">
              {EQUIPE.map((p, i) => <Pessoa key={p.github} {...p} atraso={i * 90} />)}
            </ul>
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
