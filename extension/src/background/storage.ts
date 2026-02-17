/**
 * Typed wrapper around chrome.storage for AgentTailor extension
 *
 * - chrome.storage.sync: settings (synced across devices)
 * - chrome.storage.local: auth token (not synced)
 */

import type { ExtensionSettings } from '../shared/types.js';

const SETTINGS_KEYS: (keyof ExtensionSettings)[] = [
  'enabled',
  'activeProjectId',
  'apiEndpoint',
  'autoTailor',
  'webSearchEnabled',
  'theme',
];

const DEFAULT_SETTINGS: ExtensionSettings = {
  enabled: true,
  activeProjectId: null,
  apiEndpoint: '',
  autoTailor: false,
  webSearchEnabled: true,
  theme: 'system',
};

const AUTH_TOKEN_KEY = 'authToken';

/**
 * Get all extension settings, merging stored values with defaults.
 */
export async function getSettings(): Promise<ExtensionSettings> {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(SETTINGS_KEYS, (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve({ ...DEFAULT_SETTINGS, ...(result as Partial<ExtensionSettings>) });
    });
  });
}

/**
 * Update one or more extension settings. Only the provided keys are written.
 */
export async function updateSettings(partial: Partial<ExtensionSettings>): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set(partial, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve();
    });
  });
}

/**
 * Read the auth token from local storage (not synced across devices).
 */
export async function getAuthToken(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([AUTH_TOKEN_KEY], (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      const token = result[AUTH_TOKEN_KEY];
      resolve(typeof token === 'string' ? token : null);
    });
  });
}

/**
 * Persist an auth token to local storage.
 */
export async function setAuthToken(token: string): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [AUTH_TOKEN_KEY]: token }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve();
    });
  });
}

/**
 * Remove the auth token from local storage.
 */
export async function clearAuthToken(): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.remove(AUTH_TOKEN_KEY, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve();
    });
  });
}

/**
 * Subscribe to settings changes from any context (popup, content script, background).
 * Returns an unsubscribe function.
 */
export function onSettingsChanged(
  callback: (newSettings: Partial<ExtensionSettings>) => void,
): () => void {
  const listener = (
    changes: Record<string, chrome.storage.StorageChange>,
    area: string,
  ) => {
    if (area !== 'sync') return;

    const updatedSettings: Partial<ExtensionSettings> = {};
    let hasSettingsChange = false;

    for (const key of SETTINGS_KEYS) {
      if (key in changes) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
        (updatedSettings as any)[key] = changes[key]?.newValue;
        hasSettingsChange = true;
      }
    }

    if (hasSettingsChange) {
      callback(updatedSettings);
    }
  };

  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
