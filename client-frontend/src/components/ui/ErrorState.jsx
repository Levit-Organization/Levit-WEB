import EmptyState from './EmptyState';

/** Estado de falha de carregamento com saída: "Tentar novamente". */
export default function ErrorState({
  title = 'Não foi possível carregar',
  description = 'Verifique sua conexão e tente de novo.',
  onRetry,
  size = 'md',
  className = '',
}) {
  return (
    <EmptyState
      icon="error_outline"
      size={size}
      title={title}
      description={description}
      actionLabel={onRetry ? 'Tentar novamente' : undefined}
      actionIcon="refresh"
      onAction={onRetry}
      className={className}
    />
  );
}
