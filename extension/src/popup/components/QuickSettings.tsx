/**
 * Toggle switches for Auto-tailor and Web search settings.
 * Each toggle writes immediately to chrome.storage via the provided callback.
 */

import type { ExtensionSettings } from '../../shared/types.js';

interface QuickSettingsProps {
  settings: Pick<ExtensionSettings, 'autoTailor' | 'webSearchEnabled'>;
  onUpdate: (partial: Partial<ExtensionSettings>) => void;
}

export function QuickSettings({ settings, onUpdate }: QuickSettingsProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <SettingRow
        label="Auto-tailor"
        description="Automatically assemble context when a task is detected"
        checked={settings.autoTailor}
        onChange={(val) => onUpdate({ autoTailor: val })}
      />
      <SettingRow
        label="Web search"
        description="Include live web results in assembled context"
        checked={settings.webSearchEnabled}
        onChange={(val) => onUpdate({ webSearchEnabled: val })}
      />
    </div>
  );
}

interface SettingRowProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

function SettingRow({ label, description, checked, onChange }: SettingRowProps) {
  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '12px',
  };

  const textStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: 500,
    color: '#374151',
    display: 'block',
    marginBottom: '2px',
  };

  const descStyle: React.CSSProperties = {
    fontSize: '11px',
    color: '#9ca3af',
    lineHeight: '1.4',
  };

  return (
    <div style={rowStyle}>
      <div style={textStyle}>
        <span style={labelStyle}>{label}</span>
        <span style={descStyle}>{description}</span>
      </div>
      <label
        style={{ cursor: 'pointer', flexShrink: 0, marginTop: '2px' }}
        title={`${checked ? 'Disable' : 'Enable'} ${label.toLowerCase()}`}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
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
        <MiniToggle enabled={checked} />
      </label>
    </div>
  );
}

function MiniToggle({ enabled }: { enabled: boolean }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: '32px',
        height: '18px',
        borderRadius: '9px',
        backgroundColor: enabled ? '#4f46e5' : '#d1d5db',
        transition: 'background-color 0.15s ease',
        position: 'relative',
      }}
    >
      <span
        style={{
          display: 'block',
          width: '14px',
          height: '14px',
          borderRadius: '50%',
          backgroundColor: '#ffffff',
          position: 'absolute',
          top: '2px',
          left: enabled ? '16px' : '2px',
          transition: 'left 0.15s ease',
          boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
        }}
      />
    </span>
  );
}
