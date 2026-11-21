import { useEffect, useRef, useState } from 'react';
import { useMovimentoReduzido, useNaTela } from './motion';
import { Revelar } from './primitivos';

const LINHAS = [
  ['Cada pessoa edita a planilha inteira', 'Cada pessoa vê e edita só o que o cargo permite'],
  ['Alguém precisa lembrar de avisar o colega', 'O Levit avisa a pessoa certa na hora'],
  ['Uma coluna renomeada quebra as fórmulas', 'Cada coluna aceita só o que deve: número, data ou opção'],
  ['Candidatos espalhados entre e-mails e abas', 'Cada vaga com o seu quadro e o histórico de cada candidato'],
];

/**
 * Comparação com a planilha, que é a alternativa real de quem chega aqui. Ao
 * entrar na tela, troca sozinha uma vez para o Levit (mostrando a mudança);
 * depois quem decide é a pessoa.
 */
export default function Comparacao() {
  const ref = useRef(null);
  const reduzido = useMovimentoReduzido();
  const visivel = useNaTela(ref, { margem: '0px 0px -35% 0px' });
  const [escolhido, setEscolhido] = useState(null); // o que a pessoa clicou
  const [trocouSozinho, setTrocouSozinho] = useState(false);

  useEffect(() => {
    if (!visivel || reduzido || escolhido !== null) return undefined;
    const t = setTimeout(() => setTrocouSozinho(true), 1100);
    return () => clearTimeout(t);
  }, [visivel, reduzido, escolhido]);

  // Com movimento reduzido não há troca animada: mostra direto o Levit.
  const lado = escolhido ?? (visivel && (reduzido || trocouSozinho) ? 'levit' : 'planilha');
  const escolher = setEscolhido;

  return (
    <section ref={ref} className="lp-comparacao" aria-labelledby="comparacao-titulo">
      <div className="lp-largura lp-comparacao-grade">
        <div>
          <Revelar as="h2" id="comparacao-titulo" className="lp-h2">Saia da planilha sem perder o controle.</Revelar>
          <Revelar as="p" atraso={80} className="lp-lede">
            Planilha, e-mail e grupo de mensagens funcionam até a equipe crescer. Depois, ninguém sabe onde está a informação certa.
          </Revelar>
          <div className="lp-alternador" role="group" aria-label="Comparar">
            <span className={`lp-alternador-polegar is-${lado}`} aria-hidden="true" />
            <button type="button" aria-pressed={lado === 'planilha'} onClick={() => escolher('planilha')}>Na planilha</button>
            <button type="button" aria-pressed={lado === 'levit'} onClick={() => escolher('levit')}>No Levit</button>
          </div>
        </div>

        <ul className={`lp-comparacao-lista is-${lado}`} aria-live="polite">
          {LINHAS.map(([antes, depois], i) => (
            <li key={antes} style={{ '--i': i }}>
              <span className="material-icons lp-comparacao-icone" aria-hidden="true">
                {lado === 'levit' ? 'check_circle' : 'remove_circle_outline'}
              </span>
              <span className="lp-comparacao-texto">
                <span className={`lp-comparacao-frase ${lado === 'planilha' ? 'is-visivel' : ''}`} aria-hidden={lado !== 'planilha'}>{antes}</span>
                <span className={`lp-comparacao-frase ${lado === 'levit' ? 'is-visivel' : ''}`} aria-hidden={lado !== 'levit'}>{depois}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
