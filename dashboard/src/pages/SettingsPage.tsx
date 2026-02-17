import { useState } from 'react';
import type { FullSettings, ContextPreferences, NotificationPreferences } from '@agenttailor/shared';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { ApiKeyManager } from '../components/settings/ApiKeyManager';
import { ContextPreferences as ContextPreferencesForm } from '../components/settings/ContextPreferences';
import { NotificationSettings } from '../components/settings/NotificationSettings';
import { useSettings, useUpdateSettings } from '../hooks/useSettings';

type TabId = 'general' | 'context' | 'api-keys' | 'notifications';

interface Tab {
  id: TabId;
  label: string;
}

const TABS: Tab[] = [
  { id: 'general', label: 'General' },
  { id: 'context', label: 'Context Preferences' },
  { id: 'api-keys', label: 'API Keys' },
  { id: 'notifications', label: 'Notifications' },
];

type PreferredPlatform = 'chatgpt' | 'claude';
type Theme = 'light' | 'dark' | 'system';

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const { data: settings, isLoading, isError, error } = useSettings();
  const updateSettings = useUpdateSettings();

  // Local draft state for each section
  const [generalDraft, setGeneralDraft] = useState<Partial<FullSettings> | null>(null);
  const [contextDraft, setContextDraft] = useState<Partial<ContextPreferences> | null>(null);
  const [notificationDraft, setNotificationDraft] = useState<Partial<NotificationPreferences> | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !settings) {
    return (
      <ErrorBanner
        message={
          error instanceof Error ? error.message : 'Failed to load settings'
        }
      />
    );
  }

  // Merge server data with any local draft changes
  const general = { ...settings, ...generalDraft };
  const context: ContextPreferences = {
    maxChunks: settings.maxChunks,
    compressionLevel: settings.compressionLevel,
    webSearchEnabled: settings.webSearchEnabled,
    webSearchMaxResults: settings.webSearchMaxResults,
    chunkWeightThreshold: settings.chunkWeightThreshold,
    ...contextDraft,
  };
  const notifications: NotificationPreferences = {
    emailOnProcessingComplete: settings.emailOnProcessingComplete,
    emailOnProcessingError: settings.emailOnProcessingError,
    ...notificationDraft,
  };

  const handleSaveGeneral = () => {
    if (!generalDraft) return;
    void updateSettings.mutateAsync({ ...generalDraft }).then(() => setGeneralDraft(null));
  };

  const handleSaveContext = () => {
    if (!contextDraft) return;
    void updateSettings.mutateAsync({ ...contextDraft }).then(() => setContextDraft(null));
  };

  const handleSaveNotifications = () => {
    if (!notificationDraft) return;
    void updateSettings.mutateAsync({ ...notificationDraft }).then(() => setNotificationDraft(null));
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold text-secondary-900">Settings</h1>
        <p className="text-sm text-secondary-500 mt-1">
          Configure your API keys, context assembly preferences, and notification options.
        </p>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 border-b border-secondary-200">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={[
              'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset',
              activeTab === tab.id
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-secondary-600 hover:text-secondary-900 hover:border-secondary-300',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* General tab */}
      {activeTab === 'general' && (
        <Card header="General Settings">
          <div className="flex flex-col gap-5">
            {/* Preferred platform */}
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-secondary-700">Preferred Platform</span>
              <span className="text-xs text-secondary-500">
                The default target platform when assembling context.
              </span>
              <div className="flex rounded-md border border-secondary-300 overflow-hidden w-fit mt-1">
                {(['chatgpt', 'claude'] as PreferredPlatform[]).map((platform) => (
                  <button
                    key={platform}
                    type="button"
                    onClick={() =>
                      setGeneralDraft((prev) => ({ ...prev, preferredPlatform: platform }))
                    }
                    className={[
                      'px-4 py-2 text-sm font-medium transition-colors focus:outline-none',
                      'focus-visible:ring-2 focus-visible:ring-inset',
                      platform !== 'chatgpt' ? 'border-l border-secondary-300' : '',
                      general.preferredPlatform === platform
                        ? platform === 'claude'
                          ? 'bg-amber-500 text-white focus-visible:ring-amber-500'
                          : 'bg-blue-600 text-white focus-visible:ring-blue-500'
                        : 'bg-white text-secondary-600 hover:bg-secondary-50 focus-visible:ring-secondary-400',
                    ].join(' ')}
                  >
                    {platform === 'claude' ? 'Claude' : 'ChatGPT'}
                  </button>
                ))}
              </div>
            </div>

            {/* Theme */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="theme-select" className="text-sm font-medium text-secondary-700">
                Theme
              </label>
              <select
                id="theme-select"
                value={general.theme}
                onChange={(e) =>
                  setGeneralDraft((prev) => ({ ...prev, theme: e.target.value as Theme }))
                }
                className="w-full max-w-xs rounded-md border border-secondary-300 bg-white px-3 py-2 text-sm text-secondary-900 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:border-primary-500 focus:ring-primary-200"
              >
                <option value="system">System default</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>

            <div className="pt-2">
              <Button
                variant="primary"
                size="md"
                onClick={handleSaveGeneral}
                loading={updateSettings.isPending}
                disabled={!generalDraft || updateSettings.isPending}
              >
                Save General Settings
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Context Preferences tab */}
      {activeTab === 'context' && (
        <Card header="Context Preferences">
          <div className="flex flex-col gap-6">
            <ContextPreferencesForm
              values={context}
              onChange={(updated) =>
                setContextDraft((prev) => ({ ...prev, ...updated }))
              }
              disabled={updateSettings.isPending}
            />

            <div className="pt-2">
              <Button
                variant="primary"
                size="md"
                onClick={handleSaveContext}
                loading={updateSettings.isPending}
                disabled={!contextDraft || updateSettings.isPending}
              >
                Save Context Preferences
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* API Keys tab */}
      {activeTab === 'api-keys' && (
        <Card header="API Keys">
          <div className="flex flex-col gap-3">
            <p className="text-xs text-secondary-500">
              API keys are stored securely and never returned in full. You can update or remove
              a key at any time.
            </p>
            <ApiKeyManager />
          </div>
        </Card>
      )}

      {/* Notifications tab */}
      {activeTab === 'notifications' && (
        <Card header="Notification Settings">
          <div className="flex flex-col gap-6">
            <NotificationSettings
              values={notifications}
              onChange={(updated) =>
                setNotificationDraft((prev) => ({ ...prev, ...updated }))
              }
              disabled={updateSettings.isPending}
            />

            <div className="pt-2">
              <Button
                variant="primary"
                size="md"
                onClick={handleSaveNotifications}
                loading={updateSettings.isPending}
                disabled={!notificationDraft || updateSettings.isPending}
              >
                Save Notification Settings
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
