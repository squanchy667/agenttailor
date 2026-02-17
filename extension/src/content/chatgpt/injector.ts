/**
 * Text injection utilities for ChatGPT's ProseMirror editor.
 *
 * ProseMirror maintains its own internal state that is separate from the
 * raw innerHTML.  To keep React / ProseMirror in sync after a programmatic
 * write we must:
 *   1. Set innerHTML (ProseMirror uses <p> block elements)
 *   2. Move the cursor to the end (selection collapse)
 *   3. Dispatch a bubbling `input` event so ProseMirror picks up the change
 */

import { getChatInput } from './detector.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Escape plain text so it is safe to embed inside HTML.
 * We only need the minimal set for ProseMirror's text content.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Convert a plain-text string to ProseMirror-compatible innerHTML.
 * Each paragraph separated by a blank line becomes its own <p> block.
 * Single newlines within a paragraph become <br> elements.
 */
function textToHtml(text: string): string {
  // Split on blank lines to get paragraphs
  const paragraphs = text.split(/\n{2,}/);
  return paragraphs
    .map((para) => {
      const lines = para.split('\n').map(escapeHtml);
      return `<p>${lines.join('<br>')}</p>`;
    })
    .join('');
}

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

/** Dispatch an input event that bubbles, triggering ProseMirror's listener. */
function triggerInputEvent(el: HTMLElement): void {
  el.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Read the current plain-text content from the ProseMirror editor.
 * Returns an empty string when no input element is found.
 */
export function getInputContent(): string {
  const el = getChatInput();
  return el?.textContent ?? '';
}

/**
 * Replace the entire content of the ProseMirror editor with `text`.
 * Returns true on success.
 */
export function setInputContent(text: string): boolean {
  const el = getChatInput();
  if (!el) {
    console.warn('AgentTailor: ChatGPT input element not found');
    return false;
  }

  el.focus();
  el.innerHTML = textToHtml(text);
  moveCursorToEnd(el);
  triggerInputEvent(el);
  return true;
}

/**
 * Prepend `context` before whatever the user has already typed.
 * If the editor is empty, context becomes the sole content.
 * A blank line separates injected context from the original content.
 */
export function injectContext(context: string): boolean {
  const el = getChatInput();
  if (!el) {
    console.warn('AgentTailor: ChatGPT input element not found for injection');
    return false;
  }

  const existing = el.textContent?.trim() ?? '';
  const combined = existing.length > 0 ? `${context}\n\n${existing}` : context;

  el.focus();
  el.innerHTML = textToHtml(combined);
  moveCursorToEnd(el);
  triggerInputEvent(el);
  return true;
}
