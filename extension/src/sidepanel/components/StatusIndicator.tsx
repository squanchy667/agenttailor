/**
 * Visual status indicator component for the side panel
 * Shows animated spinner during tailoring, check/X icons on completion
 */

import { useEffect, useState } from 'react';
import type { PanelState } from '../hooks/useTailoring.js';

interface StatusIndicatorProps {
  state: PanelState;
  progress: string;
  progressPercent: number;
  error: string | null;
}

const SPINNER_KEYFRAME = `
@keyframes at-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes at-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
`;

function injectKeyframes() {
  if (document.getElementById('at-status-keyframes')) return;
  const style = document.createElement('style');
  style.id = 'at-status-keyframes';
  style.textContent = SPINNER_KEYFRAME;
  document.head.appendChild(style);
}

function formatElapsed(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function StatusIndicator({
  state,
  progress,
  progressPercent,
  error,
}: StatusIndicatorProps) {
  const [startTime] = useState<number>(() => Date.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    injectKeyframes();
  }, []);

  useEffect(() => {
    if (state !== 'tailoring') return;
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 200);
    return () => clearInterval(interval);
  }, [state, startTime]);

  if (state === 'idle') return null;

  const container: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 0',
  };

  if (state === 'tailoring') {
    return (
      <div style={container}>
        {/* Spinner */}
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            border: '3px solid #e5e7eb',
            borderTopColor: '#4f46e5',
            animation: 'at-spin 0.8s linear infinite',
          }}
        />

        {/* Progress text */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: '13px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '4px',
              animation: 'at-pulse 1.5s ease-in-out infinite',
            }}
          >
            {progress || 'Processing...'}
          </div>
          <div style={{ fontSize: '11px', color: '#9ca3af' }}>
            {formatElapsed(elapsed)}
          </div>
        </div>

        {/* Progress bar */}
        {progressPercent > 0 && (
          <div
            style={{
              width: '100%',
              height: '4px',
              backgroundColor: '#e5e7eb',
              borderRadius: '2px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${Math.min(100, progressPercent)}%`,
                backgroundColor: '#4f46e5',
                borderRadius: '2px',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        )}
      </div>
    );
  }

  if (state === 'injected') {
    return (
      <div style={{ ...container, gap: '8px' }}>
        {/* Green check circle */}
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: '#d1fae5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M4 10l4.5 4.5 7.5-8"
              stroke="#10b981"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div style={{ fontSize: '13px', fontWeight: '500', color: '#059669' }}>
          Context injected
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div style={{ ...container, gap: '8px' }}>
        {/* Red X circle */}
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: '#fee2e2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M6 6l8 8M14 6l-8 8"
              stroke="#ef4444"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '13px', fontWeight: '500', color: '#dc2626' }}>
            Tailoring failed
          </div>
          {error && (
            <div
              style={{
                fontSize: '11px',
                color: '#9ca3af',
                marginTop: '4px',
                maxWidth: '200px',
              }}
            >
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
