import { Input, Select } from '../ui';
import CampoVinculo from '../vinculos/CampoVinculo';
import { REPETICOES } from '../../utils/recorrencia';

/**
 * Campo do formulário de um item, conforme o tipo da coluna.
 * `valor`: o que está guardado no item (pode ser undefined).
 */
export default function CampoDoRegistro({ campo, valor, onChange, pessoas, carregandoPessoas, usuarioId }) {
  const comum = {
    id: `campo-${campo.id}`,
    value: valor ?? '',
    onChange: (e) => onChange(e.target.value),
  };

  switch (campo.tipo) {
    case 'texto':
      return <Input type="text" autoComplete="off" placeholder={`Digite ${campo.nome.toLowerCase()}...`} {...comum} />;
    case 'numero':
      return <Input type="number" inputMode="decimal" placeholder="0" {...comum} />;
    case 'data':
    case 'prazo':
      return <Input type="date" {...comum} />;
    case 'recorrencia':
      return (
        <Select
          placeholder="Não repete"
          options={REPETICOES.map((r) => ({ value: r.valor, label: r.rotulo }))}
          {...comum}
        />
      );
    case 'responsavel':
      return (
        <Select
          placeholder={carregandoPessoas ? 'Carregando a equipe...' : 'Sem responsável'}
          options={pessoas.map((p) => ({ value: p.id, label: p.id === usuarioId ? `${p.nome} (você)` : p.nome }))}
          {...comum}
        />
      );
    case 'selecao':
      return (
        <Select
          placeholder="Selecione..."
          options={(campo.opcoes || []).map((opcao) => ({ value: opcao, label: opcao }))}
          {...comum}
        />
      );
    case 'vinculo':
      return <CampoVinculo id={comum.id} campo={campo} value={valor} onChange={onChange} />;
    default:
      return null;
  }
}
