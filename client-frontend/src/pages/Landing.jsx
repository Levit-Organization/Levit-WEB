import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import '@fontsource-variable/archivo/wdth.css';
import './Landing.css';
import HeroProduto from '../components/landing/HeroProduto';
import FaixaCasos from '../components/landing/FaixaCasos';
import TourProduto from '../components/landing/TourProduto';
import FluxoAutomacao from '../components/landing/FluxoAutomacao';
import Comparacao from '../components/landing/Comparacao';
import Numeros from '../components/landing/Numeros';
import Duvidas from '../components/landing/Duvidas';
import { BotaoCta, Revelar, TituloRevelado } from '../components/landing/primitivos';
import { useNaTela, useProgressoNoScroll } from '../components/landing/motion';

const SECOES = [
  { id: 'produto', nome: 'O que faz' },
  { id: 'automacoes', nome: 'Automações' },
  { id: 'duvidas', nome: 'Dúvidas' },
];

function irPara(evento, id) {
  evento.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** Seção da página que está sob o meio da tela, para acender o link certo do menu. */
function useSecaoAtual() {
  const [atual, setAtual] = useState(null);
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return undefined;
    const obs = new IntersectionObserver(
      (entradas) => entradas.forEach((e) => e.isIntersecting && setAtual(e.target.id)),
      { rootMargin: '-50% 0px -50% 0px' }
    );
    SECOES.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    const topo = document.getElementById('inicio');
    if (topo) obs.observe(topo);
    return () => obs.disconnect();
  }, []);
  return atual;
}

/** true quando a faixa logo abaixo do menu está sobre uma seção escura. */
function useMenuSobreEscuro() {
  const [escuro, setEscuro] = useState(false);
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return undefined;
    const visiveis = new Set();
    const obs = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((e) => (e.isIntersecting ? visiveis.add(e.target) : visiveis.delete(e.target)));
        setEscuro(visiveis.size > 0);
      },
      // Só a faixa de 1px na altura do menu conta.
      { rootMargin: '-34px 0px -100% 0px' }
    );
    document.querySelectorAll('[data-escuro]').forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);
  return escuro;
}

function Navegacao() {
  const [rolou, setRolou] = useState(false);
  const atual = useSecaoAtual();
  const escuro = useMenuSobreEscuro();

  useEffect(() => {
    const aoRolar = () => setRolou(window.scrollY > 12);
    aoRolar();
    window.addEventListener('scroll', aoRolar, { passive: true });
    return () => window.removeEventListener('scroll', aoRolar);
  }, []);

  return (
    <header className={`lp-nav ${rolou ? 'is-rolou' : ''} ${escuro ? 'is-escuro' : ''}`}>
      <div className="lp-nav-interno">
        <a href="#inicio" className="lp-nav-marca" onClick={(e) => irPara(e, 'inicio')}>
          <img src="/Logo.png" alt="" width="28" height="28" />
          <span>Levit</span>
        </a>

        <nav className="lp-nav-links" aria-label="Seções da página">
          {SECOES.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={(e) => irPara(e, s.id)}
              className={atual === s.id ? 'is-atual' : ''}
              aria-current={atual === s.id ? 'location' : undefined}
            >
              {s.nome}
            </a>
          ))}
          <Link to="/sobre">Sobre nós</Link>
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

function Hero() {
  const ref = useRef(null);
  // Ao rolar para fora, o produto encolhe e afunda um pouco (passagem de cena).
  useProgressoNoScroll(ref);

  return (
    <section ref={ref} id="inicio" className="lp-hero" aria-labelledby="hero-titulo">
      <div className="lp-hero-texto">
        <TituloRevelado
          as="h1"
          texto="Sua empresa inteira em um só lugar."
          destaque={['lugar']}
          className="lp-h1"
        />
        <Revelar as="p" atraso={520} className="lp-hero-lede lp-entrada">
          Tabelas, quadros de tarefas, e-mails e equipe juntos, em vez de espalhados entre planilhas, mensagens
          e caixa de entrada. Você organiza do jeito que a sua empresa trabalha, sem precisar programar.
        </Revelar>
        <Revelar atraso={640} className="lp-hero-acoes lp-entrada">
          <BotaoCta to="/register" magnetico>Criar conta grátis</BotaoCta>
          <BotaoCta href="#produto" variante="contorno" icone="south" onClick={(e) => irPara(e, 'produto')}>
            Ver como funciona
          </BotaoCta>
        </Revelar>
        <Revelar as="p" atraso={760} className="lp-hero-nota lp-entrada">
          Conta grátis, sem cartão de crédito.
        </Revelar>
      </div>

      <div className="lp-hero-produto lp-entrada" style={{ '--atraso': '300ms' }}>
        <HeroProduto />
      </div>
    </section>
  );
}

function ChamadaFinal() {
  const ref = useRef(null);
  const visivel = useNaTela(ref, { margem: '0px 0px -25% 0px' });
  return (
    <section ref={ref} className="lp-final" data-escuro aria-labelledby="final-titulo">
      <div className="lp-largura lp-final-interno">
        <TituloRevelado as="h2" texto="Comece pelo primeiro passo hoje." destaque={['hoje']} className="lp-final-titulo" ativo={visivel} />
        <div className="lp-final-acoes">
          <BotaoCta to="/register" variante="claro" magnetico>Criar conta grátis</BotaoCta>
          <Link to="/login" className="lp-final-entrar">Já tenho conta</Link>
        </div>
      </div>
    </section>
  );
}

export default function Landing() {
  return (
    <div className="lp">
      <a href="#produto" className="lp-pular" onClick={(e) => irPara(e, 'produto')}>Pular para o conteúdo</a>
      <Navegacao />
      <main>
        <Hero />
        <FaixaCasos />
        <TourProduto />
        <FluxoAutomacao />
        <Comparacao />
        <Numeros />
        <Duvidas />
        <ChamadaFinal />
      </main>
      <footer className="lp-rodape" data-escuro>
        <div className="lp-largura lp-rodape-interno">
          <span className="lp-nav-marca"><img src="/Logo.png" alt="" width="24" height="24" /><span>Levit</span></span>
          <nav aria-label="Rodapé" className="lp-rodape-links">
            <Link to="/sobre">Sobre nós</Link>
            <Link to="/login">Entrar</Link>
            <Link to="/register">Criar conta</Link>
          </nav>
          <p>© 2026 Levit</p>
        </div>
      </footer>
    </div>
  );
}
