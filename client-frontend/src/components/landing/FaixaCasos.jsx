import { useEffect, useRef } from 'react';
import { useMovimentoReduzido, useNaTela, velocidadeDoScroll } from './motion';

const CASOS = [
  ['handshake', 'Clientes e vendas'],
  ['person_search', 'Contratações'],
  ['inventory_2', 'Controle de estoque'],
  ['support_agent', 'Pedidos internos'],
  ['badge', 'Novos funcionários'],
  ['description', 'Contratos'],
  ['local_shipping', 'Frota e entregas'],
  ['event', 'Agenda de eventos'],
  ['build', 'Ordens de serviço'],
  ['payments', 'Contas a pagar'],
];

const VELOCIDADE_BASE = 0.45; // px por frame

/**
 * Faixa contínua com o que dá para montar. Anda devagar sozinha e acelera
 * conforme a pessoa rola a página (e no sentido do scroll), voltando ao ritmo
 * normal aos poucos.
 */
export default function FaixaCasos() {
  const ref = useRef(null);
  const trilho = useRef(null);
  const reduzido = useMovimentoReduzido();
  const visivel = useNaTela(ref, { margem: '0px', umaVez: false });

  useEffect(() => {
    if (reduzido || !visivel) return undefined;
    const el = trilho.current;
    let x = Number(el.dataset.x || 0);
    let extra = 0;
    let quadro;

    const passo = () => {
      extra = extra * 0.92 + velocidadeDoScroll() * 0.06;
      const metade = el.scrollWidth / 2;
      x -= VELOCIDADE_BASE + Math.max(-6, Math.min(6, extra));
      if (x <= -metade) x += metade;
      if (x > 0) x -= metade;
      el.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;
      el.dataset.x = x;
      quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [reduzido, visivel]);

  const itens = (copia) =>
    CASOS.map(([icone, nome]) => (
      <li key={`${nome}-${copia}`} className="lp-caso" aria-hidden={copia ? 'true' : undefined}>
        <span className="material-icons" aria-hidden="true">{icone}</span>
        {nome}
      </li>
    ));

  return (
    <section ref={ref} className="lp-faixa" aria-label="Exemplos do que você organiza no Levit no Levit">
      <p className="lp-faixa-rotulo">Exemplos do que você organiza no Levit</p>
      <div className="lp-faixa-janela">
        <ul ref={trilho} className={`lp-faixa-trilho ${reduzido ? 'is-parado' : ''}`}>
          {itens(false)}
          {!reduzido && itens(true)}
        </ul>
      </div>
    </section>
  );
}
