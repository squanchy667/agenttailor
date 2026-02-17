import { Button } from '../ui';

export type ProcessingStep = 'Upload' | 'Process' | 'Chunk' | 'Embed' | 'Ready';

const STEPS: ProcessingStep[] = ['Upload', 'Process', 'Chunk', 'Embed', 'Ready'];

export interface ProcessingProgressProps {
  currentStep: ProcessingStep;
  hasError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  className?: string;
}

export function ProcessingProgress({
  currentStep,
  hasError = false,
  errorMessage,
  onRetry,
  className = '',
}: ProcessingProgressProps) {
  const currentIndex = STEPS.indexOf(currentStep);

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <ol className="flex items-center gap-0">
        {STEPS.map((step, index) => {
          const isCompleted = !hasError && index < currentIndex;
          const isCurrent = index === currentIndex;
          const isError = hasError && isCurrent;
          const isPending = index > currentIndex;

          return (
            <li key={step} className="flex items-center">
              {/* Step circle */}
              <div className="flex flex-col items-center gap-1">
                <div
                  className={[
                    'h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors',
                    isCompleted
                      ? 'bg-accent-600 text-white'
                      : isError
                      ? 'bg-red-500 text-white'
                      : isCurrent
                      ? 'bg-primary-600 text-white ring-4 ring-primary-100'
                      : 'bg-secondary-100 text-secondary-400',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isCompleted ? (
                    <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                      <path
                        fillRule="evenodd"
                        d="M13.707 4.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414L7 9.586l5.293-5.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : isError ? (
                    <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L8 6.586l2.293-2.293a1 1 0 111.414 1.414L9.414 8l2.293 2.293a1 1 0 01-1.414 1.414L8 9.414l-2.293 2.293a1 1 0 01-1.414-1.414L6.586 8 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <span
                  className={[
                    'text-xs whitespace-nowrap',
                    isCompleted
                      ? 'text-accent-700 font-medium'
                      : isError
                      ? 'text-red-600 font-medium'
                      : isCurrent
                      ? 'text-primary-700 font-medium'
                      : isPending
                      ? 'text-secondary-400'
                      : 'text-secondary-600',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {step}
                </span>
              </div>

              {/* Connector line between steps */}
              {index < STEPS.length - 1 && (
                <div
                  className={[
                    'h-0.5 w-8 sm:w-12 mx-1 mb-4 transition-colors',
                    index < currentIndex && !hasError
                      ? 'bg-accent-400'
                      : 'bg-secondary-200',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>

      {/* Error message and retry */}
      {hasError && (
        <div className="flex items-center gap-3 rounded-md bg-red-50 border border-red-200 px-3 py-2">
          <p className="text-sm text-red-700 flex-1">
            {errorMessage ?? 'Processing failed. Please try again.'}
          </p>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
