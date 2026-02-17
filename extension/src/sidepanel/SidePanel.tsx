/**
 * Side panel component for AgentTailor Chrome extension
 * Placeholder — full implementation in T028
 */

import { useEffect, useState } from 'react';
import type { Platform } from '@agenttailor/shared';
import type { ExtensionMessage } from '../shared/types.js';

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100vh',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    backgroundColor: '#f9fafb',
    color: '#111827',
  } as React.CSSProperties,
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    gap: '8px',
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
  platformBadge: {
    marginLeft: 'auto',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    padding: '2px 8px',
    borderRadius: '12px',
    backgroundColor: '#ede9fe',
    color: '#5b21b6',
  } as React.CSSProperties,
  body: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    gap: '12px',
  } as React.CSSProperties,
  placeholder: {
    textAlign: 'center' as const,
  } as React.CSSProperties,
  placeholderTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '8px',
  } as React.CSSProperties,
  placeholderSubtitle: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: '1.5',
    maxWidth: '240px',
  } as React.CSSProperties,
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#22c55e',
    display: 'inline-block',
    marginRight: '6px',
  } as React.CSSProperties,
  statusText: {
    fontSize: '12px',
    color: '#6b7280',
  } as React.CSSProperties,
};

export function SidePanel() {
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Listen for platform status updates from content scripts via background
    const handleMessage = (message: ExtensionMessage) => {
      if (message.type === 'PLATFORM_STATUS') {
        setPlatform(message.platform);
        setIsReady(message.ready);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    // Request current status on mount
    chrome.runtime.sendMessage({ type: 'PING' } satisfies ExtensionMessage, () => {
      if (chrome.runtime.lastError) {
        console.warn('AgentTailor: Side panel ping failed:', chrome.runtime.lastError.message);
      }
    });

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.logo}>
          Agent<span style={styles.logoAccent}>Tailor</span>
        </div>
        {platform && (
          <span style={styles.platformBadge}>
            {platform === 'chatgpt' ? 'ChatGPT' : 'Claude'}
          </span>
        )}
      </header>

      <div style={styles.body}>
        <div style={styles.placeholder}>
          <div style={styles.placeholderTitle}>Context Preview</div>
          <p style={styles.placeholderSubtitle}>
            Full side panel UI will be built in T028. This placeholder confirms the side panel
            shell is working correctly.
          </p>
        </div>

        <div>
          <span
            style={{
              ...styles.statusDot,
              backgroundColor: isReady ? '#22c55e' : '#9ca3af',
            }}
          />
          <span style={styles.statusText}>
            {isReady ? `Connected to ${platform ?? 'platform'}` : 'Waiting for platform...'}
          </span>
        </div>
      </div>
    </div>
  );
}
