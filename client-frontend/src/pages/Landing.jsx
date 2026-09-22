import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './Landing.css';

/**
 * Realça um bloco já visível por padrão (evita ships em branco se o
 * IntersectionObserver não disparar — aba oculta, crawler, etc.):
 * só se pré-esconde depois de montado, e apenas se já estiver fora
 * da viewport nesse momento.
 */
function Reveal({ as: Tag = 'div', className = '', children, ...rest }) {
  const ref = useRef(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.85) return undefined;

    setPending(true);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPending(false);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag ref={ref} className={`landing-reveal ${pending ? 'landing-reveal-pending' : ''} ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

function HeroPreview() {
  return (
    <div className="hero-browser-frame">
      <div className="hero-browser-topbar">
        <div className="hero-browser-dot"></div>
        <div className="hero-browser-dot"></div>
        <div className="hero-browser-dot"></div>
      </div>

      <div className="hero-app-shell">
        <div className="hero-app-sidebar">
          <div>
            <div className="hero-app-logo">
              <div className="hero-app-logo-mark"></div>
              <div className="hero-app-logo-bar"></div>
            </div>

            <div className="hero-app-nav">
              <div className="hero-app-nav-item hero-nav-modulos">
                <div className="highlight"><div className="bar"></div></div>
                <div className="bar" style={{ width: 40 }}></div>
              </div>
              <div className="hero-app-nav-item hero-nav-recrutamento">
                <div className="highlight"><div className="bar"></div></div>
                <div className="bar"></div>
              </div>
              <div className="hero-app-nav-item hero-nav-automacoes">
                <div className="highlight"><div className="bar"></div></div>
                <div className="bar"></div>
              </div>
            </div>
          </div>

          <div className="hero-app-profile">
            <div className="hero-app-avatar"></div>
            <div className="hero-app-profile-lines">
              <div className="line"></div>
              <div className="line" style={{ width: 28 }}></div>
            </div>
          </div>
        </div>

        <div className="hero-app-main">
          <div className="hero-app-header-row">
            <div className="hero-app-title"></div>
            <div className="hero-app-cta"></div>
          </div>

          {/* Cena 1: Módulos (linhas longas e finas, como os cards reais) */}
          <div className="hero-scene hero-scene-1">
            <div className="hero-list">
              <div className="hero-list-row"><div className="icon"></div><div className="line"></div></div>
              <div className="hero-list-row"><div className="icon"></div><div className="line"></div></div>
              <div className="hero-list-row"><div className="icon"></div><div className="line"></div></div>
              <div className="hero-list-row"><div className="icon"></div><div className="line"></div></div>
            </div>
          </div>

          {/* Cena 2: Recrutamento (Kanban) */}
          <div className="hero-scene hero-scene-2">
            <div className="hero-kanban-cols">
              <div className="hero-kanban-col">
                <div className="hero-kanban-col-label"></div>
                <div className="hero-kanban-card"><div className="line"></div><div className="line"></div></div>
              </div>
              <div className="hero-kanban-col">
                <div className="hero-kanban-col-label"></div>
              </div>
              <div className="hero-kanban-col">
                <div className="hero-kanban-col-label"></div>
                <div className="hero-kanban-card"><div className="line"></div><div className="line"></div></div>
              </div>
              <div className="hero-moving-card"><div className="line"></div><div className="line"></div></div>
              <div className="hero-cursor"></div>
            </div>
          </div>

          {/* Cena 3: Automações (lista com toggles) */}
          <div className="hero-scene hero-scene-3">
            <div className="hero-list">
              <div className="hero-list-row">
                <div className="icon icon-soft"></div><div className="line"></div>
                <div className="toggle toggle-on"><div className="dot"></div></div>
              </div>
              <div className="hero-list-row">
                <div className="icon icon-soft"></div><div className="line"></div>
                <div className="toggle"><div className="dot"></div></div>
              </div>
              <div className="hero-list-row">
                <div className="icon icon-soft"></div><div className="line"></div>
                <div className="toggle toggle-on"><div className="dot"></div></div>
              </div>
              <div className="hero-list-row">
                <div className="icon icon-soft"></div><div className="line"></div>
                <div className="toggle"><div className="dot"></div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureVisual({ type, startIndex }) {
  const rowStyle = (offset) => ({ '--build-i': startIndex + offset });

  if (type === 'modules') {
    return (
      <div className="feature-visual">
        <div className="hero-list">
          <div className="hero-list-row build-item" style={rowStyle(0)}><div className="icon"></div><div className="line"></div></div>
          <div className="hero-list-row build-item" style={rowStyle(1)}><div className="icon"></div><div className="line"></div></div>
          <div className="hero-list-row build-item" style={rowStyle(2)}><div className="icon"></div><div className="line"></div></div>
        </div>
      </div>
    );
  }

  if (type === 'kanban') {
    return (
      <div className="feature-visual">
        <div className="hero-kanban-cols">
          <div className="hero-kanban-col">
            <div className="hero-kanban-col-label"></div>
            <div className="hero-kanban-card"><div className="line"></div><div className="line"></div></div>
          </div>
          <div className="hero-kanban-col"><div className="hero-kanban-col-label"></div></div>
          <div className="hero-kanban-col">
            <div className="hero-kanban-col-label"></div>
            <div className="hero-kanban-card"><div className="line"></div><div className="line"></div></div>
          </div>
          <div className="hero-moving-card"><div className="line"></div><div className="line"></div></div>
          <div className="hero-cursor"></div>
        </div>
      </div>
    );
  }

  if (type === 'team') {
    return (
      <div className="feature-visual">
        <div className="hero-list">
          <div className="hero-list-row build-item" style={rowStyle(0)}>
            <div className="icon"></div><div className="line"></div>
            <div className="level"><span className="filled"></span><span></span><span></span></div>
          </div>
          <div className="hero-list-row build-item" style={rowStyle(1)}>
            <div className="icon"></div><div className="line"></div>
            <div className="level"><span className="filled"></span><span className="filled"></span><span></span></div>
          </div>
          <div className="hero-list-row build-item" style={rowStyle(2)}>
            <div className="icon"></div><div className="line"></div>
            <div className="level"><span className="filled"></span><span className="filled"></span><span className="filled"></span></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="feature-visual build-item" style={{ '--build-i': startIndex - 1 }}>
      <div className="hero-list">
        <div className="hero-list-row build-item" style={rowStyle(0)}>
          <div className="icon icon-soft"></div><div className="line"></div>
          <div className="toggle toggle-on"><div className="dot"></div></div>
        </div>
        <div className="hero-list-row build-item" style={rowStyle(1)}>
          <div className="icon icon-soft"></div><div className="line"></div>
          <div className="toggle"><div className="dot"></div></div>
        </div>
        <div className="hero-list-row build-item" style={rowStyle(2)}>
          <div className="icon icon-soft"></div><div className="line"></div>
          <div className="toggle toggle-on"><div className="dot"></div></div>
        </div>
      </div>
    </div>
  );
}

const FEATURES = [
  {
    visual: 'modules',
    title: 'Construtor de módulos',
    description: 'Crie tabelas, formulários e fluxos com os campos que seu processo precisa.',
  },
  {
    visual: 'kanban',
    title: 'Recrutamento em Kanban',
    description: 'Acompanhe candidatos fase a fase, do jeito que sua equipe de RH já pensa.',
  },
  {
    visual: 'team',
    title: 'Equipe & permissões',
    description: 'Defina, módulo por módulo, quem só visualiza, quem edita e quem gerencia.',
  },
  {
    visual: 'automations',
    title: 'Automações',
    description: 'Deixe tarefas repetitivas rodarem sozinhas quando algo muda.',
  },
];

const STEPS = [
  {
    title: 'Crie seu módulo',
    description: 'Defina os campos que sua equipe precisa rastrear.',
  },
  {
    title: 'Convide sua equipe',
    description: 'Cada pessoa entra com o nível de acesso certo.',
  },
  {
    title: 'Automatize o que for repetitivo',
    description: 'O sistema trabalha enquanto vocês focam no resto.',
  },
];

function scrollToHowItWorks(event) {
  event.preventDefault();
  document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' });
}

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="landing-page min-h-screen bg-white text-[#151515]">
      <header
        className={`landing-navbar sticky top-0 z-20 h-20 px-4 md:px-10 flex items-center justify-between bg-white border-b border-divider ${scrolled ? 'is-scrolled' : ''}`}
      >
        <div className="flex items-center gap-2 md:gap-3">
          <img src="/Logo.png" alt="Levit" className="h-8" />
          <span className="landing-display text-lg md:text-xl">Levit</span>
        </div>

        <div className="flex items-center gap-2 md:gap-6">
          <Link to="/login" className="landing-nav-link text-sm font-medium text-light-text hover:text-[#151515] transition-colors">
            Entrar
          </Link>
          <Link
            to="/register"
            className="landing-btn landing-btn-primary h-11 px-4 md:px-5 rounded-md bg-primary text-white text-sm font-semibold hover:bg-primary/90 flex items-center"
          >
            Criar conta<span className="hidden sm:inline"> grátis</span>
          </Link>
        </div>
      </header>

      <section className="landing-hero-bg px-6 md:px-10 pt-16 pb-20 md:pt-24 md:pb-28 max-w-7xl mx-auto">
        <div className="relative grid md:grid-cols-2 gap-12 items-center">
          <div className="hero-build">
            <h1 className="landing-display landing-hero-title">
              Organize o seu negócio e <span className="landing-highlight">Dobre</span> o seu lucro
            </h1>
            <p className="mt-5 text-base md:text-lg text-light-text leading-relaxed max-w-xl">
              Módulos personalizados, recrutamento, permissões por equipe e automações:
              tudo num só lugar, do jeito que o seu processo já funciona.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-6">
              <Link
                to="/register"
                className="landing-btn landing-btn-primary h-12 px-7 rounded-md bg-primary text-white text-sm font-semibold hover:bg-primary/90 flex items-center shadow-sm"
              >
                Criar conta grátis
              </Link>
              <a
                href="#como-funciona"
                onClick={scrollToHowItWorks}
                className="landing-nav-link text-sm font-semibold text-[#151515] hover:text-primary transition-colors flex items-center gap-1"
              >
                Ver como funciona
                <span className="material-icons text-[18px]">arrow_downward</span>
              </a>
            </div>
          </div>

          <div className="hero-build-visual">
            <HeroPreview />
          </div>
        </div>
      </section>

      <section className="landing-diagonal-top px-6 md:px-10 pb-24 md:pb-32 bg-background">
        <div className="max-w-6xl mx-auto">
          <Reveal as="h2" className="landing-display landing-section-title text-center">
            Tudo o que sua operação precisa, num só lugar
          </Reveal>

          <div className="mt-16 flex flex-col gap-16 md:gap-24">
            {FEATURES.map((feature, index) => (
              <Reveal
                key={feature.title}
                className={`feature-row ${index % 2 === 1 ? 'is-reversed' : ''}`}
              >
                <div className="feature-copy build-item" style={{ '--build-i': 0 }}>
                  <h3 className="landing-display text-2xl">{feature.title}</h3>
                  <p className="mt-3 text-base text-light-text leading-relaxed max-w-md">
                    {feature.description}
                  </p>
                </div>
                <div className="feature-visual-frame build-item" style={{ '--build-i': 1 }}>
                  <FeatureVisual type={feature.visual} startIndex={2} />
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="como-funciona" className="px-6 md:px-10 py-24 md:py-32 max-w-6xl mx-auto scroll-mt-20">
        <Reveal as="h2" className="landing-display landing-section-title text-center">
          Como funciona
        </Reveal>

        <Reveal as="div" className="steps-row mt-16 grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="steps-connector hidden md:block"></div>
          {STEPS.map((step, index) => (
            <div
              key={step.title}
              className="build-item relative text-center md:text-left"
              style={{ '--build-i': index }}
            >
              <div className="landing-step-badge w-14 h-14 rounded-full bg-primary text-white text-lg font-bold flex items-center justify-center mx-auto md:mx-0 relative z-10">
                {index + 1}
              </div>
              <h3 className="mt-4 font-bold text-base">{step.title}</h3>
              <p className="mt-2 text-sm text-light-text leading-relaxed">{step.description}</p>
            </div>
          ))}
        </Reveal>
      </section>

      <Reveal as="section" className="cta-band px-6 md:px-10 bg-primary">
        <div className="relative z-10 max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <h2 className="landing-display text-3xl md:text-[44px] text-white">
            Pronto pra montar o seu?
          </h2>
          <Link
            to="/register"
            className="landing-btn h-12 px-7 rounded-md bg-white text-primary text-sm font-semibold hover:bg-white/90 flex items-center shrink-0"
          >
            Criar conta grátis
          </Link>
        </div>
      </Reveal>

      <footer className="px-6 md:px-10 py-10 border-t border-divider">
        <div className="max-w-7xl mx-auto flex items-center justify-center sm:justify-start gap-3">
          <img src="/Logo.png" alt="Levit" className="h-6" />
          <span className="landing-display text-base">Levit</span>
          <span className="text-sm text-light-text">© 2026 Levit</span>
        </div>
      </footer>
    </div>
  );
}
