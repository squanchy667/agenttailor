import { useState } from 'react';
import { Button, Card } from '../ui';
import type { TailorResponse } from '../../hooks/useTailoring';
import { useToast } from '../../hooks/useToast';

export interface ContextViewerProps {
  result: TailorResponse;
}

function qualityColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 50) return 'text-amber-600';
  return 'text-red-600';
}

function qualityBg(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}

export function ContextViewer({ result }: ContextViewerProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { context, metadata } = result;
  const { tokensUsed, qualityScore } = metadata;
  const charCount = context.length;
  // qualityScore is a 0–1 float from the API
  const qualityPct = Math.round(qualityScore * 100);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(context);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  return (
    <Card
      header={
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <span className="text-sm font-semibold text-secondary-800">Assembled Context</span>
          <div className="flex items-center gap-4 flex-wrap">
            {/* Token / char counts */}
            <div className="flex items-center gap-3 text-xs text-secondary-500">
              <span>
                <span className="font-medium text-secondary-700">{tokensUsed.toLocaleString()}</span>{' '}
                tokens
              </span>
              <span>
                <span className="font-medium text-secondary-700">{charCount.toLocaleString()}</span>{' '}
                chars
              </span>
            </div>

            {/* Quality score */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-secondary-500">Quality</span>
              <div className="flex items-center gap-1.5">
                <div className="w-16 h-1.5 rounded-full bg-secondary-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${qualityBg(qualityScore)}`}
                    style={{ width: `${qualityPct}%` }}
                  />
                </div>
                <span className={`text-xs font-semibold ${qualityColor(qualityScore)}`}>
                  {qualityPct}%
                </span>
              </div>
            </div>

            {/* Copy button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleCopy()}
              iconLeft={
                copied ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3.5 w-3.5 text-green-600"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3.5 w-3.5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                  </svg>
                )
              }
            >
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </Button>
          </div>
        </div>
      }
    >
      <pre className="whitespace-pre-wrap font-mono text-xs text-secondary-800 leading-relaxed max-h-96 overflow-y-auto rounded-md bg-secondary-50 border border-secondary-200 p-4">
        {context}
      </pre>
    </Card>
  );
}
