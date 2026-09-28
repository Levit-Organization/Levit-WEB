import { useState, useEffect } from 'react';
import { Modal, Button, Avatar, Badge, Alert, tempoRelativo, estaParado } from '../ui';
import { useAtualizarCandidato } from '../../hooks/useKanban';

const TIPO_ICON = {
  texto: 'text_fields',
  numero: 'tag',
  data: 'calendar_today',
  selecao: 'list',
};

const TIPO_LABEL = {
  texto: 'Texto',
  numero: 'Número',
  data: 'Data',
  selecao: 'Seleção',
};

function ValorCampo({ campo, dados }) {
  const valor = dados?.[campo.id];

  if (valor === undefined || valor === null || valor === '') {
    return <span className="text-light-text italic text-xs">Não avaliado</span>;
  }

  if (campo.tipo === 'data') {
    try {
      return (
        <span className="text-sm text-ink">
          {new Date(valor).toLocaleDateString('pt-BR', {
            day: 'numeric', month: 'long', year: 'numeric',
          })}
        </span>
      );
    } catch {
      return <span className="text-sm text-ink">{valor}</span>;
    }
  }

  return <span className="text-sm text-ink">{String(valor)}</span>;
}

function InputCampo({ campo, value, onChange }) {
  const baseClass =
    'w-full rounded-lg border border-divider bg-background px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors';

  switch (campo.tipo) {
    case 'texto':
      return (
        <input
          type="text"
          value={value ?? ''}
          onChange={(e) => onChange(campo.id, e.target.value)}
          placeholder={`Digite ${campo.nome.toLowerCase()}...`}
          className={baseClass}
        />
      );
    case 'numero':
      return (
        <input
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(campo.id, e.target.value)}
          placeholder="0"
          className={baseClass}
        />
      );
    case 'data':
      return (
        <input
          type="date"
          value={value ?? ''}
          onChange={(e) => onChange(campo.id, e.target.value)}
          className={baseClass}
        />
      );
    case 'selecao':
      return (
        <select
          value={value ?? ''}
          onChange={(e) => onChange(campo.id, e.target.value)}
          className={`${baseClass} cursor-pointer`}
        >
          <option value="">Selecione...</option>
          {(campo.opcoes ?? []).map((opcao) => (
            <option key={opcao} value={opcao}>{opcao}</option>
          ))}
        </select>
      );
    default:
      return null;
  }
}

export default function CandidatoModal({ candidato, onClose, campos, vagaSelecionada }) {
  const [editando, setEditando] = useState(false);
  const [formDados, setFormDados] = useState({});
  const [saveError, setSaveError] = useState('');

  const temCampos = campos && campos.length > 0;

  useEffect(() => {
    if (candidato) {
      setFormDados(candidato.dados || {});
      setEditando(false);
      setSaveError('');
    }
  }, [candidato]);

  const { mutateAsync: atualizarCandidato, isPending: salvando } = useAtualizarCandidato(vagaSelecionada);

  if (!candidato) return null;

  const handleFieldChange = (campoId, valor) => {
    setFormDados((prev) => ({ ...prev, [campoId]: valor }));
  };

  const handleSalvar = async () => {
    setSaveError('');
    try {
      await atualizarCandidato({
        moduloId: candidato.modulo_id,
        candidatoId: candidato.id,
        payload: { dados: formDados },
      });
      // Atualiza localmente para refletir na UI sem esperar novo fetch completo
      candidato.dados = formDados;
      setEditando(false);
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Erro ao salvar avaliação. Tente novamente.');
    }
  };

  const handleCancelar = () => {
    setFormDados(candidato.dados || {});
    setEditando(false);
    setSaveError('');
  };

  const footer = (
    <div className="flex w-full items-center justify-between">
      <div>
        {temCampos && !editando && (
          <Button variant="secondary" icon="edit" onClick={() => setEditando(true)}>
            Avaliar candidato
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        {editando ? (
          <>
            <Button variant="secondary" onClick={handleCancelar} disabled={salvando}>
              Cancelar
            </Button>
            <Button onClick={handleSalvar} loading={salvando}>
              {salvando ? 'Salvando...' : 'Salvar avaliação'}
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>
              Fechar
            </Button>
            {candidato.email && (
              <Button
                icon="mail"
                onClick={() => { window.location.href = `mailto:${candidato.email}`; }}
              >
                Enviar e-mail
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );

  return (
    <Modal
      open={!!candidato}
      onClose={onClose}
      title={candidato.nome || 'Candidato'}
      subtitle={candidato.cargo_desejado || candidato.vaga || undefined}
      maxWidth="lg"
      footer={footer}
    >
      <div className="flex items-center gap-4 pb-5 border-b border-divider">
        <Avatar name={candidato.nome} size="xl" />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-2xs font-semibold ${candidato.cor?.bg || 'bg-primary-100'} ${candidato.cor?.text || 'text-primary'}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${candidato.cor?.dot || 'bg-primary'}`} />
              {candidato.faseNome}
            </span>
            {estaParado(candidato.atualizado_em || candidato.criado_em) && (
              <Badge variant="warning" size="sm" dot>Parado há mais de 14 dias</Badge>
            )}
          </div>
          <p className="text-xs text-light-text mt-1.5">
            Candidatou-se {tempoRelativo(candidato.criado_em) || '—'}
            {candidato.vaga ? ` · ${candidato.vaga}` : ''}
          </p>
        </div>
      </div>

      <dl className="divide-y divide-divider mb-6">
        {[
          { label: 'E-mail', value: candidato.email, icon: 'mail_outline', href: candidato.email ? `mailto:${candidato.email}` : null },
          { label: 'Telefone', value: candidato.telefone, icon: 'call', href: candidato.telefone ? `tel:${candidato.telefone}` : null },
          { label: 'Cargo desejado', value: candidato.cargo_desejado, icon: 'work_outline' },
          { label: 'Currículo / Link', value: candidato.dados?.curriculo_url, icon: 'link', href: candidato.dados?.curriculo_url, isCurriculo: true },
        ].map((campo) => (
          <div key={campo.label} className="flex items-center gap-3 py-3">
            <span className="material-icons text-[18px] text-light-text shrink-0">{campo.icon}</span>
            <dt className="text-xs text-light-text w-32 shrink-0">{campo.label}</dt>
            <dd className="text-sm text-ink min-w-0 flex-1">
              {editando && campo.isCurriculo ? (
                <input
                  type="url"
                  value={formDados.curriculo_url || ''}
                  onChange={(e) => handleFieldChange('curriculo_url', e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-divider bg-background px-3 py-1.5 text-sm text-ink placeholder:text-faint focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              ) : campo.value ? (
                campo.href ? (
                  <a href={campo.href} target={campo.isCurriculo ? "_blank" : undefined} rel="noreferrer" className="hover:text-primary hover:underline truncate block">
                    {campo.value}
                  </a>
                ) : (
                  <span className="truncate block">{campo.value}</span>
                )
              ) : (
                <span className="text-light-text">Não informado</span>
              )}
            </dd>
          </div>
        ))}
        {/* Renderiza campos públicos aqui na leitura básica do candidato */}
        {(campos || []).filter(c => c.publico).map((campo) => (
          <div key={campo.id} className="flex items-center gap-3 py-3">
            <span className="material-icons text-[18px] text-light-text shrink-0">{TIPO_ICON[campo.tipo] || 'info_outline'}</span>
            <dt className="text-xs text-light-text w-32 shrink-0">{campo.nome}</dt>
            <dd className="text-sm text-ink min-w-0 flex-1">
              {editando ? (
                <InputCampo campo={campo} value={formDados[campo.id]} onChange={handleFieldChange} />
              ) : (
                <ValorCampo campo={campo} dados={candidato.dados} />
              )}
            </dd>
          </div>
        ))}
      </dl>

      {/* Seção de Avaliação (Campos internos do módulo) */}
      {(campos || []).filter(c => !c.publico).length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-ink">Avaliação do RH</h4>
            {editando && (
              <span className="inline-flex items-center gap-1 rounded-full bg-warning-bg border border-warning/20 px-2.5 py-1 text-2xs font-semibold text-warning shrink-0">
                <span className="material-icons text-[12px]">edit</span>
                Editando
              </span>
            )}
          </div>

          {saveError && (
            <div className="mb-4">
              <Alert variant="error">{saveError}</Alert>
            </div>
          )}

          <div className="flex flex-col divide-y divide-divider border border-divider rounded-xl overflow-hidden">
            {(campos || []).filter(c => !c.publico).map((campo) => (
              <div key={campo.id} className="p-4 bg-surface flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="material-icons text-[14px] text-light-text">
                    {TIPO_ICON[campo.tipo] || 'radio_button_unchecked'}
                  </span>
                  <span className="text-xs font-semibold text-ink">{campo.nome}</span>
                </div>

                {editando ? (
                  <div className="ml-5">
                    <InputCampo
                      campo={campo}
                      value={formDados[campo.id]}
                      onChange={handleFieldChange}
                    />
                  </div>
                ) : (
                  <div className="ml-5">
                    <ValorCampo campo={campo} dados={candidato.dados} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Anotações Internas */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-bold text-ink flex items-center gap-2">
            <span className="material-icons text-[18px] text-light-text">speaker_notes</span>
            Anotações Internas
          </h4>
        </div>
        {editando ? (
          <textarea
            value={formDados._anotacoes || ''}
            onChange={(e) => handleFieldChange('_anotacoes', e.target.value)}
            placeholder="Registre aqui informações de entrevistas, feedbacks e observações..."
            className="w-full h-32 rounded-xl border border-divider bg-background p-4 text-sm text-ink placeholder:text-faint focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
          />
        ) : (
          <div className="w-full min-h-[5rem] rounded-xl border border-divider bg-surface p-4 text-sm text-ink whitespace-pre-wrap break-words">
            {candidato.dados?._anotacoes ? candidato.dados._anotacoes : <span className="text-light-text italic">Nenhuma anotação registrada.</span>}
          </div>
        )}
      </div>

      {candidato.mensagem && (
        <div className="mt-6 pt-4 border-t border-divider">
          <p className="text-xs font-semibold text-ink mb-2">Mensagem do candidato</p>
          <p className="text-sm text-ink-soft whitespace-pre-wrap break-words leading-relaxed p-4 bg-surface rounded-xl border border-divider">
            {candidato.mensagem}
          </p>
        </div>
      )}
    </Modal>
  );
}
