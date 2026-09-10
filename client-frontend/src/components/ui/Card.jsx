import { cn } from './cn';

const PADDINGS = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

export default function Card({
  as: Tag = 'div',
  padding = 'lg',
  interactive = false,
  className = '',
  children,
  ...rest
}) {
  return (
    <Tag
      className={cn(
        'bg-surface border border-divider rounded-xl shadow-xs',
        PADDINGS[padding] ?? PADDINGS.lg,
        interactive &&
          'cursor-pointer transition-[box-shadow,border-color,transform] duration-150 ease-out-quart hover:shadow-md hover:border-primary-200 hover:-translate-y-0.5',
        className
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
