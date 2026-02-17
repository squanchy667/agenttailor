import { Spinner } from '../ui';
import type { DocumentStatus as DocumentStatusValue } from '../../hooks/useDocuments';

export interface DocumentStatusProps {
  status: DocumentStatusValue;
  className?: string;
}

export function DocumentStatus({ status, className = '' }: DocumentStatusProps) {
  if (status === 'PROCESSING') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 ${className}`}
        aria-label="Processing"
      >
        <Spinner size="sm" />
        Processing
      </span>
    );
  }

  if (status === 'READY') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium bg-accent-100 text-accent-700 ${className}`}
        aria-label="Ready"
      >
        <svg
          className="h-3 w-3"
          viewBox="0 0 12 12"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M10.293 2.293a1 1 0 011.414 1.414l-6 6a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414L5 7.586l5.293-5.293z"
            clipRule="evenodd"
          />
        </svg>
        Ready
      </span>
    );
  }

  // ERROR
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-700 ${className}`}
      aria-label="Error"
    >
      <svg
        className="h-3 w-3"
        viewBox="0 0 12 12"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M4.293 4.293a1 1 0 011.414 0L6 5.586l.293-.293a1 1 0 111.414 1.414L7.414 7l.293.293a1 1 0 01-1.414 1.414L6 8.414l-.293.293a1 1 0 01-1.414-1.414L4.586 7l-.293-.293a1 1 0 010-1.414z"
          clipRule="evenodd"
        />
      </svg>
      Error
    </span>
  );
}
