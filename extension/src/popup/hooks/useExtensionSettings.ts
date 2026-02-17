/**
 * React hook for reading and updating extension settings.
 * Keeps UI in sync when settings change from other extension contexts.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  getSettings,
  updateSettings as persistSettings,
  onSettingsChanged,
} from '../../background/storage.js';
import type { ExtensionSettings } from '../../shared/types.js';

interface UseExtensionSettingsResult {
  settings: ExtensionSettings | null;
  updateSettings: (partial: Partial<ExtensionSettings>) => Promise<void>;
  isLoading: boolean;
}

export function useExtensionSettings(): UseExtensionSettingsResult {
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings on mount
  useEffect(() => {
    let cancelled = false;

    getSettings()
      .then((loaded) => {
        if (!cancelled) {
          setSettings(loaded);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        console.error('AgentTailor: Failed to load settings', err);
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // React to storage changes from other contexts (content scripts, background)
  useEffect(() => {
    const unsubscribe = onSettingsChanged((changed) => {
      setSettings((prev) => (prev ? { ...prev, ...changed } : prev));
    });
    return unsubscribe;
  }, []);

  const updateSettings = useCallback(async (partial: Partial<ExtensionSettings>) => {
    // Optimistic update
    setSettings((prev) => (prev ? { ...prev, ...partial } : prev));
    await persistSettings(partial);
  }, []);

  return { settings, updateSettings, isLoading };
}
