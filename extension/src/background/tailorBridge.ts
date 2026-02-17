/**
 * TailorBridge — Orchestration service in the extension service worker.
 *
 * Responsibilities:
 *  - Receive TRIGGER_TAILOR from content scripts or side panel
 *  - Read active project / settings from storage
 *  - Call POST /api/tailor and stream progress to the side panel
 *  - On completion, show a preview in the side panel OR auto-inject
 *  - When the user approves (INJECT_CONTEXT from side panel), forward to
 *    the correct content-script tab
 *  - Debounce rapid requests (500 ms window)
 */

import type { ExtensionMessage } from '../shared/types.js';
import { formatContextForInjection } from '../shared/contextFormatter.js';
import { getSettings, getAuthToken } from './storage.js';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/** The tab that sent the most-recent TRIGGER_TAILOR, used to route injection. */
let activeTabId: number | null = null;

/** The platform detected from the most-recent TRIGGER_TAILOR. */
let activePlatform: 'chatgpt' | 'claude' | null = null;

/** Timestamp (ms) of the last accepted TRIGGER_TAILOR, for debouncing. */
let lastTriggerTime = 0;

const DEBOUNCE_MS = 500;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Send a message to the side panel (a runtime broadcast — the side panel
 * must be open and listening for it to be received).
 */
function broadcastToSidePanel(message: ExtensionMessage): void {
  chrome.runtime.sendMessage(message, () => {
    if (chrome.runtime.lastError) {
      // Side panel may not be open — suppress silently
    }
  });
}

/**
 * Forward a message to the content script running in a specific tab.
 * Returns a Promise that resolves with the tab's response or null on error.
 */
function sendToTab(tabId: number, message: ExtensionMessage): Promise<ExtensionMessage | null> {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, (response: ExtensionMessage | undefined) => {
      if (chrome.runtime.lastError) {
        resolve(null);
      } else {
        resolve(response ?? null);
      }
    });
  });
}

/**
 * Resolve the API base URL: use the user-configured endpoint or fall back to
 * the production AgentTailor URL.
 */
function resolveApiEndpoint(configured: string): string {
  if (configured && configured.trim().length > 0) {
    return configured.replace(/\/$/, '');
  }
  return 'https://api.agenttailor.com';
}

// ---------------------------------------------------------------------------
// Core tailoring flow
// ---------------------------------------------------------------------------

/**
 * Handle a TRIGGER_TAILOR message. Implements debouncing, settings lookup,
 * API call, progress updates, auto-tailor shortcut, and preview delivery.
 */
export async function handleTailorRequest(
  message: Extract<ExtensionMessage, { type: 'TRIGGER_TAILOR' }>,
  senderTabId: number | null,
): Promise<void> {
  // Debounce
  const now = Date.now();
  if (now - lastTriggerTime < DEBOUNCE_MS) {
    console.log('[AgentTailor] TRIGGER_TAILOR debounced');
    return;
  }
  lastTriggerTime = now;

  // Store routing info for later injection
  activeTabId = senderTabId;
  activePlatform = message.platform as 'chatgpt' | 'claude';

  const startMs = Date.now();
  console.log(`[AgentTailor] Tailoring triggered for platform: ${message.platform}`);

  // ── 1. Load settings & auth ──────────────────────────────────────────────
  let settings;
  let authToken: string | null;

  try {
    [settings, authToken] = await Promise.all([getSettings(), getAuthToken()]);
  } catch (err) {
    console.error('[AgentTailor] Failed to load settings:', err);
    broadcastToSidePanel({
      type: 'TAILOR_PROGRESS',
      status: 'Failed to load extension settings',
      progress: 0,
    });
    return;
  }

  // ── 2. Resolve project ───────────────────────────────────────────────────
  const projectId = settings.activeProjectId;
  if (!projectId) {
    broadcastToSidePanel({
      type: 'TAILOR_PROGRESS',
      status: 'No active project selected. Open the extension popup to select one.',
      progress: 0,
    });
    return;
  }

  // ── 3. Progress: starting ────────────────────────────────────────────────
  broadcastToSidePanel({
    type: 'TAILOR_PROGRESS',
    status: 'Assembling context…',
    progress: 10,
  });

  // ── 4. Call /api/tailor ──────────────────────────────────────────────────
  const apiBase = resolveApiEndpoint(settings.apiEndpoint);

  let tailorData: {
    sessionId: string;
    context: string;
    sections: unknown[];
    metadata: Record<string, unknown>;
  };

  try {
    broadcastToSidePanel({
      type: 'TAILOR_PROGRESS',
      status: 'Retrieving relevant chunks…',
      progress: 30,
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${apiBase}/api/tailor`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        projectId,
        taskInput: message.taskText,
        targetPlatform: message.platform.toLowerCase(),
        options: {
          includeWebSearch: settings.webSearchEnabled,
        },
      }),
    });

    broadcastToSidePanel({
      type: 'TAILOR_PROGRESS',
      status: 'Compressing and formatting…',
      progress: 70,
    });

    if (!response.ok) {
      let errorMessage = `API error ${response.status}`;
      try {
        const errorBody = await response.json() as { error?: { message?: string } };
        if (errorBody.error?.message) {
          errorMessage = errorBody.error.message;
        }
      } catch {
        // ignore parse failure
      }
      throw new Error(errorMessage);
    }

    const body = await response.json() as { data: typeof tailorData };
    tailorData = body.data;
  } catch (err) {
    const message_ = err instanceof Error ? err.message : 'Unknown error calling /api/tailor';
    console.error('[AgentTailor] API call failed:', message_);
    broadcastToSidePanel({
      type: 'TAILOR_PROGRESS',
      status: `Error: ${message_}`,
      progress: 0,
    });
    return;
  }

  const elapsedMs = Date.now() - startMs;
  const qualityScore = typeof tailorData.metadata['qualityScore'] === 'number'
    ? tailorData.metadata['qualityScore']
    : 0;

  console.log(
    `[AgentTailor] Tailoring completed in ${elapsedMs}ms, quality: ${Math.round(qualityScore * 100)}%`,
  );

  broadcastToSidePanel({
    type: 'TAILOR_PROGRESS',
    status: 'Context ready!',
    progress: 100,
  });

  // ── 5. Auto-tailor: skip preview, inject immediately ────────────────────
  if (settings.autoTailor && activeTabId !== null && activePlatform !== null) {
    const formatted = formatContextForInjection(tailorData.context, activePlatform);

    // Optional: still broadcast a TAILOR_COMPLETE for the side panel log
    broadcastToSidePanel({
      type: 'TAILOR_COMPLETE',
      context: tailorData.context,
      metadata: tailorData.metadata,
    });

    await injectIntoTab(activeTabId, formatted);
    return;
  }

  // ── 6. Normal flow: deliver preview to side panel ────────────────────────
  broadcastToSidePanel({
    type: 'TAILOR_COMPLETE',
    context: tailorData.context,
    metadata: tailorData.metadata,
  });
}

// ---------------------------------------------------------------------------
// Injection routing
// ---------------------------------------------------------------------------

/**
 * Forward an INJECT_CONTEXT message to the stored active tab.
 * Called when the side panel sends INJECT_CONTEXT after user approval.
 */
export async function handleInjectContext(
  message: Extract<ExtensionMessage, { type: 'INJECT_CONTEXT' }>,
  senderTabId: number | null,
): Promise<void> {
  console.log('[AgentTailor] Context injection approved');

  // The side panel doesn't have a tab ID — use the stored activeTabId.
  // If the message came from a content script (unusual), prefer that tab.
  const targetTabId = senderTabId ?? activeTabId;

  if (targetTabId === null) {
    console.error('[AgentTailor] No active tab to inject into');
    broadcastToSidePanel({
      type: 'INJECTION_RESULT',
      success: false,
      error: 'No active AI tab found. Please switch to ChatGPT or Claude and try again.',
    });
    return;
  }

  // Format the context for the detected platform before forwarding
  const platform = activePlatform ?? 'chatgpt';
  const formatted = formatContextForInjection(message.context, platform);

  await injectIntoTab(targetTabId, formatted);
}

/**
 * Send the formatted context to a content script tab and relay the result
 * back to the side panel.
 */
async function injectIntoTab(tabId: number, formattedContext: string): Promise<void> {
  const response = await sendToTab(tabId, {
    type: 'INJECT_CONTEXT',
    context: formattedContext,
  });

  if (response === null) {
    console.error('[AgentTailor] No response from content script tab', tabId);
    broadcastToSidePanel({
      type: 'INJECTION_RESULT',
      success: false,
      error: 'Content script did not respond. Reload the AI tab and try again.',
    });
    return;
  }

  if (response.type === 'INJECTION_RESULT') {
    if (response.success) {
      console.log('[AgentTailor] Context injected successfully');
    } else {
      console.error('[AgentTailor] Injection failed:', response.error);
    }
    broadcastToSidePanel(response);
  }
}
