/**
 * Claude.ai DOM detection utilities.
 * Detects page state, conversation ID, project context, chat input, and send button.
 * Uses fallback selector chains since Claude updates its DOM periodically.
 */

/** Whether the user is on an active conversation page (vs. home/new-chat) */
export function isConversationPage(): boolean {
  return /\/chat\/[0-9a-f-]{36}/i.test(window.location.pathname);
}

/** Extract conversation UUID from URL, e.g. /chat/<uuid> → "<uuid>" */
export function getConversationId(): string | null {
  const match = window.location.pathname.match(/\/chat\/([0-9a-f-]{36})/i);
  return match?.[1] ?? null;
}

/**
 * Whether the user is viewing a project context.
 * Claude project URLs follow the pattern /project/<uuid>
 */
export function isProjectContext(): boolean {
  return /\/project\/[0-9a-f-]{36}/i.test(window.location.pathname);
}

/**
 * Extract project UUID from URL, e.g. /project/<uuid> → "<uuid>"
 * Returns null when not on a project page.
 */
export function getProjectId(): string | null {
  const match = window.location.pathname.match(/\/project\/([0-9a-f-]{36})/i);
  return match?.[1] ?? null;
}

/**
 * Locate Claude's contenteditable chat input element.
 * Claude renders a plain contenteditable div (not ProseMirror in all versions).
 * Multiple selectors are tried in order of specificity/stability.
 */
export function getChatInput(): HTMLElement | null {
  // Most specific: fieldset wraps the input area in Claude's composer
  const fieldset = document.querySelector<HTMLElement>('fieldset');
  if (fieldset) {
    const editable = fieldset.querySelector<HTMLElement>('[contenteditable="true"]');
    if (editable) return editable;
  }

  // Some Claude versions use ProseMirror wrapper inside the composer
  const proseMirror = document.querySelector<HTMLElement>('div.ProseMirror[contenteditable]');
  if (proseMirror) return proseMirror;

  // Element with a data-placeholder attribute is typically the editor
  const withPlaceholder = document.querySelector<HTMLElement>('[data-placeholder][contenteditable="true"]');
  if (withPlaceholder) return withPlaceholder;

  // Contenteditable inside a form or presentation wrapper
  const composerAreas = [
    'form [contenteditable="true"]',
    '[role="presentation"] [contenteditable="true"]',
    'main [contenteditable="true"]',
  ];
  for (const selector of composerAreas) {
    const el = document.querySelector<HTMLElement>(selector);
    if (el) return el;
  }

  // Last resort: any contenteditable on the page
  return document.querySelector<HTMLElement>('[contenteditable="true"]');
}

/**
 * Locate the send / submit button in Claude's UI.
 * Multiple selectors with fallbacks.
 */
export function getSendButton(): HTMLButtonElement | null {
  // Aria-label is the most stable identifier
  const byAriaLabel = document.querySelector<HTMLButtonElement>(
    'button[aria-label="Send message"], button[aria-label="Send Message"]',
  );
  if (byAriaLabel) return byAriaLabel;

  // Claude sometimes uses data-testid attributes
  const byTestId = document.querySelector<HTMLButtonElement>(
    'button[data-testid="send-button"]',
  );
  if (byTestId) return byTestId;

  // Type="submit" inside a fieldset (Claude's composer uses fieldset)
  const fieldset = document.querySelector<HTMLElement>('fieldset');
  if (fieldset) {
    const submit = fieldset.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (submit) return submit;

    // Last button inside fieldset is usually the send button
    const buttons = fieldset.querySelectorAll<HTMLButtonElement>('button');
    if (buttons.length > 0) return buttons.item(buttons.length - 1);
  }

  // Type="submit" inside a form
  const form = document.querySelector<HTMLFormElement>('form');
  if (form) {
    const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (submit) return submit;
  }

  return null;
}

/**
 * Detect whether Claude is currently generating a response ("Thinking..." state).
 * While thinking, injection should be deferred.
 */
export function isClaudeThinking(): boolean {
  // Claude shows a stop/cancel button while streaming a response
  const stopButton = document.querySelector<HTMLElement>(
    'button[aria-label="Stop"], button[aria-label="Stop generating"]',
  );
  if (stopButton) return true;

  // Some versions use a specific class or attribute for the streaming indicator
  const thinkingIndicator = document.querySelector<HTMLElement>(
    '[data-is-streaming="true"], .claude-thinking',
  );
  if (thinkingIndicator) return true;

  return false;
}

/** True when the chat input is present, usable, and Claude is not currently responding */
export function isInputReady(): boolean {
  const el = getChatInput();
  if (!el) return false;
  if (el.hasAttribute('disabled')) return false;
  if (isClaudeThinking()) return false;
  return true;
}
