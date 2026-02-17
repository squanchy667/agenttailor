import { Button } from './Button';

export interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorBanner({ message, onRetry, className = '' }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className={`flex items-start gap-3 rounded-md border border-red-300 bg-red-50 px-4 py-3 ${className}`}
    >
      {/* Error icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5 shrink-0 text-red-500 mt-0.5"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
      <p className="flex-1 text-sm text-red-700">{message}</p>
      {onRetry && (
        <Button variant="ghost" size="sm" onClick={onRetry} className="shrink-0 text-red-600 hover:bg-red-100">
          Retry
        </Button>
      )}
    </div>
  );
}
