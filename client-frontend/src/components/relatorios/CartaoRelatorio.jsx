import { useState } from 'react';
import { Button, Card, Toggle } from '../ui';
import { cn } from '../ui/cn';
import PessoaResponsavel from '../prazos/PessoaResponsavel';
import { useAcoesDoRelatorio } from '../../hooks/useAcoesDoRelatorio';
import { dataCurta, dataHora } from '../../utils/relatoriosAgendados';
import HistoricoDeEnvios from './HistoricoDeEnvios';

/** Um relatório agendado: agenda, quem recebe, último envio, ações e o histórico. */
export default function CartaoRelatorio({ relatorio, nomes, onEditar }) {
  const [historico, setHistorico] = useState(false);
  const { enviando, enviarAgora, alternar, excluir } = useAcoesDoRelatorio(relatorio);
  const ultimo = relatorio.ultimo_envio;

  return (
    <Card className={cn('min-w-0', !relatorio.ativo && 'opacity-80')}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-ink truncate">{relatorio.nome}</h3>
          <p className="text-sm text-light-text">
            {relatorio.descricao_agenda}
            {relatorio.ativo && relatorio.proximo_envio ? ` · próximo envio em ${dataCurta(relatorio.proximo_envio)}` : ''}
            {!relatorio.ativo ? ' · pausado' : ''}
          </p>
        </div>
        <Toggle checked={relatorio.ativo} onChange={alternar} ariaLabel={relatorio.ativo ? 'Pausar relatório' : 'Ligar relatório'} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-light-text">Recebem:</span>
        {relatorio.destinatarios.map((id) => (
          <PessoaResponsavel key={id} nome={nomes[id] || 'Pessoa removida'} className="text-ink-soft" />
        ))}
      </div>

      {ultimo && (
        <p className={cn('mt-2 text-xs', ultimo.status === 'enviado' ? 'text-light-text' : 'text-danger')}>
          {ultimo.status === 'enviado'
            ? `Último envio: ${dataHora(ultimo.enviado_em)}, com ${ultimo.total_atividades} atividades.`
            : `O último envio falhou (${dataHora(ultimo.enviado_em)}): ${ultimo.erro || 'erro desconhecido'}`}
        </p>
      )}

      <div className="mt-3 flex items-center gap-1">
        <Button size="sm" variant="ghost" icon="history" onClick={() => setHistorico((v) => !v)} aria-expanded={historico} className="-ml-3.5">
          Histórico
        </Button>
        <span className="ml-auto flex gap-0.5">
          <Button size="icon-sm" variant="ghost" icon="send" onClick={enviarAgora} loading={enviando} aria-label="Enviar agora" title="Enviar agora" />
          <Button size="icon-sm" variant="ghost" icon="edit" onClick={() => onEditar(relatorio)} aria-label="Editar relatório" title="Editar" />
          <Button size="icon-sm" variant="ghost" icon="delete_outline" onClick={excluir} aria-label="Excluir relatório" title="Excluir" />
        </span>
      </div>

      {historico && <HistoricoDeEnvios relatorio={relatorio} />}
    </Card>
  );
}
