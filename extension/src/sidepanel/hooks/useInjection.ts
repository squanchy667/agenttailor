/**
 * Hook for managing the context injection approval flow in the side panel.
 *
 * Receives a ready context string (from useTailoring's TAILOR_COMPLETE) and
 * exposes approve / reject actions plus a status value that reflects where
 * in the flow the user currently is.
 */

import { useCallback, useState } from 'react';
import type { ExtensionMessage } from '../../shared/types.js';

export type InjectionStatus = 'pending' | 'approved' | 'injected' | 'failed';

export interface UseInjectionResult {
  status: InjectionStatus;
  injectionError: string | null;
  approve: (editedContext: string) => void;
  reject: () => void;
  reset: () => void;
}

export function useInjection(): UseInjectionResult {
  const [status, setStatus] = useState<InjectionStatus>('pending');
  const [injectionError, setInjectionError] = useState<string | null>(null);

  /**
   * User approved the context (optionally after editing).
   * Sends INJECT_CONTEXT to the background, which routes it to the content
   * script in the active AI tab.
   *
   * The background will respond with INJECTION_RESULT via a broadcast — the
   * useTailoring hook already handles that message to drive the outer panel
   * state, but we also track it here for fine-grained button states.
   */
  const approve = useCallback((editedContext: string) => {
    setStatus('approved');
    setInjectionError(null);

    console.log('[AgentTailor] Context injection approved');

    chrome.runtime.sendMessage(
      { type: 'INJECT_CONTEXT', context: editedContext } satisfies ExtensionMessage,
      (response: ExtensionMessage | undefined) => {
        if (chrome.runtime.lastError) {
          const msg = chrome.runtime.lastError.message ?? 'Failed to send injection request';
          setInjectionError(msg);
          setStatus('failed');
          return;
        }

        if (response?.type === 'INJECTION_RESULT') {
          if (response.success) {
            setStatus('injected');
          } else {
            setInjectionError(response.error ?? 'Injection failed');
            setStatus('failed');
          }
        }
        // If no direct response, the background will broadcast INJECTION_RESULT
        // which useTailoring handles. We stay in 'approved' status until that
        // lands and the parent component updates its own state.
      },
    );
  }, []);

  /**
   * User rejected / dismissed the preview without injecting.
   * Callers can handle the outer state via useTailoring's dismiss().
   */
  const reject = useCallback(() => {
    setStatus('pending');
    setInjectionError(null);
  }, []);

  /**
   * Reset to initial pending state (e.g. when a new tailoring result arrives).
   */
  const reset = useCallback(() => {
    setStatus('pending');
    setInjectionError(null);
  }, []);

  return { status, injectionError, approve, reject, reset };
}
