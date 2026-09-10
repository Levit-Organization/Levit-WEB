import Card from './Card';
import { cn } from './cn';

const VARIANTS = {
  primary: 'bg-primary-100 text-primary-700',
  success: 'bg-success-bg text-success',
  warning: 'bg-warning-bg text-warning',
  info: 'bg-info-bg text-info',
  default: 'bg-background text-light-text',
};

/**
 * `trend`: { direction: 'up' | 'down', label: string } — variação com
 * significado (subir contratação é bom, subir tempo de processo é ruim), então
 * quem chama decide a cor via `trendPositive`.
 */
export default function StatCard({
  icon,
  value,
  label,
  hint,
  variant = 'primary',
  badge,
  trend,
  trendPositive = true,
  empty = false,
  className = '',
}) {
  return (
    <Card padding="md" className={cn('flex items-start gap-3.5', className)}>
      {icon && (
        <div
          className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
            VARIANTS[variant] || VARIANTS.primary
          )}
        >
          <span className="material-icons text-[20px]">{icon}</span>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={cn('text-3xl font-bold leading-none tabular', empty ? 'text-light-text' : 'text-ink')}>
            {value}
          </p>
          {trend && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 text-2xs font-semibold',
                trendPositive ? 'text-success' : 'text-danger'
              )}
            >
              <span className="material-icons text-[14px]">
                {trend.direction === 'down' ? 'trending_down' : 'trending_up'}
              </span>
              {trend.label}
            </span>
          )}
          {badge}
        </div>
        <p className="text-sm text-light-text mt-1.5 truncate">{label}</p>
        {hint && <p className="text-2xs text-light-text mt-0.5 truncate">{hint}</p>}
      </div>
    </Card>
  );
}
