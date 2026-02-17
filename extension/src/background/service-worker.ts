/**
 * Background service worker for AgentTailor Chrome extension
 */

import { PLATFORMS } from '@agenttailor/shared';
import type { ExtensionMessage, ExtensionResponse } from '../shared/types.js';
import { SUPPORTED_DOMAINS } from '../shared/types.js';

const SUPPORTED_HOSTNAMES = Object.values(SUPPORTED_DOMAINS);

// Initialize extension
chrome.runtime.onInstalled.addListener((details) => {
  console.log('AgentTailor extension installed', details.reason);

  // Set default settings
  void chrome.storage.sync.set({
    enabled: true,
    platforms: [PLATFORMS.CHATGPT, PLATFORMS.CLAUDE],
    activeProjectId: null,
  });

  // Configure side panel to open on action click (not as default action)
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch((err: unknown) => {
    console.error('Failed to set panel behavior:', err);
  });
});

// Register side panel when navigating to supported domains
chrome.tabs.onActivated.addListener(({ tabId: activeTabId }) => {
  chrome.tabs.get(activeTabId, (tab) => {
    if (chrome.runtime.lastError) return;
    updateSidePanelForTab(tab);
  });
});

chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    updateSidePanelForTab(tab);
  }
});

/**
 * Enable or disable the side panel based on whether the current tab is a supported platform
 */
function updateSidePanelForTab(tab: chrome.tabs.Tab): void {
  if (!tab.id || !tab.url) return;

  const url = new URL(tab.url);
  const isSupported = SUPPORTED_HOSTNAMES.some((hostname) => url.hostname.includes(hostname));

  if (isSupported) {
    chrome.sidePanel
      .setOptions({
        tabId: tab.id,
        path: 'src/sidepanel/sidepanel.html',
        enabled: true,
      })
      .catch((err: unknown) => {
        console.error('Failed to enable side panel:', err);
      });
  } else {
    chrome.sidePanel
      .setOptions({
        tabId: tab.id,
        enabled: false,
      })
      .catch((err: unknown) => {
        console.error('Failed to disable side panel:', err);
      });
  }
}

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: ExtensionResponse) => void,
  ) => {
    console.log('Background received message:', message.type, 'from tab:', sender.tab?.id);

    switch (message.type) {
      case 'PING':
        sendResponse({ type: 'PONG', timestamp: Date.now() });
        break;

      case 'PLATFORM_STATUS':
        // Forward platform status to side panel if open
        forwardToSidePanel(message).catch((err: unknown) => {
          console.warn('Could not forward to side panel:', err);
        });
        sendResponse({ type: 'ACK' });
        break;

      case 'TRIGGER_TAILOR':
        // Will be handled by intelligence engine in later tasks
        console.log('Tailor triggered for platform:', message.platform);
        sendResponse({ type: 'ACK' });
        break;

      case 'INJECT_CONTEXT':
        // Forward injection request to the active content script
        if (sender.tab?.id) {
          void chrome.tabs.sendMessage(sender.tab.id, message);
        }
        sendResponse({ type: 'ACK' });
        break;

      default:
        sendResponse({ type: 'ACK' });
    }

    return true; // Keep message channel open for async response
  },
);

/**
 * Attempt to forward a message to the side panel
 */
async function forwardToSidePanel(message: ExtensionMessage): Promise<void> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, () => {
      if (chrome.runtime.lastError) {
        // Side panel not open — ignore
      }
      resolve();
    });
  });
}

console.log('AgentTailor background service worker started');
