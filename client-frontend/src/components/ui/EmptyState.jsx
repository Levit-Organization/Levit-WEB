import Button from './Button';
import { cn } from './cn';

const SIZES = {
  sm: { box: 'w-12 h-12 rounded-lg', icon: 'text-[22px]' },
  md: { box: 'w-14 h-14 rounded-xl', icon: 'text-[26px]' },
  lg: { box: 'w-16 h-16 rounded-xl', icon: 'text-[30px]' },
};

/**
 * Estado vazio que ensina o próximo passo, não que só constata o vazio:
 * `description` diz o que aquilo faz, `actionLabel` dá a saída.
 */
export default function EmptyState({
  icon = 'inbox',
  title,
  description,
  actionLabel,
  actionTo,
  onAction,
  actionIcon,
  size = 'md',
  className = '',
}) {
  const sizeInfo = SIZES[size] || SIZES.md;
  const hasAction = Boolean(actionLabel && (actionTo || onAction));

  return (
    <div className={cn('text-center flex flex-col items-center', className)}>
      <div className={cn('bg-primary-100 text-primary flex items-center justify-center mb-3.5', sizeInfo.box)}>
        <span className={cn('material-icons', sizeInfo.icon)}>{icon}</span>
      </div>
      {title && <p className="text-sm font-semibold text-ink mb-1">{title}</p>}
      {description && (
        <p className="text-sm text-light-text max-w-[42ch] leading-relaxed">{description}</p>
      )}
      {hasAction && (
        <Button
          size="sm"
          variant="subtle"
          icon={actionIcon}
          to={actionTo}
          onClick={onAction}
          className="mt-4"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
