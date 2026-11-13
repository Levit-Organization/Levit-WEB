import { Input, Select } from '../ui';
import { hojeISO } from '../../utils/prazos';
import { ATALHOS_PERIODO, periodoDoAtalho } from '../../utils/relatorios';

/** Período usado pelo painel, pelo relatório montado e pelo PDF sob demanda. */
export default function SeletorPeriodo({ periodo, onChange }) {
  const { atalho, inicio, fim } = periodo;
  const escolher = (valor) => {
    const datas = periodoDoAtalho(valor);
    onChange(datas ? { atalho: valor, inicio: datas[0], fim: datas[1] } : { ...periodo, atalho: valor });
  };
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:max-w-2xl">
      <Select label="Período" value={atalho} onChange={(e) => escolher(e.target.value)} options={ATALHOS_PERIODO} />
      <Input label="De" type="date" value={inicio} max={fim} onChange={(e) => onChange({ ...periodo, atalho: 'outro', inicio: e.target.value })} />
      <Input label="Até" type="date" value={fim} min={inicio} max={hojeISO()} onChange={(e) => onChange({ ...periodo, atalho: 'outro', fim: e.target.value })} />
    </div>
  );
}
