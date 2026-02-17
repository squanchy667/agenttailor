/**
 * Main popup UI for the AgentTailor Chrome extension.
 *
 * Layout (top to bottom):
 *   Header: logo + enabled toggle
 *   Connection status indicator
 *   Project selector
 *   Quick settings (auto-tailor, web search)
 *   Action buttons (dashboard, side panel)
 *   Sign in / sign out
 *   Developer settings (collapsible)
 *   Version footer
 */

import { useEffect, useState } from 'react';
import { getAuthToken, setAuthToken, clearAuthToken } from '../background/storage.js';
import { ProjectSelector } from './components/ProjectSelector.js';
import { QuickSettings } from './components/QuickSettings.js';
import { useExtensionSettings } from './hooks/useExtensionSettings.js';

const DASHBOARD_URL = 'http://localhost:5173';
const PRIMARY = '#4f46e5';
const TEXT = '#374151';
const BORDER = '#e5e7eb';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Divider() {
  return (
    <hr
      style={{
        border: 'none',
        borderTop: `1px solid ${BORDER}`,
        margin: '10px 0',
      }}
    />
  );
}

function ToggleSwitch({ enabled }: { enabled: boolean }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: '36px',
        height: '20px',
        borderRadius: '10px',
        backgroundColor: enabled ? PRIMARY : '#d1d5db',
        transition: 'background-color 0.15s ease',
        position: 'relative',
      }}
    >
      <span
        style={{
          display: 'block',
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          backgroundColor: '#ffffff',
          position: 'absolute',
          top: '2px',
          left: enabled ? '18px' : '2px',
          transition: 'left 0.15s ease',
          boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
        }}
      />
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function Popup() {
  const { settings, updateSettings, isLoading } = useExtensionSettings();
  const [authToken, setAuthTokenState] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [devOpen, setDevOpen] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [apiEndpointDraft, setApiEndpointDraft] = useState('');

  // Load auth token on mount
  useEffect(() => {
    getAuthToken()
      .then((token) => {
        setAuthTokenState(token);
      })
      .catch((err: unknown) => {
        console.error('AgentTailor: Failed to load auth token', err);
      })
      .finally(() => {
        setAuthLoading(false);
      });
  }, []);

  // Sync apiEndpoint draft with loaded settings
  useEffect(() => {
    if (settings) {
      setApiEndpointDraft(settings.apiEndpoint);
    }
  }, [settings?.apiEndpoint]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  function handleToggleEnabled() {
    if (!settings) return;
    void updateSettings({ enabled: !settings.enabled });
  }

  function handleProjectChange(projectId: string | null) {
    void updateSettings({ activeProjectId: projectId });
  }

  async function handleSignIn() {
    await chrome.tabs.create({ url: `${DASHBOARD_URL}/login` });
    window.close();
  }

  async function handleSignOut() {
    await clearAuthToken();
    setAuthTokenState(null);
  }

  function handleSaveToken() {
    const trimmed = manualToken.trim();
    if (!trimmed) return;
    void setAuthToken(trimmed).then(() => {
      setAuthTokenState(trimmed);
      setManualToken('');
    });
  }

  function handleOpenDashboard() {
    void chrome.tabs.create({ url: DASHBOARD_URL });
    window.close();
  }

  function handleOpenSidePanel() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab?.id) {
        void chrome.sidePanel.open({ tabId: tab.id });
        window.close();
      }
    });
  }

  function handleSaveApiEndpoint() {
    void updateSettings({ apiEndpoint: apiEndpointDraft.trim() });
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const isReady = !isLoading && !authLoading && settings !== null;

  const containerStyle: React.CSSProperties = {
    width: '320px',
    padding: '14px 16px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    margin: '0',
    backgroundColor: '#ffffff',
    color: TEXT,
  };

  if (!isReady) {
    return (
      <div style={containerStyle}>
        <div style={{ fontSize: '18px', fontWeight: 700, color: '#111827', letterSpacing: '-0.02em' }}>
          Agent<span style={{ color: PRIMARY }}>Tailor</span>
        </div>
      </div>
    );
  }

  const enabled = settings.enabled;
  const isConnected = authToken !== null;

  return (
    <div style={containerStyle}>
      {/* ------------------------------------------------------------------ */}
      {/* Header: logo + main toggle */}
      {/* ------------------------------------------------------------------ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
        }}
      >
        <div
          style={{
            fontSize: '18px',
            fontWeight: 700,
            color: '#111827',
            letterSpacing: '-0.02em',
          }}
        >
          Agent<span style={{ color: PRIMARY }}>Tailor</span>
        </div>

        <label
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          title={enabled ? 'Disable extension' : 'Enable extension'}
        >
          <input
            type="checkbox"
            checked={enabled}
            onChange={handleToggleEnabled}
            style={{
              position: 'absolute',
              width: '1px',
              height: '1px',
              overflow: 'hidden',
              clip: 'rect(0,0,0,0)',
              whiteSpace: 'nowrap',
              border: '0',
            }}
          />
          <ToggleSwitch enabled={enabled} />
        </label>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Connection status indicator */}
      {/* ------------------------------------------------------------------ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
          color: isConnected ? '#166534' : '#6b7280',
          backgroundColor: isConnected ? '#f0fdf4' : '#f9fafb',
          border: `1px solid ${isConnected ? '#bbf7d0' : BORDER}`,
          borderRadius: '6px',
          padding: '6px 10px',
          marginBottom: '10px',
        }}
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: isConnected ? '#22c55e' : '#9ca3af',
            flexShrink: 0,
          }}
        />
        {isConnected ? 'Connected' : 'Not signed in'}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Project selector */}
      {/* ------------------------------------------------------------------ */}
      <div
        style={{
          padding: '10px 12px',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          border: `1px solid ${BORDER}`,
          marginBottom: '10px',
        }}
      >
        <ProjectSelector
          activeProjectId={settings.activeProjectId}
          apiEndpoint={settings.apiEndpoint}
          authToken={authToken}
          onProjectChange={handleProjectChange}
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Quick settings toggles */}
      {/* ------------------------------------------------------------------ */}
      <div
        style={{
          padding: '10px 12px',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          border: `1px solid ${BORDER}`,
          marginBottom: '10px',
        }}
      >
        <QuickSettings
          settings={{ autoTailor: settings.autoTailor, webSearchEnabled: settings.webSearchEnabled }}
          onUpdate={(partial) => void updateSettings(partial)}
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Action buttons */}
      {/* ------------------------------------------------------------------ */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
        <button
          type="button"
          onClick={handleOpenDashboard}
          style={{
            flex: 1,
            padding: '7px 10px',
            fontSize: '12px',
            fontWeight: 500,
            color: PRIMARY,
            backgroundColor: '#eef2ff',
            border: `1px solid #c7d2fe`,
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Open Dashboard
        </button>
        <button
          type="button"
          onClick={handleOpenSidePanel}
          style={{
            flex: 1,
            padding: '7px 10px',
            fontSize: '12px',
            fontWeight: 500,
            color: '#374151',
            backgroundColor: '#ffffff',
            border: `1px solid ${BORDER}`,
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Open Side Panel
        </button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Auth: sign in / sign out */}
      {/* ------------------------------------------------------------------ */}
      <div style={{ marginBottom: '10px' }}>
        {isConnected ? (
          <button
            type="button"
            onClick={() => void handleSignOut()}
            style={{
              width: '100%',
              padding: '7px',
              fontSize: '13px',
              fontWeight: 500,
              color: '#dc2626',
              backgroundColor: '#fff',
              border: `1px solid #fca5a5`,
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Sign Out
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void handleSignIn()}
            style={{
              width: '100%',
              padding: '7px',
              fontSize: '13px',
              fontWeight: 500,
              color: '#ffffff',
              backgroundColor: PRIMARY,
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Sign In
          </button>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Developer settings (collapsible) */}
      {/* ------------------------------------------------------------------ */}
      <Divider />
      <button
        type="button"
        onClick={() => setDevOpen((o) => !o)}
        style={{
          background: 'none',
          border: 'none',
          padding: '0',
          cursor: 'pointer',
          fontSize: '11px',
          fontWeight: 600,
          color: '#9ca3af',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          marginBottom: devOpen ? '8px' : '0',
        }}
      >
        <span style={{ fontSize: '10px' }}>{devOpen ? '▼' : '▶'}</span>
        Developer Settings
      </button>

      {devOpen && (
        <div
          style={{
            backgroundColor: '#f9fafb',
            border: `1px solid ${BORDER}`,
            borderRadius: '6px',
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {/* API endpoint */}
          <div>
            <label
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#6b7280',
                display: 'block',
                marginBottom: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              API Endpoint
            </label>
            <input
              type="url"
              value={apiEndpointDraft}
              onChange={(e) => setApiEndpointDraft(e.target.value)}
              placeholder="https://api.agenttailor.com"
              style={{
                width: '100%',
                padding: '5px 8px',
                fontSize: '12px',
                color: TEXT,
                border: `1px solid ${BORDER}`,
                borderRadius: '5px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <button
              type="button"
              onClick={handleSaveApiEndpoint}
              style={{
                marginTop: '5px',
                padding: '4px 10px',
                fontSize: '11px',
                color: '#ffffff',
                backgroundColor: PRIMARY,
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Save
            </button>
          </div>

          {/* Manual token entry */}
          <div>
            <label
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#6b7280',
                display: 'block',
                marginBottom: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Auth Token (manual)
            </label>
            <input
              type="password"
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              placeholder="Paste token here"
              style={{
                width: '100%',
                padding: '5px 8px',
                fontSize: '12px',
                color: TEXT,
                border: `1px solid ${BORDER}`,
                borderRadius: '5px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <button
              type="button"
              onClick={handleSaveToken}
              disabled={!manualToken.trim()}
              style={{
                marginTop: '5px',
                padding: '4px 10px',
                fontSize: '11px',
                color: '#ffffff',
                backgroundColor: manualToken.trim() ? PRIMARY : '#9ca3af',
                border: 'none',
                borderRadius: '4px',
                cursor: manualToken.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Footer: version */}
      {/* ------------------------------------------------------------------ */}
      <div
        style={{
          marginTop: '10px',
          textAlign: 'right',
          fontSize: '10px',
          color: '#d1d5db',
        }}
      >
        v1.0.0
      </div>
    </div>
  );
}
