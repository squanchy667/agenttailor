/**
 * Content script for AgentTailor Chrome extension
 * Detects ChatGPT and Claude platforms and delegates to platform-specific modules
 */

import { PLATFORMS, type Platform } from '@agenttailor/shared';
import type { ExtensionMessage } from '../shared/types.js';

/** Detect the current AI platform from hostname */
function detectPlatform(): Platform | null {
  const hostname = window.location.hostname;

  if (hostname.includes('chatgpt.com')) {
    return PLATFORMS.CHATGPT;
  }

  if (hostname.includes('claude.ai')) {
    return PLATFORMS.CLAUDE;
  }

  return null;
}

/** Send a typed message to the background service worker */
function sendMessage(message: ExtensionMessage): void {
  chrome.runtime.sendMessage(message, () => {
    if (chrome.runtime.lastError) {
      console.warn('AgentTailor: Message send failed:', chrome.runtime.lastError.message);
    }
  });
}

/** Report current platform status to background */
function reportPlatformStatus(platform: Platform): void {
  const statusMessage: ExtensionMessage = {
    type: 'PLATFORM_STATUS',
    platform,
    ready: true,
    conversationId: null, // Will be populated by platform-specific modules in T026/T027
    inputDetected: false, // Will be updated by MutationObserver in platform modules
  };
  sendMessage(statusMessage);
}

/** Initialize content script for the detected platform */
function init(): void {
  const platform = detectPlatform();

  if (!platform) {
    console.warn('AgentTailor: Unknown platform, content script inactive');
    return;
  }

  console.log(`AgentTailor: Content script initialized for platform "${platform}"`);

  // Report initial status to background
  reportPlatformStatus(platform);

  // Delegate to platform-specific module
  // Platform modules will be implemented in T026 (ChatGPT) and T027 (Claude)
  void loadPlatformModule(platform);
}

/** Dynamically load platform-specific handler */
async function loadPlatformModule(platform: Platform): Promise<void> {
  try {
    if (platform === PLATFORMS.CHATGPT) {
      const { initChatGPT } = await import('./chatgpt/index.js');
      initChatGPT();
    } else if (platform === PLATFORMS.CLAUDE) {
      // T027 will implement: import('./claude/claude-handler.js')
      console.log('AgentTailor: Claude platform module placeholder (T027)');
    }
  } catch (err: unknown) {
    console.error('AgentTailor: Failed to load platform module:', err);
  }
}

// Run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
