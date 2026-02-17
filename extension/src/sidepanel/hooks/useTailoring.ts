/**
 * Hook for communicating with the service worker for tailoring operations
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Platform } from '@agenttailor/shared';
import type { ExtensionMessage } from '../../shared/types.js';

export type PanelState = 'idle' | 'tailoring' | 'preview' | 'injected' | 'error';

export interface TailoringMetadata {
  tokenCount: number;
  qualityScore: number;
  sources: SourceItem[];
}

export interface SourceItem {
  id: string;
  title: string;
  url?: string;
  type: 'doc' | 'web';
  relevanceScore: number;
  chunkText?: string;
}

interface UseTailoringResult {
  state: PanelState;
  context: string;
  metadata: TailoringMetadata | null;
  progress: string;
  progressPercent: number;
  error: string | null;
  triggerTailor: (taskText: string, projectId: string, platform: Platform) => void;
  injectContext: (context: string) => void;
  dismiss: () => void;
  resetToIdle: () => void;
}

function estimateTokenCount(text: string): number {
  return Math.ceil(text.split(/\s+/).filter(Boolean).length * 1.3);
}

export function useTailoring(): UseTailoringResult {
  const [state, setState] = useState<PanelState>('idle');
  const [context, setContext] = useState('');
  const [metadata, setMetadata] = useState<TailoringMetadata | null>(null);
  const [progress, setProgress] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const listenerRef = useRef<((message: ExtensionMessage) => void) | null>(null);

  useEffect(() => {
    const handleMessage = (message: ExtensionMessage) => {
      if (message.type === 'TAILOR_PROGRESS') {
        setState('tailoring');
        setProgress(message.status);
        setProgressPercent(message.progress);
      } else if (message.type === 'TAILOR_COMPLETE') {
        const rawMeta = message.metadata as Record<string, unknown> | null | undefined;
        const assembledContext = message.context;

        // Parse sources from metadata if available
        let sources: SourceItem[] = [];
        if (rawMeta && Array.isArray(rawMeta['sources'])) {
          sources = (rawMeta['sources'] as unknown[]).map((s, idx) => {
            const src = s as Record<string, unknown>;
            return {
              id: String(src['id'] ?? idx),
              title: String(src['title'] ?? src['name'] ?? 'Unknown'),
              url: src['url'] ? String(src['url']) : undefined,
              type: src['type'] === 'web' ? 'web' : 'doc',
              relevanceScore: typeof src['relevanceScore'] === 'number' ? src['relevanceScore'] : 0.5,
              chunkText: src['chunkText'] ? String(src['chunkText']) : undefined,
            } satisfies SourceItem;
          });
        }

        const tokenCount =
          rawMeta && typeof rawMeta['tokenCount'] === 'number'
            ? rawMeta['tokenCount']
            : estimateTokenCount(assembledContext);

        const qualityScore =
          rawMeta && typeof rawMeta['qualityScore'] === 'number'
            ? rawMeta['qualityScore']
            : 0.8;

        setContext(assembledContext);
        setMetadata({ tokenCount, qualityScore, sources });
        setState('preview');
        setProgress('');
        setProgressPercent(0);
      } else if (message.type === 'INJECTION_RESULT') {
        if (message.success) {
          setState('injected');
        } else {
          setError(message.error ?? 'Injection failed');
          setState('error');
        }
      }
    };

    listenerRef.current = handleMessage;
    chrome.runtime.onMessage.addListener(handleMessage);

    return () => {
      if (listenerRef.current) {
        chrome.runtime.onMessage.removeListener(listenerRef.current);
      }
    };
  }, []);

  const triggerTailor = useCallback(
    (taskText: string, projectId: string, platform: Platform) => {
      setState('tailoring');
      setProgress('Detecting task...');
      setProgressPercent(0);
      setError(null);
      setContext('');
      setMetadata(null);

      chrome.runtime.sendMessage(
        {
          type: 'TRIGGER_TAILOR',
          taskText,
          projectId,
          platform,
        } satisfies ExtensionMessage,
        () => {
          if (chrome.runtime.lastError) {
            setError(chrome.runtime.lastError.message ?? 'Failed to trigger tailoring');
            setState('error');
          }
        },
      );
    },
    [],
  );

  const injectContext = useCallback((ctx: string) => {
    chrome.runtime.sendMessage(
      { type: 'INJECT_CONTEXT', context: ctx } satisfies ExtensionMessage,
      () => {
        if (chrome.runtime.lastError) {
          setError(chrome.runtime.lastError.message ?? 'Failed to send inject message');
          setState('error');
        }
      },
    );
  }, []);

  const dismiss = useCallback(() => {
    setState('idle');
    setError(null);
  }, []);

  const resetToIdle = useCallback(() => {
    setState('idle');
    setContext('');
    setMetadata(null);
    setProgress('');
    setProgressPercent(0);
    setError(null);
  }, []);

  return {
    state,
    context,
    metadata,
    progress,
    progressPercent,
    error,
    triggerTailor,
    injectContext,
    dismiss,
    resetToIdle,
  };
}
