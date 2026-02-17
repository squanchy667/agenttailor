/**
 * MutationObserver + pushState interception for ChatGPT SPA navigation.
 * Emits typed events via callbacks so callers are decoupled from raw DOM.
 */

import { getChatInput, getConversationId, isInputReady } from './detector.js';

// ---------------------------------------------------------------------------
// Event types
// ---------------------------------------------------------------------------

export type ChatGPTEvent =
  | { type: 'URL_CHANGED'; pathname: string; conversationId: string | null }
  | { type: 'INPUT_AVAILABLE'; element: HTMLElement }
  | { type: 'INPUT_GONE' }
  | { type: 'USER_TYPING'; content: string }
  | { type: 'MESSAGE_SUBMITTED' };

export type ChatGPTEventHandler = (event: ChatGPTEvent) => void;

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

let mutationObserver: MutationObserver | null = null;
let inputElement: HTMLElement | null = null;
let lastPathname = window.location.pathname;
let handlers: ChatGPTEventHandler[] = [];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emit(event: ChatGPTEvent): void {
  for (const handler of handlers) {
    try {
      handler(event);
    } catch (err) {
      console.error('AgentTailor: ChatGPT event handler threw:', err);
    }
  }
}

function attachInputListeners(el: HTMLElement): void {
  el.addEventListener('input', () => {
    emit({ type: 'USER_TYPING', content: el.textContent ?? '' });
  });

  // Detect submission via keydown (Enter without Shift) or via the form's submit
  el.addEventListener('keydown', (e: Event) => {
    const ke = e as KeyboardEvent;
    if (ke.key === 'Enter' && !ke.shiftKey) {
      emit({ type: 'MESSAGE_SUBMITTED' });
    }
  });

  const form = el.closest('form');
  if (form) {
    form.addEventListener('submit', () => {
      emit({ type: 'MESSAGE_SUBMITTED' });
    });
  }
}

function checkForInput(): void {
  if (isInputReady()) {
    const el = getChatInput()!;
    if (el !== inputElement) {
      inputElement = el;
      attachInputListeners(el);
      emit({ type: 'INPUT_AVAILABLE', element: el });
    }
  } else if (inputElement !== null) {
    inputElement = null;
    emit({ type: 'INPUT_GONE' });
  }
}

function handleUrlChange(): void {
  const pathname = window.location.pathname;
  if (pathname === lastPathname) return;
  lastPathname = pathname;

  emit({ type: 'URL_CHANGED', pathname, conversationId: getConversationId() });

  // After navigation the input may not be in the DOM yet — check shortly
  setTimeout(checkForInput, 300);
  setTimeout(checkForInput, 800);
  setTimeout(checkForInput, 1500);
}

// ---------------------------------------------------------------------------
// pushState / replaceState interception (React Router / SPA navigation)
// ---------------------------------------------------------------------------

function patchHistory(): void {
  const originalPushState = history.pushState.bind(history);
  const originalReplaceState = history.replaceState.bind(history);

  history.pushState = function (...args) {
    originalPushState(...args);
    handleUrlChange();
  };

  history.replaceState = function (...args) {
    originalReplaceState(...args);
    handleUrlChange();
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Subscribe to ChatGPT DOM events. Returns an unsubscribe function. */
export function on(handler: ChatGPTEventHandler): () => void {
  handlers.push(handler);
  return () => {
    handlers = handlers.filter((h) => h !== handler);
  };
}

/** Start the observer. Safe to call multiple times — only one observer runs. */
export function startObserver(): void {
  if (mutationObserver) return;

  patchHistory();

  window.addEventListener('popstate', handleUrlChange);

  mutationObserver = new MutationObserver(() => {
    handleUrlChange();
    checkForInput();
  });

  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Initial check
  checkForInput();
}

/** Stop the observer and clean up. */
export function stopObserver(): void {
  if (mutationObserver) {
    mutationObserver.disconnect();
    mutationObserver = null;
  }
  window.removeEventListener('popstate', handleUrlChange);
  handlers = [];
  inputElement = null;
}
