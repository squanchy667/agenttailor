/**
 * Side panel component for AgentTailor Chrome extension
 * States: idle | tailoring | preview | injected | error
 */

import { useEffect, useState } from 'react';
import type { Platform } from '@agenttailor/shared';
import type { ExtensionMessage } from '../shared/types.js';
import { useTailoring } from './hooks/useTailoring.js';
import { StatusIndicator } from './components/StatusIndicator.js';
import { ContextPreview } from './components/ContextPreview.js';
import { SourceList } from './components/SourceList.js';
import { EditableContext } from './components/EditableContext.js';

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = {
  root: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100vh',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    backgroundColor: '#f9fafb',
    color: '#111827',
    overflow: 'hidden',
  } as React.CSSProperties,

  header: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    gap: '8px',
    flexShrink: 0,
  } as React.CSSProperties,

  logo: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#111827',
    letterSpacing: '-0.02em',
  } as React.CSSProperties,

  logoAccent: {
    color: '#4f46e5',
  } as React.CSSProperties,

  platformBadge: {
    marginLeft: 'auto',
    fontSize: '10px',
    fontWeight: '600',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    padding: '2px 8px',
    borderRadius: '10px',
    backgroundColor: '#ede9fe',
    color: '#5b21b6',
    flexShrink: 0,
  } as React.CSSProperties,

  body: {
    flex: 1,
    overflowY: 'auto' as const,
    display: 'flex',
    flexDirection: 'column' as const,
  } as React.CSSProperties,

  footer: {
    flexShrink: 0,
    borderTop: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
    padding: '12px 16px',
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  } as React.CSSProperties,

  btnPrimary: {
    flex: 1,
    padding: '9px 16px',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    letterSpacing: '-0.01em',
  } as React.CSSProperties,

  btnSecondary: {
    padding: '9px 14px',
    backgroundColor: 'transparent',
    color: '#374151',
    border: '1.5px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
  } as React.CSSProperties,

  btnText: {
    padding: '9px 8px',
    backgroundColor: 'transparent',
    color: '#6b7280',
    border: 'none',
    fontSize: '13px',
    cursor: 'pointer',
    fontWeight: '400',
  } as React.CSSProperties,
} as const;

// ─── Idle State ───────────────────────────────────────────────────────────────

function IdleState({ isReady, platform }: { isReady: boolean; platform: Platform | null }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        padding: '32px 24px',
        gap: '16px',
        textAlign: 'center',
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          backgroundColor: '#ede9fe',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M9 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-4"
            stroke="#4f46e5"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M9 3v18M15 3v18M3 9h18M3 15h18"
            stroke="#4f46e5"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <div>
        <div
          style={{
            fontSize: '15px',
            fontWeight: '600',
            color: '#111827',
            marginBottom: '6px',
          }}
        >
          Ready to tailor
        </div>
        <p
          style={{
            margin: 0,
            fontSize: '13px',
            color: '#6b7280',
            lineHeight: '1.6',
            maxWidth: '220px',
          }}
        >
          {isReady && platform
            ? `Connected to ${platform === 'chatgpt' ? 'ChatGPT' : 'Claude'}. Start a conversation to assemble context automatically.`
            : 'Open ChatGPT or Claude in a tab, then click "Tailor" to assemble optimal context from your project docs.'}
        </p>
      </div>

      {/* Connection indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span
          style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            backgroundColor: isReady ? '#10b981' : '#9ca3af',
            display: 'inline-block',
          }}
        />
        <span style={{ fontSize: '11px', color: '#9ca3af' }}>
          {isReady ? `Connected — ${platform ?? 'platform'}` : 'Waiting for platform…'}
        </span>
      </div>
    </div>
  );
}

// ─── Injected State ───────────────────────────────────────────────────────────

function InjectedState({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        padding: '32px 24px',
        gap: '16px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          backgroundColor: '#d1fae5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
          <path
            d="M5 13l6 6 10-11"
            stroke="#10b981"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div>
        <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827', marginBottom: '6px' }}>
          Context injected!
        </div>
        <p style={{ margin: 0, fontSize: '13px', color: '#6b7280', lineHeight: '1.6' }}>
          Your assembled context has been sent to the AI. The conversation is ready.
        </p>
      </div>

      <button onClick={onDismiss} style={s.btnSecondary}>
        Done
      </button>
    </div>
  );
}

// ─── Main SidePanel ───────────────────────────────────────────────────────────

export function SidePanel() {
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [editedContext, setEditedContext] = useState('');

  const {
    state,
    context,
    metadata,
    progress,
    progressPercent,
    error,
    injectContext,
    dismiss,
    resetToIdle,
  } = useTailoring();

  // Keep editedContext in sync when a new tailoring result arrives
  useEffect(() => {
    if (context) {
      setEditedContext(context);
    }
  }, [context]);

  // Listen for platform status updates from content scripts
  useEffect(() => {
    const handleMessage = (message: ExtensionMessage) => {
      if (message.type === 'PLATFORM_STATUS') {
        setPlatform(message.platform);
        setIsReady(message.ready);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    // Ping to get current status
    chrome.runtime.sendMessage({ type: 'PING' } satisfies ExtensionMessage, () => {
      if (chrome.runtime.lastError) {
        // Background may not be ready yet — that's fine
      }
    });

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  async function handleCopyToClipboard() {
    try {
      await navigator.clipboard.writeText(editedContext || context);
    } catch {
      // Fallback: do nothing — clipboard may not be available in side panel context
    }
  }

  function handleInject() {
    injectContext(editedContext || context);
  }

  const showPreview = state === 'preview';
  const showTailoring = state === 'tailoring';
  const showInjected = state === 'injected';
  const showIdle = state === 'idle';
  const showError = state === 'error';

  return (
    <div style={s.root}>
      {/* ── Header ── */}
      <header style={s.header}>
        <div style={s.logo}>
          Agent<span style={s.logoAccent}>Tailor</span>
        </div>
        {platform && (
          <span style={s.platformBadge}>
            {platform === 'chatgpt' ? 'ChatGPT' : 'Claude'}
          </span>
        )}
      </header>

      {/* ── Body ── */}
      <div style={s.body}>
        {/* Idle */}
        {showIdle && <IdleState isReady={isReady} platform={platform} />}

        {/* Tailoring / Error */}
        {(showTailoring || showError) && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              padding: '32px 24px',
            }}
          >
            <StatusIndicator
              state={state}
              progress={progress}
              progressPercent={progressPercent}
              error={error}
            />
            {showError && (
              <button
                onClick={resetToIdle}
                style={{ ...s.btnSecondary, marginTop: '16px' }}
              >
                Try again
              </button>
            )}
          </div>
        )}

        {/* Injected */}
        {showInjected && <InjectedState onDismiss={resetToIdle} />}

        {/* Preview */}
        {showPreview && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {/* Quality score banner */}
            {metadata && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  backgroundColor: '#f0fdf4',
                  borderBottom: '1px solid #bbf7d0',
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#10b981',
                    display: 'inline-block',
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: '12px', color: '#065f46', fontWeight: '500' }}>
                  Context ready — quality score:{' '}
                  {Math.round(metadata.qualityScore * 100)}%
                </span>
              </div>
            )}

            {/* Context preview (read-only collapsible) */}
            <div style={{ borderBottom: '1px solid #e5e7eb' }}>
              <ContextPreview
                context={context}
                tokenCount={metadata?.tokenCount ?? 0}
              />
            </div>

            {/* Sources */}
            {metadata && metadata.sources.length > 0 && (
              <div style={{ borderBottom: '1px solid #e5e7eb' }}>
                <SourceList sources={metadata.sources} />
              </div>
            )}

            {/* Editable context */}
            <div style={{ borderBottom: '1px solid #e5e7eb' }}>
              <EditableContext
                originalContext={context}
                platform={platform ?? undefined}
                onChange={setEditedContext}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Footer (Preview state only) ── */}
      {showPreview && (
        <footer style={s.footer}>
          <button onClick={handleInject} style={s.btnPrimary}>
            Inject Context
          </button>
          <button onClick={handleCopyToClipboard} style={s.btnSecondary} title="Copy to clipboard">
            Copy
          </button>
          <button onClick={dismiss} style={s.btnText}>
            Dismiss
          </button>
        </footer>
      )}
    </div>
  );
}
