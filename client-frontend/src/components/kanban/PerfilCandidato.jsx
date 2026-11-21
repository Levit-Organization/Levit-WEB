import { useState } from 'react';
import { Avatar, Badge, Button, Select, tempoRelativo, estaParado } from '../ui';
import { recrutamentoService } from '../../services/recrutamentoService';
import { useToast } from '../../hooks/useFeedback';
import { mensagemDeErro } from '../../lib/queryClient';

/** Corpo do perfil: etapa, seletor para mover, contato, currículo e mensagem. */
export default function PerfilCandidato({ perfil, cor, colunas, podeMover, onMover }) {
  const { candidato, colId, fase } = perfil;
  const referencia = candidato.atualizado_em || candidato.criado_em;
  const toast = useToast();
  const [baixando, setBaixando] = useState(false);

  const baixarCurriculo = async () => {
    setBaixando(true);
    try {
      await recrutamentoService.baixarCurriculo(candidato.modulo_id, candidato);
    } catch (err) {
      toast.error(mensagemDeErro(err, 'Não foi possível baixar o currículo.'));
    } finally {
      setBaixando(false);
    }
  };

  const campos = [
    { label: 'E-mail', value: candidato.email, icon: 'mail_outline', href: candidato.email ? `mailto:${candidato.email}` : null },
    {
      label: 'Telefone',
      value: candidato.telefone,
      icon: 'call',
      href: candidato.telefone ? `tel:${candidato.telefone.replace(/[^\d+]/g, '')}` : null,
    },
  ];

  return (
    <>
      <div className="flex items-center gap-4 pb-5 border-b border-divider">
        <Avatar name={candidato.nome} size="xl" />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-2xs font-semibold ${cor?.bg || 'bg-primary-100'} ${cor?.text || 'text-primary'}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${cor?.dot || 'bg-primary'}`} />
              {fase}
            </span>
            {estaParado(referencia) && (
              <Badge variant="warning" size="sm" dot>Parado há mais de 14 dias</Badge>
            )}
          </div>
          <p className="text-xs text-light-text mt-1.5">
            Candidatou-se {tempoRelativo(candidato.criado_em) || '—'}
            {candidato.vaga ? ` · ${candidato.vaga}` : ''}
          </p>
        </div>
      </div>

      {/* Mover pela tela: alternativa ao arrastar, funciona no teclado e no toque. */}
      {podeMover && colunas.length > 1 && (
        <div className="py-4 border-b border-divider">
          <Select
            label="Etapa do quadro"
            name="etapa"
            icon="swap_horiz"
            value={colId}
            onChange={(e) => onMover(e.target.value)}
            options={colunas.map(([id, coluna]) => ({ value: id, label: coluna.fase || id }))}
          />
        </div>
      )}

      <dl className="divide-y divide-divider">
        {campos.map((campo) => (
          <div key={campo.label} className="flex items-center gap-3 py-3">
            <span className="material-icons text-[18px] text-light-text shrink-0" aria-hidden="true">{campo.icon}</span>
            <dt className="text-xs text-light-text w-32 shrink-0">{campo.label}</dt>
            <dd className="text-sm text-ink truncate min-w-0 flex-1">
              {campo.value ? (
                campo.href ? (
                  <a href={campo.href} className="hover:text-primary hover:underline">{campo.value}</a>
                ) : (
                  campo.value
                )
              ) : (
                <span className="text-light-text">Não informado</span>
              )}
            </dd>
          </div>
        ))}
        <div className="flex items-center gap-3 py-3">
          <span className="material-icons text-[18px] text-light-text shrink-0" aria-hidden="true">description</span>
          <dt className="text-xs text-light-text w-32 shrink-0">Currículo</dt>
          <dd className="text-sm text-ink min-w-0 flex-1 flex items-center gap-3">
            {candidato.tem_curriculo ? (
              <>
                <span className="truncate min-w-0">{candidato.curriculo_nome || 'Currículo'}</span>
                <Button variant="subtle" size="sm" icon="download" onClick={baixarCurriculo} loading={baixando} className="ml-auto">
                  Baixar
                </Button>
              </>
            ) : (
              <span className="text-light-text">Não enviado</span>
            )}
          </dd>
        </div>
      </dl>

      {candidato.mensagem && (
        <div className="mt-2 pt-4 border-t border-divider">
          <p className="text-xs font-semibold text-ink mb-2">Mensagem do candidato</p>
          <p className="text-sm text-ink-soft whitespace-pre-wrap break-words leading-relaxed">
            {candidato.mensagem}
          </p>
        </div>
      )}
    </>
  );
}
