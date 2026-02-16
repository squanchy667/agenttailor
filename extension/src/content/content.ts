/**
 * Content script for AgentTailor Chrome extension
 * Detects ChatGPT and Claude platforms and injects context
 */

import { PLATFORMS, type Platform } from '@agenttailor/shared';

// Detect current platform
function detectPlatform(): Platform | null {
  const hostname = window.location.hostname;

  if (hostname.includes('chat.openai.com')) {
    return PLATFORMS.CHATGPT;
  }

  if (hostname.includes('claude.ai')) {
    return PLATFORMS.CLAUDE;
  }

  return null;
}

// Initialize content script
function init() {
  const platform = detectPlatform();

  if (!platform) {
    console.warn('AgentTailor: Unknown platform');
    return;
  }

  console.log(`AgentTailor: Content script initialized for ${platform}`);

  // Send ping to background script
  chrome.runtime.sendMessage({ type: 'PING', platform }, (response) => {
    console.log('Background response:', response);
  });

  // TODO: Implement platform-specific injection logic
}

// Run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
