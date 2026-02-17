import type { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined' | 'flat';
  header?: ReactNode;
  footer?: ReactNode;
}

const variantClasses: Record<NonNullable<CardProps['variant']>, string> = {
  default: 'bg-white shadow-sm border border-secondary-200',
  outlined: 'bg-white border border-secondary-300',
  flat: 'bg-secondary-50',
};

export function Card({
  variant = 'default',
  header,
  footer,
  children,
  className = '',
  ...rest
}: CardProps) {
  return (
    <div
      {...rest}
      className={`rounded-lg overflow-hidden ${variantClasses[variant]} ${className}`}
    >
      {header && (
        <div className="px-4 py-3 border-b border-secondary-200 font-medium text-secondary-800">
          {header}
        </div>
      )}
      <div className="p-4">{children}</div>
      {footer && (
        <div className="px-4 py-3 border-t border-secondary-200 bg-secondary-50">
          {footer}
        </div>
      )}
    </div>
  );
}
