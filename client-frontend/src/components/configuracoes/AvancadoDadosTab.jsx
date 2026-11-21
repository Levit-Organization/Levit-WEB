import { useState } from 'react';
import { Alert, Button, Card, Select } from '../ui';
import { useModulos } from '../../hooks/queries';
import { useToast } from '../../hooks/useFeedback';
import { backupService, extrairErroBlob } from '../../services/backupService';

const SEM_DADOS = [];

/** Aba "Avançado e dados": backup completo em JSON e itens de uma tabela em CSV. */
export default function AvancadoDadosTab() {
  const toast = useToast();
  const modulos = useModulos().data ?? SEM_DADOS;
  const [moduloSelecionado, setModuloSelecionado] = useState('');
  const [exportandoJson, setExportandoJson] = useState(false);
  const [exportandoCsv, setExportandoCsv] = useState(false);
  const [erro, setErro] = useState('');

  /** Mostra o carregamento no botão, avisa no sucesso e mostra o erro do servidor. */
  const exportar = async (setExportando, baixar, mensagemDeSucesso) => {
    setErro('');
    setExportando(true);
    try {
      await baixar();
      toast.success(mensagemDeSucesso);
    } catch (err) {
      setErro(await extrairErroBlob(err));
    } finally {
      setExportando(false);
    }
  };

  const handleExportarJson = () =>
    exportar(setExportandoJson, () => backupService.exportarJson(), 'Backup JSON baixado com sucesso.');

  const handleExportarCsv = () => {
    if (!moduloSelecionado) return;
    const modulo = modulos.find((m) => String(m.id) === String(moduloSelecionado));
    return exportar(
      setExportandoCsv,
      () => backupService.exportarCsv(moduloSelecionado, modulo?.nome || 'modulo'),
      'CSV exportado com sucesso.'
    );
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      <Card>
        <h2 className="text-base font-semibold mb-1">Exportar dados</h2>

        {erro && <Alert variant="error" className="my-3">{erro}</Alert>}

        <div className="flex flex-col divide-y divide-divider -mb-1">
          <div className="flex items-center justify-between gap-4 py-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">Backup completo (JSON)</p>
              <p className="text-xs text-light-text mt-0.5">Todas as tabelas, itens e configurações da empresa.</p>
            </div>
            <Button variant="secondary" size="sm" icon="download" onClick={handleExportarJson} loading={exportandoJson}>
              {exportandoJson ? 'Exportando...' : 'Exportar JSON'}
            </Button>
          </div>

          <div className="pt-4">
            <div className="mb-3">
              <p className="text-sm font-medium text-ink">Itens de uma tabela (CSV)</p>
              <p className="text-xs text-light-text mt-0.5">Abre no Excel e no Google Sheets.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Select
                  value={moduloSelecionado}
                  onChange={(e) => setModuloSelecionado(e.target.value)}
                  aria-label="Tabela para exportar"
                  placeholder="Selecione uma tabela"
                  options={modulos.map((m) => ({ value: m.id, label: m.nome }))}
                />
              </div>
              <Button
                variant="secondary"
                size="sm"
                icon="download"
                onClick={handleExportarCsv}
                disabled={!moduloSelecionado || exportandoCsv}
                loading={exportandoCsv}
              >
                {exportandoCsv ? 'Exportando...' : 'Exportar CSV'}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
