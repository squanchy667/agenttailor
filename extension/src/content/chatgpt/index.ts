/**
 * ChatGPT platform module — orchestrates detection, observation, and injection.
 *
 * Responsibilities:
 *  - Start the MutationObserver (SPA navigation + input detection)
 *  - Maintain live platform-status state and push updates to the background
 *  - Listen for INJECT_CONTEXT messages and delegate to the injector
 *  - Report INJECTION_RESULT back to the sender
 */

import { PLATFORMS } from '@agenttailor/shared';
import type { ExtensionMessage } from '../../shared/types.js';
import { getConversationId, isInputReady } from './detector.js';
import { on, startObserver } from './domObserver.js';
import { injectContext } from './injector.js';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

interface PlatformState {
  ready: boolean;
  conversationId: string | null;
  inputDetected: boolean;
}

let state: PlatformState = {
  ready: false,
  conversationId: null,
  inputDetected: false,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sendStatus(): void {
  const message: ExtensionMessage = {
    type: 'PLATFORM_STATUS',
    platform: PLATFORMS.CHATGPT,
    ready: state.ready,
    conversationId: state.conversationId,
    inputDetected: state.inputDetected,
  };

  chrome.runtime.sendMessage(message, () => {
    if (chrome.runtime.lastError) {
      // Background may not be listening yet — suppress the error silently
    }
  });
}

function updateState(partial: Partial<PlatformState>): void {
  state = { ...state, ...partial };
  sendStatus();
}

// ---------------------------------------------------------------------------
// Message handler
// ---------------------------------------------------------------------------

function handleMessage(
  message: unknown,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: ExtensionMessage) => void,
): boolean {
  if (typeof message !== 'object' || message === null) return false;
  const msg = message as ExtensionMessage;

  if (msg.type === 'INJECT_CONTEXT') {
    const success = injectContext(msg.context);
    const result: ExtensionMessage = success
      ? { type: 'INJECTION_RESULT', success: true }
      : {
          type: 'INJECTION_RESULT',
          success: false,
          error: 'Input element not found or injection failed',
        };
    sendResponse(result);
    return true; // keep channel open for async response
  }

  return false;
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/** Initialize the ChatGPT content module. Safe to call once per page load. */
export function initChatGPT(): void {
  console.log('AgentTailor: Initializing ChatGPT platform module');

  // Seed state from current page
  updateState({
    ready: true,
    conversationId: getConversationId(),
    inputDetected: isInputReady(),
  });

  // Subscribe to DOM events from the observer
  on((event) => {
    switch (event.type) {
      case 'URL_CHANGED':
        updateState({
          conversationId: event.conversationId,
          inputDetected: isInputReady(),
        });
        break;

      case 'INPUT_AVAILABLE':
        updateState({ inputDetected: true });
        break;

      case 'INPUT_GONE':
        updateState({ inputDetected: false });
        break;

      // USER_TYPING and MESSAGE_SUBMITTED are informational — no state update needed
      default:
        break;
    }
  });

  // Start watching the DOM
  startObserver();

  // Listen for messages from the background / sidepanel
  chrome.runtime.onMessage.addListener(handleMessage);

  console.log('AgentTailor: ChatGPT platform module ready', state);
}
