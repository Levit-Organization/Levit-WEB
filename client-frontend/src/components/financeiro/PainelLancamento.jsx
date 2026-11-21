import { Alert, Button, Drawer, Input, Select, Toggle } from '../ui';
import { opcoesDeCategoria } from '../../utils/financeiro';

const TIPOS = [
  { value: 'saida', label: 'Saída (Despesa)' },
  { value: 'entrada', label: 'Entrada (Receita)' },
];

/** Painel lateral de novo lançamento. `formulario` vem de useFormularioLancamento. */
export default function PainelLancamento({ formulario, categorias }) {
  const { aberto, fechar, sujo, salvando, salvar, erro, erros, form, alterar } = formulario;

  return (
    <Drawer
      open={aberto}
      onClose={fechar}
      dirty={sujo}
      title="Novo lançamento"
      footer={
        <>
          <Button variant="secondary" onClick={fechar} type="button">Cancelar</Button>
          <Button type="submit" form="lancamento-form" loading={salvando}>Salvar lançamento</Button>
        </>
      }
    >
      <form id="lancamento-form" onSubmit={salvar} noValidate className="flex flex-col gap-5">
        {erro && <Alert variant="error">{erro}</Alert>}

        <Input
          label="Descrição"
          name="descricao"
          autoComplete="off"
          value={form.descricao}
          onChange={(e) => alterar('descricao', e.target.value)}
          error={erros.descricao}
          required
          placeholder="Ex: Pagamento de fornecedor"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            type="date"
            name="data"
            label="Data"
            value={form.data}
            onChange={(e) => alterar('data', e.target.value)}
            error={erros.data}
            required
          />

          <Input
            type="number"
            name="valor"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            label="Valor (R$)"
            value={form.valor}
            onChange={(e) => alterar('valor', e.target.value)}
            error={erros.valor}
            required
            placeholder="0,00"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Tipo"
            name="tipo"
            value={form.tipo}
            onChange={(e) => alterar('tipo', e.target.value)}
            options={TIPOS}
          />

          <Select
            label="Categoria"
            name="categoria"
            value={form.categoria_id}
            onChange={(e) => alterar('categoria_id', e.target.value)}
            options={[{ value: '', label: 'Selecione...' }, ...opcoesDeCategoria(categorias)]}
          />
        </div>

        <div className="pt-2">
          <Toggle
            label="Lançamento conciliado"
            description="Marque se este valor já foi efetivamente pago/recebido na conta."
            checked={form.conciliado}
            onChange={(val) => alterar('conciliado', val)}
          />
        </div>
      </form>
    </Drawer>
  );
}
