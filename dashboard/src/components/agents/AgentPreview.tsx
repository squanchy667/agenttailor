import { useState } from 'react';

interface AgentPreviewProps {
  content: string;
  qualityScore: number;
  format: string;
  configSourceCount: number;
  processingTimeMs: number;
}

export function AgentPreview({
  content,
  qualityScore,
  format,
  configSourceCount,
  processingTimeMs,
}: AgentPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const qualityPercent = Math.round(qualityScore * 100);

  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden">
      {/* Header with quality score */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div
            className={[
              'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
              qualityPercent >= 70
                ? 'bg-green-100 text-green-700'
                : qualityPercent >= 40
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-red-100 text-red-700',
            ].join(' ')}
          >
            {qualityPercent}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">Quality Score: {qualityPercent}%</p>
            <p className="text-xs text-slate-500">
              {configSourceCount} config source{configSourceCount !== 1 ? 's' : ''} &middot;{' '}
              {(processingTimeMs / 1000).toFixed(1)}s
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500 px-2 py-0.5 bg-white rounded border border-slate-200">
            {format === 'CLAUDE_AGENT' ? 'Claude Agent' : format === 'CURSOR_RULES' ? 'Cursor Rules' : 'System Prompt'}
          </span>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-slate-400 hover:text-slate-600"
          >
            <svg className={`w-4 h-4 transition-transform ${isExpanded ? '' : '-rotate-90'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 max-h-96 overflow-y-auto">
          <pre className="text-xs text-slate-700 font-mono whitespace-pre-wrap leading-relaxed">
            {content}
          </pre>
        </div>
      )}
    </div>
  );
}
