import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Layout from '../components/Layout';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  Modal,
  PageHeader,
  Select,
  Skeleton,
  Toggle,
} from '../components/ui';
import { cn } from '../components/ui/cn';
import PessoaResponsavel from '../components/prazos/PessoaResponsavel';
import { useEnviosRelatorio, usePessoas, useRelatorios, queryKeys } from '../hooks/queries';
import { useConfirm, useToast } from '../hooks/useFeedback';
import { mensagemDeErro } from '../lib/queryClient';
import { relatorioService } from '../services/relatorioService';
import { hojeISO } from '../utils/prazos';

const DIAS_SEMANA = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];
const VAZIO = { nome: '', frequencia: 'semanal', dia: 1, destinatarios: [], ativo: true };

function somarDias(iso, dias) {
  const [a, m, d] = iso.split('-').map(Number);
  return hojeISO(new Date(a, m - 1, d + dias));
}

/** Atalhos de período para o PDF sob demanda (datas inclusivas). */
function periodoDoAtalho(atalho, hoje = hojeISO()) {
  const [a, m] = hoje.split('-').map(Number);
  switch (atalho) {
    case '7d':
      return [somarDias(hoje, -6), hoje];
    case '30d':
      return [somarDias(hoje, -29), hoje];
    case 'mes':
      return [hojeISO(new Date(a, m - 1, 1)), hoje];
    case 'mes-passado':
      return [hojeISO(new Date(a, m - 2, 1)), hojeISO(new Date(a, m - 1, 0))];
    default:
      return null;
  }
}

const dataCurta = (iso) => (iso ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('pt-BR') : '');
const dataHora = (utc) => (utc ? new Date(`${utc.replace(' ', 'T')}Z`).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '');

function BaixarAgora() {
  const toast = useToast();
  const [atalho, setAtalho] = useState('7d');
  const [inicio, setInicio] = useState(somarDias(hojeISO(), -6));
  const [fim, setFim] = useState(hojeISO());
  const [baixando, setBaixando] = useState(false);

  const escolher = (valor) => {
    setAtalho(valor);
    const periodo = periodoDoAtalho(valor);
    if (periodo) [setInicio, setFim].forEach((set, i) => set(periodo[i]));
  };

  const baixar = async () => {
    setBaixando(true);
    try {
      await relatorioService.baixarPdf({ inicio, fim });
    } catch (erro) {
      toast.error(mensagemDeErro(erro, 'Não foi possível gerar o PDF.'));
    } finally {
      setBaixando(false);
    }
  };

  return (
    <Card>
      <h2 className="text-base font-bold text-ink">Baixar agora</h2>
      <p className="text-sm text-light-text mt-1">Um PDF com tudo o que foi feito no período, por quem, e os itens atrasados.</p>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-3 items-end">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select
            label="Período"
            value={atalho}
            onChange={(e) => escolher(e.target.value)}
            options={[
              { value: '7d', label: 'Últimos 7 dias' },
              { value: '30d', label: 'Últimos 30 dias' },
              { value: 'mes', label: 'Este mês' },
              { value: 'mes-passado', label: 'Mês passado' },
              { value: 'outro', label: 'Escolher datas' },
            ]}
          />
          <Input label="De" type="date" value={inicio} max={fim} onChange={(e) => { setAtalho('outro'); setInicio(e.target.value); }} />
          <Input label="Até" type="date" value={fim} min={inicio} max={hojeISO()} onChange={(e) => { setAtalho('outro'); setFim(e.target.value); }} />
        </div>
        <Button icon="picture_as_pdf" onClick={baixar} loading={baixando} disabled={!inicio || !fim || inicio > fim}>
          {baixando ? 'Gerando...' : 'Baixar PDF'}
        </Button>
      </div>
    </Card>
  );
}

function Historico({ relatorio }) {
  const toast = useToast();
  const envios = useEnviosRelatorio(relatorio.id, { enabled: true });
  const baixar = async (envio) => {
    try {
      // O período do envio termina à meia-noite (exclusivo): o último dia é o anterior.
      const fimUtc = new Date(`${envio.periodo_fim.replace(' ', 'T')}Z`);
      fimUtc.setMinutes(fimUtc.getMinutes() - 1);
      await relatorioService.baixarPdf({
        inicio: hojeISO(new Date(`${envio.periodo_inicio.replace(' ', 'T')}Z`)),
        fim: hojeISO(fimUtc),
        titulo: relatorio.nome,
      });
    } catch (erro) {
      toast.error(mensagemDeErro(erro, 'Não foi possível gerar o PDF.'));
    }
  };

  if (envios.isLoading) return <Skeleton className="h-10 w-full mt-3" />;
  if (envios.isError) return <p className="text-sm text-danger mt-3">{mensagemDeErro(envios.error, 'Erro ao carregar o histórico.')}</p>;
  if (!envios.data?.length) return <p className="text-sm text-light-text mt-3">Ainda não houve nenhum envio.</p>;

  return (
    <ul className="mt-3 flex flex-col divide-y divide-divider border-t border-divider">
      {envios.data.map((envio) => (
        <li key={envio.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
          <span className="text-ink-soft">{dataHora(envio.enviado_em)}</span>
          {envio.status === 'enviado' ? (
            <Badge variant="success" size="sm">{envio.total_atividades} atividades</Badge>
          ) : (
            <Badge variant="danger" size="sm" title={envio.erro || ''}>Não enviado</Badge>
          )}
          <button type="button" onClick={() => baixar(envio)} className="ml-auto text-primary font-semibold hover:underline">
            Baixar PDF
          </button>
        </li>
      ))}
    </ul>
  );
}

function CartaoRelatorio({ relatorio, nomes, onEditar }) {
  const toast = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [historico, setHistorico] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const ultimo = relatorio.ultimo_envio;

  const enviarAgora = async () => {
    setEnviando(true);
    try {
      await relatorioService.enviarAgora(relatorio.id);
      toast.success('Relatório enviado por e-mail.');
    } catch (erro) {
      toast.error(mensagemDeErro(erro, 'Não foi possível enviar agora.'));
    } finally {
      setEnviando(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.relatorios });
    }
  };

  const alternar = async (ativo) => {
    try {
      await relatorioService.atualizar(relatorio.id, { ...relatorio, ativo });
      toast.success(ativo ? 'Relatório ligado.' : 'Relatório pausado.');
    } catch (erro) {
      toast.error(mensagemDeErro(erro, 'Não foi possível alterar.'));
    }
  };

  const excluir = async () => {
    const ok = await confirm({
      title: 'Excluir relatório?',
      message: `"${relatorio.nome}" deixa de ser enviado. O histórico de atividades continua guardado.`,
      confirmLabel: 'Excluir',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await relatorioService.excluir(relatorio.id);
      toast.success('Relatório excluído.');
    } catch (erro) {
      toast.error(mensagemDeErro(erro, 'Não foi possível excluir.'));
    }
  };

  return (
    <Card className={cn('min-w-0', !relatorio.ativo && 'opacity-80')}>
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-primary-100 text-primary flex items-center justify-center shrink-0" aria-hidden="true">
          <span className="material-icons text-[20px]">description</span>
        </span>
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

      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" icon="send" onClick={enviarAgora} loading={enviando}>Enviar agora</Button>
        <Button size="sm" variant="secondary" icon="history" onClick={() => setHistorico((v) => !v)} aria-expanded={historico}>
          Histórico
        </Button>
        <span className="ml-auto flex gap-1">
          <Button size="sm" variant="ghost" icon="edit" onClick={() => onEditar(relatorio)}>Editar</Button>
          <Button size="sm" variant="ghost" icon="delete_outline" onClick={excluir} aria-label="Excluir relatório" />
        </span>
      </div>

      {historico && <Historico relatorio={relatorio} />}
    </Card>
  );
}

function FormularioRelatorio({ aberto, inicial, pessoas, onFechar }) {
  const toast = useToast();
  const [form, setForm] = useState(inicial);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const editando = !!inicial.id;
  const mudar = (parcial) => setForm((f) => ({ ...f, ...parcial }));

  const alternarPessoa = (id) =>
    mudar({ destinatarios: form.destinatarios.includes(id) ? form.destinatarios.filter((d) => d !== id) : [...form.destinatarios, id] });

  const salvar = async (e) => {
    e?.preventDefault();
    if (!form.nome.trim()) return setErro('Dê um nome ao relatório.');
    if (form.destinatarios.length === 0) return setErro('Escolha quem recebe o relatório.');
    setSalvando(true);
    setErro('');
    try {
      const corpo = { nome: form.nome.trim(), frequencia: form.frequencia, dia: Number(form.dia), destinatarios: form.destinatarios, ativo: form.ativo };
      if (editando) await relatorioService.atualizar(inicial.id, corpo);
      else await relatorioService.criar(corpo);
      toast.success(editando ? 'Relatório atualizado.' : 'Relatório agendado.');
      onFechar();
    } catch (err) {
      setErro(mensagemDeErro(err, 'Não foi possível salvar.'));
    } finally {
      setSalvando(false);
    }
  };

  const opcoesDia = form.frequencia === 'semanal'
    ? DIAS_SEMANA.map((nome, i) => ({ value: i + 1, label: nome }))
    : Array.from({ length: 28 }, (_, i) => ({ value: i + 1, label: `Dia ${i + 1}` }));

  return (
    <Modal
      open={aberto}
      onClose={onFechar}
      dirty={JSON.stringify(form) !== JSON.stringify(inicial)}
      title={editando ? 'Editar relatório' : 'Novo relatório'}
      subtitle="O PDF chega por e-mail no dia escolhido."
      footer={
        <>
          <Button variant="secondary" onClick={onFechar}>Cancelar</Button>
          <Button type="submit" form="form-relatorio" loading={salvando}>{editando ? 'Salvar' : 'Agendar'}</Button>
        </>
      }
    >
      <form id="form-relatorio" onSubmit={salvar} className="flex flex-col gap-4" noValidate>
        {erro && <p className="text-sm text-danger" role="alert">{erro}</p>}
        <Input label="Nome" value={form.nome} onChange={(e) => mudar({ nome: e.target.value })} placeholder="Ex: Resumo semanal da equipe" maxLength={100} required />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <span className="block text-sm font-medium text-ink mb-1.5">Frequência</span>
            <div role="group" aria-label="Frequência" className="flex gap-1 rounded-lg bg-sidebar p-1">
              {[
                ['semanal', 'Semanal'],
                ['mensal', 'Mensal'],
              ].map(([valor, rotulo]) => (
                <button
                  key={valor}
                  type="button"
                  aria-pressed={form.frequencia === valor}
                  onClick={() => mudar({ frequencia: valor, dia: 1 })}
                  className={cn(
                    'flex-1 rounded-md h-8 text-sm font-semibold transition-colors',
                    form.frequencia === valor ? 'bg-surface text-ink shadow-xs' : 'text-light-text hover:text-ink'
                  )}
                >
                  {rotulo}
                </button>
              ))}
            </div>
          </div>
          <Select
            label={form.frequencia === 'semanal' ? 'Dia da semana' : 'Dia do mês'}
            value={form.dia}
            onChange={(e) => mudar({ dia: Number(e.target.value) })}
            options={opcoesDia}
          />
        </div>
        <p className="text-xs text-light-text -mt-2">
          {form.frequencia === 'semanal'
            ? 'Cobre os 7 dias anteriores ao envio. Chega de manhã.'
            : 'Cobre o mês anterior ao envio (até o dia 28, para todo mês ter esse dia). Chega de manhã.'}
        </p>

        <fieldset>
          <legend className="text-sm font-medium text-ink mb-1.5">Quem recebe</legend>
          <div className="max-h-56 overflow-y-auto rounded-lg border border-divider divide-y divide-divider">
            {pessoas.map((p) => (
              <label key={p.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-background">
                <input type="checkbox" checked={form.destinatarios.includes(p.id)} onChange={() => alternarPessoa(p.id)} className="w-4 h-4 accent-primary" />
                <PessoaResponsavel nome={p.nome} className="text-sm text-ink" />
              </label>
            ))}
          </div>
        </fieldset>

        <Toggle checked={form.ativo} onChange={(ativo) => mudar({ ativo })} label="Ligado" description="Pausado, o relatório não é enviado." />
      </form>
    </Modal>
  );
}

/**
 * Relatórios em PDF: tudo o que foi feito na plataforma e por quem. Agendados
 * (semanal ou mensal, chegam por e-mail) ou baixados na hora para qualquer período.
 */
export default function Relatorios() {
  const relatorios = useRelatorios();
  const pessoas = usePessoas();
  const nomes = Object.fromEntries((pessoas.data ?? []).map((p) => [p.id, p.nome]));
  const [form, setForm] = useState(null); // { aberto, inicial }
  const semAcesso = relatorios.error?.response?.status === 403;

  const abrir = (relatorio = null) =>
    setForm({ chave: Date.now(), inicial: relatorio ? { ...VAZIO, ...relatorio } : VAZIO });

  return (
    <Layout>
      <PageHeader
        icon="description"
        title="Relatórios"
        subtitle="Um PDF com tudo o que foi feito na plataforma e por quem, no dia que você escolher."
        actions={!semAcesso && <Button icon="add" onClick={() => abrir()}>Novo relatório</Button>}
      />

      {semAcesso ? (
        <Card padding="lg" className="py-12">
          <EmptyState
            icon="lock"
            size="lg"
            title="Relatórios são para quem tem acesso total"
            description="O relatório mostra tudo o que acontece na empresa, em todas as tabelas. Peça a alguém com acesso total para agendar e incluir você entre quem recebe."
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          <BaixarAgora />

          <section>
            <h2 className="text-base font-bold text-ink mb-3.5">Agendados</h2>
            {relatorios.isLoading ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {[1, 2].map((n) => <Skeleton key={n} className="h-40 rounded-2xl" />)}
              </div>
            ) : relatorios.isError ? (
              <Card>
                <ErrorState description={mensagemDeErro(relatorios.error, 'Erro ao carregar os relatórios.')} onRetry={() => relatorios.refetch()} />
              </Card>
            ) : relatorios.data.length === 0 ? (
              <Card padding="lg" className="py-10">
                <EmptyState
                  icon="event_repeat"
                  title="Nenhum relatório agendado"
                  description="Escolha um dia da semana ou do mês e quem recebe. O PDF chega por e-mail com o que cada pessoa fez no período."
                  actionLabel="Agendar o primeiro"
                  actionIcon="add"
                  onAction={() => abrir()}
                />
              </Card>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {relatorios.data.map((r) => (
                  <CartaoRelatorio key={r.id} relatorio={r} nomes={nomes} onEditar={abrir} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {form && (
        <FormularioRelatorio
          key={form.chave}
          aberto
          inicial={form.inicial}
          pessoas={pessoas.data ?? []}
          onFechar={() => setForm(null)}
        />
      )}
    </Layout>
  );
}
