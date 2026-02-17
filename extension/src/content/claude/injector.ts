/**
 * Text injection utilities for Claude's contenteditable editor.
 *
 * Claude's input is a plain contenteditable div (not always ProseMirror).
 * To keep the framework's internal state in sync after a programmatic write:
 *   1. Focus the element
 *   2. Set innerText / textContent to the desired content
 *   3. Dispatch a bubbling `input` event so React picks up the change
 *   4. Optionally dispatch `beforeinput` for frameworks that listen at that layer
 *   5. Move the cursor to the end so the user can continue typing naturally
 */

import { getChatInput, isClaudeThinking } from './detector.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Place the cursor at the end of a contenteditable element. */
function moveCursorToEnd(el: HTMLElement): void {
  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false); // collapse to end
  selection.removeAllRanges();
  selection.addRange(range);
}

/** Dispatch the events that signal content has changed programmatically. */
function triggerChangeEvents(el: HTMLElement): void {
  // beforeinput — some framework versions listen here
  el.dispatchEvent(
    new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText' }),
  );
  // input — the standard event React and Vue listen for
  el.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
}

/**
 * Convert plain text to paragraph-based HTML suitable for a contenteditable div.
 * Double newlines → separate <p> blocks; single newlines → <br> within a block.
 */
function textToHtml(text: string): string {
  function escapeHtml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  const paragraphs = text.split(/\n{2,}/);
  return paragraphs
    .map((para) => {
      const lines = para.split('\n').map(escapeHtml);
      return `<p>${lines.join('<br>')}</p>`;
    })
    .join('');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Read the current plain-text content from Claude's editor.
 * Returns an empty string when no input element is found.
 */
export function getInputContent(): string {
  const el = getChatInput();
  return el?.textContent ?? '';
}

/**
 * Replace the entire content of Claude's editor with `text`.
 * Returns true on success, false if the element is not found or Claude is thinking.
 */
export function setInputContent(text: string): boolean {
  const el = getChatInput();
  if (!el) {
    console.warn('AgentTailor: Claude input element not found');
    return false;
  }

  if (isClaudeThinking()) {
    console.warn('AgentTailor: Claude is currently responding — injection deferred');
    return false;
  }

  el.focus();
  el.innerHTML = textToHtml(text);
  moveCursorToEnd(el);
  triggerChangeEvents(el);
  return true;
}

/**
 * Prepend `context` before whatever the user has already typed.
 * If the editor is empty, context becomes the sole content.
 * A blank line separates injected context from the original user content.
 *
 * Returns true on success, false if injection was not possible.
 */
export function injectContext(context: string): boolean {
  const el = getChatInput();
  if (!el) {
    console.warn('AgentTailor: Claude input element not found for injection');
    return false;
  }

  if (isClaudeThinking()) {
    console.warn('AgentTailor: Claude is currently responding — context injection deferred');
    return false;
  }

  const existing = el.textContent?.trim() ?? '';
  const combined = existing.length > 0 ? `${context}\n\n${existing}` : context;

  el.focus();
  el.innerHTML = textToHtml(combined);
  moveCursorToEnd(el);
  triggerChangeEvents(el);
  return true;
}
