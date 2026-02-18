/**
 * Compact Agent Builder for the extension sidepanel.
 * Allows quick agent generation from the sidepanel.
 */
import { useState } from 'react';

interface AgentBuilderProps {
  onGenerated?: (content: string) => void;
}

const FORMATS = [
  { id: 'CLAUDE_AGENT', label: 'Claude' },
  { id: 'CURSOR_RULES', label: 'Cursor' },
  { id: 'SYSTEM_PROMPT', label: 'Prompt' },
];

export function AgentBuilder({ onGenerated }: AgentBuilderProps) {
  const [role, setRole] = useState('');
  const [stack, setStack] = useState('');
  const [description, setDescription] = useState('');
  const [format, setFormat] = useState('CLAUDE_AGENT');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    if (!role.trim() || !stack.trim() || !description.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      // Send to background script to call API
      const response = await chrome.runtime.sendMessage({
        type: 'GENERATE_AGENT',
        payload: {
          role: role.trim(),
          stack: stack.split(',').map((s) => s.trim()).filter(Boolean),
          domain: 'web',
          description: description.trim(),
          targetFormat: format,
        },
      });

      if (response?.error) {
        setError(response.error);
      } else if (response?.content) {
        setResult(response.content);
        onGenerated?.(response.content);
      }
    } catch (err) {
      setError('Generation failed. Is the server running?');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCopy() {
    if (result) {
      try {
        await navigator.clipboard.writeText(result);
      } catch {
        // Clipboard may not be available
      }
    }
  }

  if (result) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#111827' }}>Agent Generated</span>
          <button
            onClick={() => setResult(null)}
            style={{
              fontSize: '12px',
              color: '#6b7280',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            New
          </button>
        </div>
        <pre
          style={{
            fontSize: '11px',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            color: '#374151',
            backgroundColor: '#f9fafb',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            maxHeight: '300px',
            overflowY: 'auto',
          }}
        >
          {result}
        </pre>
        <button
          onClick={handleCopy}
          style={{
            padding: '8px 16px',
            backgroundColor: '#4f46e5',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          Copy to Clipboard
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px' }}>
      <input
        type="text"
        value={role}
        onChange={(e) => setRole(e.target.value)}
        placeholder="Agent role (e.g. React developer)"
        style={{
          width: '100%',
          padding: '8px 10px',
          fontSize: '13px',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />

      <input
        type="text"
        value={stack}
        onChange={(e) => setStack(e.target.value)}
        placeholder="Tech stack (react, typescript, tailwind)"
        style={{
          width: '100%',
          padding: '8px 10px',
          fontSize: '13px',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="What should this agent do?"
        rows={3}
        style={{
          width: '100%',
          padding: '8px 10px',
          fontSize: '13px',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          outline: 'none',
          resize: 'none',
          boxSizing: 'border-box',
        }}
      />

      {/* Format buttons */}
      <div style={{ display: 'flex', gap: '4px' }}>
        {FORMATS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFormat(f.id)}
            style={{
              flex: 1,
              padding: '6px',
              fontSize: '11px',
              fontWeight: format === f.id ? '600' : '400',
              color: format === f.id ? '#4f46e5' : '#6b7280',
              backgroundColor: format === f.id ? '#ede9fe' : 'transparent',
              border: `1px solid ${format === f.id ? '#c4b5fd' : '#d1d5db'}`,
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ fontSize: '12px', color: '#dc2626', padding: '8px', backgroundColor: '#fef2f2', borderRadius: '6px' }}>
          {error}
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={isLoading || !role.trim() || !stack.trim() || !description.trim()}
        style={{
          padding: '9px 16px',
          backgroundColor: isLoading ? '#a5b4fc' : '#4f46e5',
          color: '#ffffff',
          border: 'none',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: '600',
          cursor: isLoading ? 'wait' : 'pointer',
          opacity: (!role.trim() || !stack.trim() || !description.trim()) ? 0.5 : 1,
        }}
      >
        {isLoading ? 'Generating...' : 'Generate Agent'}
      </button>
    </div>
  );
}
