/**
 * Background service worker for AgentTailor Chrome extension
 */

import type { ExtensionMessage, ExtensionResponse } from '../shared/types.js';
import { SUPPORTED_DOMAINS } from '../shared/types.js';
import { updateSettings } from './storage.js';
import { handleTailorRequest, handleInjectContext } from './tailorBridge.js';

const SUPPORTED_HOSTNAMES = Object.values(SUPPORTED_DOMAINS);

// Initialize extension
chrome.runtime.onInstalled.addListener((details) => {
  console.log('AgentTailor extension installed', details.reason);

  // Set default settings (storage.ts defaults are applied on first read,
  // but we also write them on install so other contexts see them immediately)
  void updateSettings({
    enabled: true,
    activeProjectId: null,
    apiEndpoint: '',
    autoTailor: false,
    webSearchEnabled: true,
    theme: 'system',
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
        // Delegate to tailorBridge for the full assembly + injection flow
        handleTailorRequest(message, sender.tab?.id ?? null).catch((err: unknown) => {
          console.error('tailorBridge.handleTailorRequest failed:', err);
        });
        sendResponse({ type: 'ACK' });
        break;

      case 'INJECT_CONTEXT':
        // Delegate to tailorBridge — it routes to the correct content-script tab
        // and relays the INJECTION_RESULT back to the side panel.
        handleInjectContext(message, sender.tab?.id ?? null).catch((err: unknown) => {
          console.error('tailorBridge.handleInjectContext failed:', err);
        });
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
