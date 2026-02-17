import { useState } from 'react';
import { Badge, Card } from '../ui';

export interface SourceChunk {
  title: string;
  url?: string;
  relevanceScore: number;
  type: 'document' | 'web';
  text: string;
}

export interface SourceCardProps {
  source: SourceChunk;
}

function scoreColor(score: number): string {
  if (score >= 70) return 'bg-green-500';
  if (score >= 40) return 'bg-amber-500';
  return 'bg-red-500';
}

function scoreLabelColor(score: number): string {
  if (score >= 70) return 'text-green-700';
  if (score >= 40) return 'text-amber-700';
  return 'text-red-700';
}

export function SourceCard({ source }: SourceCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { title, url, relevanceScore, type, text } = source;
  const pct = Math.round(relevanceScore);

  return (
    <Card className="text-sm">
      <div className="flex flex-col gap-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary-700 hover:underline truncate block"
                title={title}
              >
                {title}
              </a>
            ) : (
              <p className="font-medium text-secondary-800 truncate" title={title}>
                {title}
              </p>
            )}
          </div>
          <Badge variant={type === 'web' ? 'info' : 'default'} className="shrink-0">
            {type === 'web' ? 'Web' : 'Document'}
          </Badge>
        </div>

        {/* Relevance score bar */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-secondary-500 w-20 shrink-0">Relevance</span>
          <div className="flex-1 h-1.5 rounded-full bg-secondary-200 overflow-hidden">
            <div
              className={`h-full rounded-full ${scoreColor(pct)}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className={`text-xs font-semibold w-10 text-right ${scoreLabelColor(pct)}`}>
            {pct}%
          </span>
        </div>

        {/* Expandable chunk text */}
        <div>
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="flex items-center gap-1 text-xs text-secondary-500 hover:text-secondary-700 focus:outline-none"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`}
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
            {expanded ? 'Hide excerpt' : 'Show excerpt'}
          </button>

          {expanded && (
            <div className="mt-2 rounded-md bg-secondary-50 border border-secondary-200 p-3">
              <p className="text-xs text-secondary-700 leading-relaxed whitespace-pre-wrap">
                {text}
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
