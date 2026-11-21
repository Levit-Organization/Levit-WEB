import { useState } from 'react';
import { Button, Card } from '../ui';
import { useToast } from '../../hooks/useFeedback';
import { mensagemDeErro } from '../../lib/queryClient';
import { relatorioService } from '../../services/relatorioService';
import { SECOES_PADRAO } from '../../utils/relatorios';
import EscolhaDeSecoes from './EscolhaDeSecoes';

/** PDF do período escolhido, gerado na hora, com as partes marcadas. */
export default function BaixarAgora({ inicio, fim }) {
  const toast = useToast();
  const [secoes, setSecoes] = useState(SECOES_PADRAO);
  const [baixando, setBaixando] = useState(false);

  const baixar = async () => {
    setBaixando(true);
    try {
      await relatorioService.baixarPdf({ inicio, fim, secoes });
    } catch (erro) {
      toast.error(mensagemDeErro(erro, 'Não foi possível gerar o PDF.'));
    } finally {
      setBaixando(false);
    }
  };

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-bold text-ink">Baixar agora</h2>
        <Button variant="secondary" icon="picture_as_pdf" onClick={baixar} loading={baixando} disabled={!inicio || !fim || inicio > fim || secoes.length === 0}>
          {baixando ? 'Gerando...' : 'Baixar PDF'}
        </Button>
      </div>
      <div className="mt-4">
        <EscolhaDeSecoes valor={secoes} onChange={setSecoes} />
      </div>
    </Card>
  );
}
