/**
 * ChatGPT DOM detection utilities
 * Detects page state, conversation ID, chat input, and send button.
 * Uses fallback selector chains since ChatGPT updates its DOM frequently.
 */

/** Whether the user is on an active conversation page (vs. home/new chat) */
export function isConversationPage(): boolean {
  return /\/c\/[0-9a-f-]{36}/i.test(window.location.pathname);
}

/** Extract conversation UUID from URL, e.g. /c/<uuid> → "<uuid>" */
export function getConversationId(): string | null {
  const match = window.location.pathname.match(/\/c\/([0-9a-f-]{36})/i);
  return match?.[1] ?? null;
}

/**
 * Locate the ProseMirror chat input element.
 * ChatGPT renders a contenteditable ProseMirror div as the text area.
 * Multiple selectors are tried in order of specificity/stability.
 */
export function getChatInput(): HTMLElement | null {
  // Most stable: explicit id assigned by ChatGPT's React tree
  const byId = document.querySelector<HTMLElement>('#prompt-textarea');
  if (byId) return byId;

  // ProseMirror class — used when the div gets the role directly
  const byProseMirror = document.querySelector<HTMLElement>('div.ProseMirror');
  if (byProseMirror) return byProseMirror;

  // Contenteditable inside the composer form — broadest fallback
  const form =
    document.querySelector<HTMLElement>('form') ??
    document.querySelector<HTMLElement>('[role="presentation"]');

  if (form) {
    const editable = form.querySelector<HTMLElement>('[contenteditable="true"]');
    if (editable) return editable;
  }

  // Last resort: any contenteditable on the page
  return document.querySelector<HTMLElement>('[contenteditable="true"]');
}

/**
 * Locate the send / submit button.
 * Again, multiple selectors with fallbacks.
 */
export function getSendButton(): HTMLButtonElement | null {
  // ChatGPT assigns a data-testid to the send button
  const byTestId = document.querySelector<HTMLButtonElement>(
    'button[data-testid="send-button"]',
  );
  if (byTestId) return byTestId;

  // Composer form's submit button (aria-label variations)
  const byAriaLabel = document.querySelector<HTMLButtonElement>(
    'button[aria-label="Send prompt"], button[aria-label="Send message"]',
  );
  if (byAriaLabel) return byAriaLabel;

  // Type="submit" inside a form as broadest fallback
  const form = document.querySelector<HTMLFormElement>('form');
  if (form) {
    const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (submit) return submit;

    // Last inside form
    const buttons = form.querySelectorAll<HTMLButtonElement>('button');
    if (buttons.length > 0) return buttons.item(buttons.length - 1);
  }

  return null;
}

/** True when the chat input is present and usable in the DOM */
export function isInputReady(): boolean {
  const el = getChatInput();
  return el !== null && !el.hasAttribute('disabled');
}
