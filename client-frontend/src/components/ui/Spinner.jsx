import { cn } from './cn';

const SIZES = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-2',
};

export default function Spinner({ size = 'md', className = '', light = false }) {
  return (
    <div
      className={cn(
        'rounded-full animate-spin border-t-transparent',
        SIZES[size] || SIZES.md,
        light ? 'border-white' : 'border-primary',
        className
      )}
    />
  );
}
