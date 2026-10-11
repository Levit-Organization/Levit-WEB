import { useCallback, useRef, useState } from 'react';
import { useProgressoNoScroll } from './motion';
import { Revelar } from './primitivos';

const NOS = [
  {
    rotulo: 'Quando',
    icone: 'bolt',
    titulo: 'Algo acontece',
    itens: ['Alguém adiciona, muda ou apaga uma informação', 'Um candidato se inscreve ou muda de etapa'],
  },
  {
    rotulo: 'Se',
    icone: 'filter_alt',
    titulo: 'É o caso certo',
    itens: ['O status virou “Fechado”', 'e o valor passa de 10.000'],
  },
  {
    rotulo: 'Então',
    icone: 'task_alt',
    titulo: 'O Levit faz por você',
    itens: ['Avisa as pessoas certas', 'Manda um e-mail ou avisa outro sistema que vocês usam', 'Preenche colunas ou cria tarefas'],
  },
];

const GARANTIAS = [
  ['science', 'Teste antes de ligar', 'Veja como ficam o e-mail e o aviso usando dados reais, sem mandar nada.'],
  ['history', 'Tudo fica registrado', 'Você vê o que foi feito, quando e se deu certo.'],
  ['autorenew', 'Se falhar, tenta de novo', 'Se outro sistema estiver fora do ar, o Levit tenta de novo e avisa se não conseguir.'],
];

/** Ponto do scroll (0–1) em que cada nó acende; as linhas crescem entre eles. */
const LIMIARES = [0.3, 0.42, 0.54];

export default function FluxoAutomacao() {
  const ref = useRef(null);
  const [acesos, setAcesos] = useState(0);

  const aoMudar = useCallback((p) => {
    const n = LIMIARES.filter((l) => p >= l).length;
    setAcesos((atual) => (atual === n ? atual : n));
  }, []);
  useProgressoNoScroll(ref, { aoMudar });

  return (
    <section ref={ref} id="automacoes" className="lp-automacao" aria-labelledby="automacao-titulo">
      <div className="lp-largura">
        <div className="lp-cabecalho-secao">
          <Revelar as="h2" id="automacao-titulo" className="lp-h2">Diga o que fazer uma vez. O Levit repete sempre.</Revelar>
          <Revelar as="p" atraso={80} className="lp-lede">
            Funciona como uma frase: quando algo acontecer, se for do jeito que você quer, faça isto.
          </Revelar>
        </div>

        <ol className="lp-fluxo">
          {NOS.map((no, i) => (
            <li key={no.rotulo} className={`lp-no ${i < acesos ? 'is-aceso' : ''}`}>
              {i > 0 && <span className="lp-conector" aria-hidden="true"><i /></span>}
              <div className="lp-no-cartao">
                <p className="lp-no-rotulo">
                  <span className="material-icons" aria-hidden="true">{no.icone}</span>
                  {no.rotulo}
                </p>
                <p className="lp-no-titulo">{no.titulo}</p>
                <ul className="lp-no-itens">
                  {no.itens.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            </li>
          ))}
        </ol>

        <ul className="lp-garantias">
          {GARANTIAS.map(([icone, titulo, texto], i) => (
            <Revelar as="li" key={titulo} atraso={i * 90} className="lp-garantia">
              <span className="material-icons" aria-hidden="true">{icone}</span>
              <div>
                <p className="lp-garantia-titulo">{titulo}</p>
                <p className="lp-garantia-texto">{texto}</p>
              </div>
            </Revelar>
          ))}
        </ul>
      </div>
    </section>
  );
}
