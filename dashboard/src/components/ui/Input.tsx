import { forwardRef } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  prefixIcon?: ReactNode;
  suffixIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, helperText, prefixIcon, suffixIcon, id, className = '', ...rest },
  ref
) {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-secondary-700"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {prefixIcon && (
          <span className="pointer-events-none absolute left-3 flex shrink-0 items-center text-secondary-400">
            {prefixIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          {...rest}
          className={[
            'w-full rounded-md border bg-white py-2 text-sm text-secondary-900',
            'placeholder:text-secondary-400',
            'focus:outline-none focus:ring-2 focus:ring-offset-1',
            'disabled:cursor-not-allowed disabled:bg-secondary-100 disabled:opacity-60',
            error
              ? 'border-red-400 focus:border-red-400 focus:ring-red-300'
              : 'border-secondary-300 focus:border-primary-500 focus:ring-primary-200',
            prefixIcon ? 'pl-9' : 'pl-3',
            suffixIcon ? 'pr-9' : 'pr-3',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
        />
        {suffixIcon && (
          <span className="pointer-events-none absolute right-3 flex shrink-0 items-center text-secondary-400">
            {suffixIcon}
          </span>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {!error && helperText && (
        <p className="text-xs text-secondary-500">{helperText}</p>
      )}
    </div>
  );
});
