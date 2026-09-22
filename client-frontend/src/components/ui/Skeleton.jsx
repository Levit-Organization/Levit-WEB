import { cn } from './cn';

/**
 * Placeholder genérico de carregamento. Componha largura/altura/formato
 * via className: <Skeleton className="h-4 w-16" />.
 */
export default function Skeleton({ className = '' }) {
  return <div className={cn('animate-pulse bg-divider/70 rounded-md', className)} />;
}
