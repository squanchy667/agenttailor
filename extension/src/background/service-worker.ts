/**
 * Background service worker for AgentTailor Chrome extension
 */

import { PLATFORMS } from '@agenttailor/shared';

// Initialize extension
chrome.runtime.onInstalled.addListener((details) => {
  console.log('AgentTailor extension installed', details.reason);

  // Set default settings
  chrome.storage.sync.set({
    enabled: true,
    platforms: [PLATFORMS.CHATGPT, PLATFORMS.CLAUDE],
  });
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message, 'from:', sender.tab?.id);

  if (message.type === 'PING') {
    sendResponse({ type: 'PONG', timestamp: Date.now() });
  }

  return true; // Keep message channel open for async response
});

// Log when extension starts
console.log('AgentTailor background service worker started');
