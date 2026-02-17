/**
 * MutationObserver + pushState interception for Claude.ai SPA navigation.
 * Emits typed events via callbacks so callers are decoupled from raw DOM.
 * Event type names mirror the ChatGPT observer for T029 code reuse.
 */

import { getChatInput, getConversationId, isInputReady } from './detector.js';

// ---------------------------------------------------------------------------
// Event types
// ---------------------------------------------------------------------------

export type ClaudeEvent =
  | { type: 'URL_CHANGED'; pathname: string; conversationId: string | null }
  | { type: 'INPUT_AVAILABLE'; element: HTMLElement }
  | { type: 'INPUT_GONE' }
  | { type: 'USER_TYPING'; content: string }
  | { type: 'MESSAGE_SUBMITTED' };

export type ClaudeEventHandler = (event: ClaudeEvent) => void;

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

let mutationObserver: MutationObserver | null = null;
let inputElement: HTMLElement | null = null;
let lastPathname = window.location.pathname;
let handlers: ClaudeEventHandler[] = [];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emit(event: ClaudeEvent): void {
  for (const handler of handlers) {
    try {
      handler(event);
    } catch (err) {
      console.error('AgentTailor: Claude event handler threw:', err);
    }
  }
}

function attachInputListeners(el: HTMLElement): void {
  el.addEventListener('input', () => {
    emit({ type: 'USER_TYPING', content: el.textContent ?? '' });
  });

  // Detect submission via Enter (without Shift) or form submit
  el.addEventListener('keydown', (e: Event) => {
    const ke = e as KeyboardEvent;
    if (ke.key === 'Enter' && !ke.shiftKey) {
      emit({ type: 'MESSAGE_SUBMITTED' });
    }
  });

  // Claude may wrap the input in a form; listen for submit events there too
  const form = el.closest('form');
  if (form) {
    form.addEventListener('submit', () => {
      emit({ type: 'MESSAGE_SUBMITTED' });
    });
  }

  // Also watch for fieldset-level button click (the send button)
  const fieldset = el.closest('fieldset');
  if (fieldset) {
    fieldset.addEventListener('click', (e: Event) => {
      const target = e.target as HTMLElement;
      const button = target.closest('button');
      if (button && (
        button.getAttribute('aria-label')?.toLowerCase().includes('send') ||
        button.getAttribute('type') === 'submit'
      )) {
        emit({ type: 'MESSAGE_SUBMITTED' });
      }
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
    // Check if the element is genuinely gone from the DOM (vs. Claude just thinking)
    if (!document.contains(inputElement)) {
      inputElement = null;
      emit({ type: 'INPUT_GONE' });
    }
    // If element is still in DOM but Claude is thinking, keep current state —
    // don't emit INPUT_GONE since it will be available again after the response.
  }
}

function handleUrlChange(): void {
  const pathname = window.location.pathname;
  if (pathname === lastPathname) return;
  lastPathname = pathname;

  emit({ type: 'URL_CHANGED', pathname, conversationId: getConversationId() });

  // After SPA navigation the input may not yet be in the DOM — check shortly
  setTimeout(checkForInput, 300);
  setTimeout(checkForInput, 800);
  setTimeout(checkForInput, 1500);
}

// ---------------------------------------------------------------------------
// pushState / replaceState interception (Next.js / SPA navigation)
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

/** Subscribe to Claude DOM events. Returns an unsubscribe function. */
export function on(handler: ClaudeEventHandler): () => void {
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

  // Initial check in case input is already present
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
