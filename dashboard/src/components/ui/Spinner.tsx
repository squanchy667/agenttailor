export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

const sizeClasses: Record<NonNullable<SpinnerProps['size']>, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-[3px]',
};

export function Spinner({ size = 'md', label, className = '' }: SpinnerProps) {
  return (
    <span className={`inline-flex flex-col items-center gap-1 ${className}`} role="status" aria-label={label ?? 'Loading'}>
      <span
        className={`animate-spin rounded-full border-primary-200 border-t-primary-600 ${sizeClasses[size]}`}
      />
      {label && <span className="text-xs text-secondary-500">{label}</span>}
    </span>
  );
}
