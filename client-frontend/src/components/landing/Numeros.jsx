import { useRef } from 'react';
import { useContagem, useNaTela } from './motion';

/** Números verdadeiros do produto, não métricas de marketing. */
const NUMEROS = [
  { valor: 3, rotulo: 'níveis de acesso por tabela: só ver, editar ou cuidar de tudo' },
  { valor: 5, rotulo: 'tipos de tarefa que o Levit faz sozinho' },
  { valor: 10, rotulo: 'regras que você pode juntar numa mesma tarefa automática' },
  { valor: 0, rotulo: 'linhas de código para montar tudo isso' },
];

function Numero({ valor, rotulo, ativo }) {
  const atual = useContagem(valor, ativo);
  return (
    <li className="lp-numero">
      <span className="lp-numero-valor">{atual}</span>
      <span className="lp-numero-rotulo">{rotulo}</span>
    </li>
  );
}

export default function Numeros() {
  const ref = useRef(null);
  const visivel = useNaTela(ref);
  return (
    <section ref={ref} className="lp-numeros" aria-label="O Levit em números">
      <ul className="lp-largura lp-numeros-grade">
        {NUMEROS.map((n) => <Numero key={n.rotulo} {...n} ativo={visivel} />)}
      </ul>
    </section>
  );
}
