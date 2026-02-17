import { forwardRef } from 'react';
import type { TextareaHTMLAttributes } from 'react';

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, error, helperText, id, className = '', ...rest },
  ref
) {
  const textareaId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={textareaId}
          className="text-sm font-medium text-secondary-700"
        >
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={textareaId}
        {...rest}
        className={[
          'w-full rounded-md border bg-white px-3 py-2 text-sm text-secondary-900',
          'placeholder:text-secondary-400',
          'focus:outline-none focus:ring-2 focus:ring-offset-1',
          'disabled:cursor-not-allowed disabled:bg-secondary-100 disabled:opacity-60',
          'resize-y min-h-[80px]',
          error
            ? 'border-red-400 focus:border-red-400 focus:ring-red-300'
            : 'border-secondary-300 focus:border-primary-500 focus:ring-primary-200',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      {!error && helperText && (
        <p className="text-xs text-secondary-500">{helperText}</p>
      )}
    </div>
  );
});
