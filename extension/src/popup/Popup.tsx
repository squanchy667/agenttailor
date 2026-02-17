/**
 * Popup component for AgentTailor Chrome extension
 * Shows current status, active project, and extension toggle
 */

import { useEffect, useState } from 'react';
import type { ExtensionSettings } from '../shared/types.js';

const styles = {
  container: {
    width: '320px',
    padding: '16px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    margin: '0',
    backgroundColor: '#ffffff',
    color: '#111827',
  } as React.CSSProperties,
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  } as React.CSSProperties,
  logo: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#111827',
    letterSpacing: '-0.02em',
  } as React.CSSProperties,
  logoAccent: {
    color: '#6366f1',
  } as React.CSSProperties,
  toggle: {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    cursor: 'pointer',
  } as React.CSSProperties,
  toggleInput: {
    position: 'absolute',
    width: '1px',
    height: '1px',
    overflow: 'hidden',
    clip: 'rect(0,0,0,0)',
    whiteSpace: 'nowrap',
    border: '0',
  } as React.CSSProperties,
  statusSection: {
    marginBottom: '12px',
    padding: '10px 12px',
    borderRadius: '8px',
    fontSize: '13px',
  } as React.CSSProperties,
  statusActive: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    color: '#166534',
  } as React.CSSProperties,
  statusInactive: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#991b1b',
  } as React.CSSProperties,
  projectSection: {
    marginBottom: '12px',
    padding: '10px 12px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  } as React.CSSProperties,
  projectLabel: {
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    color: '#6b7280',
    marginBottom: '4px',
  } as React.CSSProperties,
  projectName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#111827',
  } as React.CSSProperties,
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '4px',
  } as React.CSSProperties,
  link: {
    fontSize: '12px',
    color: '#6366f1',
    textDecoration: 'none',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    padding: '0',
  } as React.CSSProperties,
  version: {
    fontSize: '11px',
    color: '#9ca3af',
  } as React.CSSProperties,
};

export function Popup() {
  const [enabled, setEnabled] = useState(true);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load settings from chrome.storage.sync
    chrome.storage.sync.get(
      ['enabled', 'activeProjectId'] satisfies (keyof ExtensionSettings)[],
      (result: Partial<ExtensionSettings>) => {
        setEnabled(result.enabled ?? true);
        setActiveProjectId(result.activeProjectId ?? null);
        setIsLoading(false);
      },
    );
  }, []);

  function handleToggle() {
    const newEnabled = !enabled;
    setEnabled(newEnabled);
    chrome.storage.sync.set({ enabled: newEnabled });
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

  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={{ ...styles.logo }}>
          Agent<span style={styles.logoAccent}>Tailor</span>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.logo}>
          Agent<span style={styles.logoAccent}>Tailor</span>
        </div>
        <label style={styles.toggle} title={enabled ? 'Disable extension' : 'Enable extension'}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={handleToggle}
            style={styles.toggleInput}
          />
          <ToggleSwitch enabled={enabled} />
        </label>
      </div>

      <div
        style={{
          ...styles.statusSection,
          ...(enabled ? styles.statusActive : styles.statusInactive),
        }}
      >
        {enabled ? '✓ Extension active' : '✗ Extension disabled'}
      </div>

      <div style={styles.projectSection}>
        <div style={styles.projectLabel}>Active Project</div>
        <div style={styles.projectName}>
          {activeProjectId ? activeProjectId : 'No project selected'}
        </div>
      </div>

      <div style={styles.footer}>
        <button style={styles.link} onClick={handleOpenSidePanel} type="button">
          Open Side Panel
        </button>
        <span style={styles.version}>v1.0.0</span>
      </div>
    </div>
  );
}

interface ToggleSwitchProps {
  enabled: boolean;
}

function ToggleSwitch({ enabled }: ToggleSwitchProps) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: '36px',
        height: '20px',
        borderRadius: '10px',
        backgroundColor: enabled ? '#6366f1' : '#d1d5db',
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
