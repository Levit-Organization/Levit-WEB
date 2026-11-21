import { Fragment, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMovimentoReduzido } from './motion';

/**
 * Revela o bloco ao entrar na tela. É defensivo: começa visível e só se
 * esconde depois de montado, e apenas se já estiver fora da viewport (crawler,
 * aba oculta ou JS lento nunca deixam a seção em branco).
 */
export function Revelar({ as: Tag = 'div', className = '', atraso = 0, children, ...rest }) {
  const ref = useRef(null);
  const reduzido = useMovimentoReduzido();
  const [pendente, setPendente] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || reduzido || !('IntersectionObserver' in window)) return undefined;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return undefined;

    setPendente(true);
    const obs = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setPendente(false);
          obs.disconnect();
        }
      },
      { rootMargin: '0px 0px -12% 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [reduzido]);

  return (
    <Tag
      ref={ref}
      className={`lp-revelar ${pendente ? 'is-pendente' : ''} ${className}`}
      style={{ '--atraso': `${atraso}ms` }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/**
 * Título que sobe palavra por palavra de dentro de uma máscara. O texto
 * completo fica no aria-label: leitor de tela lê a frase, não os pedaços.
 * `destaque`: palavras (sem pontuação) que ganham a cor da marca.
 */
export function TituloRevelado({ as: Tag = 'h1', texto, destaque = [], className = '', atrasoBase = 0, ativo = true }) {
  const palavras = texto.split(' ');

  return (
    <Tag className={`lp-titulo-revelado ${ativo ? 'is-ativo' : ''} ${className}`} aria-label={texto}>
      {palavras.map((palavra, i) => (
        // O espaço fica fora do bloco mascarado: dentro de um inline-block ele é descartado.
        <Fragment key={`${palavra}-${i}`}>
          <span className="lp-palavra" aria-hidden="true">
            <span
              className={`lp-palavra-interna ${destaque.includes(palavra.replace(/[.,!?]/g, '')) ? 'is-destaque' : ''}`}
              style={{ '--i': i, '--base': `${atrasoBase}ms` }}
            >
              {palavra}
            </span>
          </span>
          {i < palavras.length - 1 ? ' ' : null}
        </Fragment>
      ))}
    </Tag>
  );
}

/**
 * Botão de conversão: o rótulo é trocado por uma cópia que sobe no hover
 * (troca de estado, não só de cor) e, no desktop, o botão é levemente
 * atraído pelo ponteiro.
 */
export function BotaoCta({ to, href, onClick, variante = 'primario', tamanho = 'grande', icone = 'arrow_forward', magnetico = false, children, className = '' }) {
  const ref = useRef(null);
  const reduzido = useMovimentoReduzido();

  const mover = (e) => {
    if (!magnetico || reduzido || e.pointerType !== 'mouse') return;
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - (r.left + r.width / 2)) * 0.18;
    const y = (e.clientY - (r.top + r.height / 2)) * 0.28;
    ref.current.style.setProperty('--mx', `${x.toFixed(1)}px`);
    ref.current.style.setProperty('--my', `${y.toFixed(1)}px`);
  };
  const soltar = () => {
    ref.current?.style.setProperty('--mx', '0px');
    ref.current?.style.setProperty('--my', '0px');
  };

  const conteudo = (
    <>
      <span className="lp-cta-rotulos">
        <span className="lp-cta-rotulo">{children}</span>
        <span className="lp-cta-rotulo is-copia" aria-hidden="true">{children}</span>
      </span>
      {icone && (
        <span className="lp-cta-icone" aria-hidden="true">
          <span className="material-icons">{icone}</span>
          <span className="material-icons is-copia">{icone}</span>
        </span>
      )}
    </>
  );

  const props = {
    ref,
    className: `lp-cta is-${variante} is-${tamanho} ${className}`,
    onPointerMove: mover,
    onPointerLeave: soltar,
    onClick,
  };

  if (to) return <Link to={to} {...props}>{conteudo}</Link>;
  return <a href={href} {...props}>{conteudo}</a>;
}
