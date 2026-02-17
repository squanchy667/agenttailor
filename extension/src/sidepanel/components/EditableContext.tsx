/**
 * Editable textarea for modifying context before injection
 * Shows char/token count and warns on platform limit exceeded
 */

import { useEffect, useRef, useState } from 'react';

const PLATFORM_LIMITS: Record<string, number> = {
  chatgpt: 128_000,
  claude: 200_000,
};

function estimateTokenCount(text: string): number {
  return Math.ceil(text.split(/\s+/).filter(Boolean).length * 1.3);
}

function getWarning(tokenCount: number, platform?: string): string | null {
  if (!platform) return null;
  const limit = PLATFORM_LIMITS[platform];
  if (!limit) return null;
  if (tokenCount > limit) {
    return `Exceeds estimated ${platform === 'chatgpt' ? 'ChatGPT' : 'Claude'} limit (~${(limit / 1000).toFixed(0)}K tokens)`;
  }
  if (tokenCount > limit * 0.9) {
    return `Approaching ${platform === 'chatgpt' ? 'ChatGPT' : 'Claude'} limit (~${(limit / 1000).toFixed(0)}K tokens)`;
  }
  return null;
}

interface EditableContextProps {
  originalContext: string;
  platform?: string;
  onChange: (value: string) => void;
}

export function EditableContext({ originalContext, platform, onChange }: EditableContextProps) {
  const [value, setValue] = useState(originalContext);
  const [isDirty, setIsDirty] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync when originalContext changes (e.g., new tailor result)
  useEffect(() => {
    setValue(originalContext);
    setIsDirty(false);
  }, [originalContext]);

  const tokenCount = estimateTokenCount(value);
  const charCount = value.length;
  const warning = getWarning(tokenCount, platform);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const newVal = e.target.value;
    setValue(newVal);
    setIsDirty(newVal !== originalContext);
    onChange(newVal);
  }

  function handleReset() {
    setValue(originalContext);
    setIsDirty(false);
    onChange(originalContext);
    textareaRef.current?.focus();
  }

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          backgroundColor: '#f9fafb',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <span style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>
          Edit Context
        </span>
        {isDirty && (
          <button
            onClick={handleReset}
            style={{
              fontSize: '11px',
              color: '#4f46e5',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px 4px',
              fontWeight: '500',
            }}
          >
            Reset to original
          </button>
        )}
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        style={{
          display: 'block',
          width: '100%',
          height: '140px',
          padding: '10px 12px',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: '11px',
          lineHeight: '1.6',
          color: '#111827',
          backgroundColor: '#ffffff',
          border: 'none',
          borderBottom: '1px solid #e5e7eb',
          resize: 'vertical',
          outline: 'none',
          boxSizing: 'border-box',
        }}
        spellCheck={false}
        aria-label="Editable context"
      />

      {/* Footer: counts + warning */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 12px',
          backgroundColor: '#f9fafb',
          borderBottom: '1px solid #e5e7eb',
          flexWrap: 'wrap',
          gap: '4px',
        }}
      >
        <div style={{ display: 'flex', gap: '10px' }}>
          <span style={{ fontSize: '10px', color: '#6b7280' }}>
            {charCount.toLocaleString()} chars
          </span>
          <span style={{ fontSize: '10px', color: '#6b7280' }}>
            ~{tokenCount.toLocaleString()} tokens
          </span>
        </div>

        {warning && (
          <span
            style={{
              fontSize: '10px',
              fontWeight: '500',
              color: tokenCount > (PLATFORM_LIMITS[platform ?? ''] ?? Infinity) ? '#dc2626' : '#d97706',
            }}
          >
            {warning}
          </span>
        )}
      </div>
    </div>
  );
}
