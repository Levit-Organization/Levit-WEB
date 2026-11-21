import { useState } from 'react';
import { Modal, Select, Alert, Badge, Skeleton, Button } from '../ui';
import { useRegistros, useSimulacao } from '../../hooks/queries';
import { mensagemDeErro } from '../../lib/queryClient';
import { acaoLabel, rotuloRegistro, OPERADORES_DE_MUDANCA } from '../../utils/automacaoConstants';

const SEM_DADOS = [];

function Previa({ passo }) {
  if (passo.status === 'erro') {
    return <Alert variant="error">{passo.mensagem}</Alert>;
  }

  const { previa } = passo;
  if (previa.tipo === 'atualizar_campo') {
    return (
      <p className="text-sm text-ink">
        A coluna <strong>{previa.campo}</strong>{' '}
        {previa.valor === '' ? 'seria esvaziado.' : <>passaria a ser <strong className="break-words">“{previa.valor}”</strong>.</>}
      </p>
    );
  }

  if (previa.tipo === 'criar_registro') {
    return (
      <div className="flex flex-col gap-2 text-sm">
        <p className="text-ink">
          Novo item em <strong>{previa.modulo}</strong>:
        </p>
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 rounded-md bg-background px-3 py-2">
          {Object.entries(previa.dados || {}).map(([campo, valor]) => (
            <div key={campo} className="contents">
              <dt className="text-light-text">{campo}</dt>
              <dd className="text-ink break-words">{valor}</dd>
            </div>
          ))}
        </dl>
      </div>
    );
  }

  if (previa.tipo === 'notificacao') {
    return (
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
        <dt className="text-light-text">Para</dt>
        <dd className="text-ink">
          {previa.destinatarios} {previa.destinatarios === 1 ? 'pessoa' : 'pessoas'} com acesso ao módulo
        </dd>
        <dt className="text-light-text">Título</dt>
        <dd className="text-ink font-medium break-words">{previa.titulo}</dd>
        {previa.mensagem && (
          <>
            <dt className="text-light-text">Mensagem</dt>
            <dd className="text-ink whitespace-pre-wrap break-words">{previa.mensagem}</dd>
          </>
        )}
      </dl>
    );
  }

  if (previa.tipo === 'enviar_email') {
    return (
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
        <dt className="text-light-text">Para</dt>
        <dd className="text-ink break-all">{previa.destinatario}</dd>
        <dt className="text-light-text">Assunto</dt>
        <dd className="text-ink break-words">{previa.assunto || <em className="text-faint">vazio</em>}</dd>
        <dt className="text-light-text">Mensagem</dt>
        {/* Texto puro de propósito: nunca renderiza HTML vindo dos dados do registro. */}
        <dd className="text-ink whitespace-pre-wrap break-words rounded-md bg-background px-3 py-2">{previa.corpo}</dd>
      </dl>
    );
  }

  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
      <dt className="text-light-text">POST</dt>
      <dd className="text-ink break-all">{previa.url}</dd>
      <dt className="text-light-text">Corpo</dt>
      <dd>
        <pre className="text-xs text-ink bg-background rounded-md px-3 py-2 overflow-x-auto max-h-48">
          {JSON.stringify(previa.payload, null, 2)}
        </pre>
      </dd>
    </dl>
  );
}

/**
 * Mostra o que a automação faria com um registro real do módulo, sem enviar
 * e-mail nem chamar webhook. Funciona com a definição ainda não salva.
 */
export default function SimulacaoModal({ open, onClose, moduloId, definicao, vaga = false }) {
  const [registroId, setRegistroId] = useState('');
  // Em vagas a prévia usa o candidato mais recente: não há registros para escolher.
  const registros = (useRegistros(open && !vaga ? moduloId : undefined).data ?? SEM_DADOS).slice(0, 50);
  const usaMudanca = (definicao?.condicoes?.regras || []).some((r) => OPERADORES_DE_MUDANCA.includes(r.operador));
  const simulacao = useSimulacao(moduloId, definicao, registroId, { enabled: open });
  const resultado = simulacao.data;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Testar automação"
      subtitle="Nada é enviado: é só uma prévia com dados reais."
      maxWidth="xl"
      footer={<Button variant="secondary" onClick={onClose}>Fechar</Button>}
    >
      <div className="flex flex-col gap-5">
        {vaga ? (
          <p className="text-sm text-ink-soft">Prévia com o candidato mais recente desta vaga.</p>
        ) : (
          <Select
            label="Item de exemplo"
            value={registroId}
            onChange={(e) => setRegistroId(e.target.value)}
            options={[
              { value: '', label: 'Mais recente da tabela' },
              ...registros.map((r) => ({ value: r.id, label: rotuloRegistro(r) })),
            ]}
          />
        )}

        {simulacao.isLoading ? (
          <div className="flex flex-col gap-2" aria-busy="true">
            <Skeleton className="h-8 rounded-md" />
            <Skeleton className="h-28 rounded-lg" />
          </div>
        ) : simulacao.isError ? (
          <Alert variant="error">{mensagemDeErro(simulacao.error, 'Não foi possível testar a automação.')}</Alert>
        ) : resultado ? (
          <div className="flex flex-col gap-4" aria-live="polite">
            {!vaga && !resultado.registro_id && Object.keys(resultado.dados || {}).length === 0 && (
              <Alert variant="info">A tabela ainda não tem itens: a prévia usa dados vazios.</Alert>
            )}
            {vaga && !resultado.dados?.nome && (
              <Alert variant="info">A vaga ainda não tem candidatos: a prévia usa dados vazios.</Alert>
            )}

            {usaMudanca && (
              <Alert variant="info">
                Há condições de mudança. No teste, consideramos que o valor anterior estava vazio
                {vaga ? ' (o candidato acabou de entrar na etapa atual).' : '.'}
              </Alert>
            )}

            <div className="flex items-center gap-2 text-sm">
              <span className="text-ink-soft">Condição:</span>
              {resultado.condicao_atendida ? (
                <Badge variant="success" icon="check">atendida — a automação dispararia</Badge>
              ) : (
                <Badge variant="warning" icon="block">não atendida — nada aconteceria</Badge>
              )}
            </div>

            <ol className="flex flex-col gap-3">
              {resultado.passos.map((passo) => (
                <li key={passo.indice} className="rounded-lg border border-divider p-4 flex flex-col gap-3">
                  <p className="text-sm font-semibold text-ink">
                    Ação {passo.indice + 1}: {acaoLabel(passo.tipo)}
                  </p>
                  <Previa passo={passo} />
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
