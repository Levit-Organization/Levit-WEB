import { useId, useState } from 'react';
import { Revelar } from './primitivos';

const PERGUNTAS = [
  ['Para que serve o Levit?', 'Para juntar num lugar só o que hoje fica espalhado: as planilhas da empresa, os quadros de tarefas, os avisos por e-mail e quem da equipe pode ver cada coisa.'],
  ['Preciso saber programar?', 'Não. Você cria tabelas escolhendo as colunas, convida a equipe e liga as tarefas automáticas preenchendo formulários simples.'],
  ['O que eu consigo organizar?', 'Tudo o que hoje vive em planilhas, e-mails e mensagens: clientes, pedidos, estoque, pedidos internos, contratos. Cada tabela tem as colunas que você escolher, e para contratações há um quadro com as etapas de cada vaga.'],
  ['Como funciona o acesso da equipe?', 'Você convida cada pessoa por e-mail e escolhe o cargo dela. Em cada tabela, o cargo pode só ver, editar ou cuidar de tudo, ou nem ver a tabela.'],
  ['O que o Levit faz sozinho?', 'Quando algo muda (uma informação nova, editada ou apagada, ou um candidato que muda de etapa), o Levit pode avisar pessoas, mandar e-mail, avisar outro sistema que vocês usam, preencher uma coluna ou criar um item em outra tabela. Antes de ligar, você testa para ver como fica.'],
  ['Meus dados ficam separados de outras empresas?', 'Sim. Cada empresa tem um espaço próprio, e só quem você convida acessa.'],
  ['Quanto custa para começar?', 'Criar a conta é grátis e não pede cartão de crédito.'],
];

function Pergunta({ pergunta, resposta }) {
  const [aberta, setAberta] = useState(false);
  const id = useId();
  return (
    <li className={`lp-pergunta ${aberta ? 'is-aberta' : ''}`}>
      <h3>
        <button type="button" aria-expanded={aberta} aria-controls={id} onClick={() => setAberta((v) => !v)}>
          {pergunta}
          <span className="lp-pergunta-sinal" aria-hidden="true"><i /><i /></span>
        </button>
      </h3>
      <div id={id} className="lp-resposta" role="region" aria-label={pergunta}>
        <div><p>{resposta}</p></div>
      </div>
    </li>
  );
}

export default function Duvidas() {
  return (
    <section id="duvidas" className="lp-duvidas" aria-labelledby="duvidas-titulo">
      <div className="lp-largura lp-duvidas-grade">
        <Revelar as="h2" id="duvidas-titulo" className="lp-h2">Perguntas frequentes</Revelar>
        <ul className="lp-perguntas">
          {PERGUNTAS.map(([p, r]) => <Pergunta key={p} pergunta={p} resposta={r} />)}
        </ul>
      </div>
    </section>
  );
}
