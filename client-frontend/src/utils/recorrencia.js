/** Opções da coluna "Repetição" (iguais a RecorrenciaService::PERIODOS no backend). */
export const REPETICOES = [
  { valor: 'semanal', rotulo: 'Toda semana' },
  { valor: 'quinzenal', rotulo: 'A cada 15 dias' },
  { valor: 'mensal', rotulo: 'Todo mês' },
  { valor: 'trimestral', rotulo: 'A cada 3 meses' },
  { valor: 'anual', rotulo: 'Todo ano' },
];

export const rotuloDaRepeticao = (valor) => REPETICOES.find((r) => r.valor === valor)?.rotulo ?? null;
