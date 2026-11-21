import { useState } from 'react';
import { Card, Input, Select } from '../ui';
import { MODULO_ICON_OPTIONS } from '../../utils/iconOptions';
import { TIPO_INFO } from '../../utils/modulos';

/**
 * Coluna esquerda do formulário de tabela: nome, tipo (travado na edição) e ícone.
 * `onChange`: evento dos campos com `name`; `onIcone`: o ícone escolhido.
 */
export default function InformacoesBasicas({ formData, isEditing, onChange, onIcone }) {
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const tipoAtual = TIPO_INFO[formData.tipo] ?? TIPO_INFO.dados;

  return (
    <Card className="lg:sticky lg:top-8 flex flex-col gap-5">
      <h2 className="text-base font-semibold">Informações básicas</h2>

      <Input
        label="Nome da tabela"
        type="text"
        name="nome"
        value={formData.nome}
        onChange={onChange}
        required
        placeholder="Ex: Clientes"
      />

      <Select
        label="O que você quer organizar?"
        name="tipo"
        value={formData.tipo}
        onChange={onChange}
        disabled={isEditing}
        hint={tipoAtual.description}
        options={Object.entries(TIPO_INFO).map(([value, info]) => ({ value, label: info.label }))}
      />

      <div>
        <p className="block text-sm font-medium mb-1.5">Ícone</p>
        <button
          type="button"
          onClick={() => setIconPickerOpen((v) => !v)}
          aria-expanded={iconPickerOpen}
          className="flex items-center gap-2.5 text-sm text-primary font-medium hover:underline"
        >
          <span className="w-10 h-10 rounded-lg bg-primary-100 text-primary flex items-center justify-center shrink-0">
            <span className="material-icons text-[20px]" aria-hidden="true">{formData.icone}</span>
          </span>
          {iconPickerOpen ? 'Fechar' : 'Alterar ícone'}
        </button>

        {iconPickerOpen && (
          <div className="mt-3 grid grid-cols-5 gap-2">
            {MODULO_ICON_OPTIONS.map(icon => (
              <button
                key={icon}
                type="button"
                onClick={() => { onIcone(icon); setIconPickerOpen(false); }}
                title={icon}
                className={`aspect-square rounded-lg flex items-center justify-center transition-colors ${
                  formData.icone === icon
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-surface border border-divider-strong text-light-text hover:border-primary-300 hover:bg-primary-50 hover:text-primary'
                }`}
              >
                <span className="material-icons text-[20px]">{icon}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
