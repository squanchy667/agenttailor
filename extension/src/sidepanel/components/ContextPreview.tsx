/**
 * Scrollable preview of the assembled context with section expand/collapse
 */

import { useState } from 'react';

interface ContextSection {
  title: string;
  content: string;
}

interface ContextPreviewProps {
  context: string;
  tokenCount: number;
}

function estimateTokenCount(text: string): number {
  return Math.ceil(text.split(/\s+/).filter(Boolean).length * 1.3);
}

/** Split context into sections based on common header patterns */
function parseSections(context: string): ContextSection[] {
  // Try to split on markdown-style headers or XML-like tags
  const lines = context.split('\n');
  const sections: ContextSection[] = [];
  let currentTitle = 'Context';
  let currentLines: string[] = [];

  const headerRe = /^(#{1,3}\s+.+|<[A-Za-z][^>]*>.*|={3,}|[-]{3,})$/;

  for (const line of lines) {
    if (headerRe.test(line.trim()) && currentLines.length > 0) {
      sections.push({ title: currentTitle, content: currentLines.join('\n').trim() });
      currentTitle = line.replace(/^#{1,3}\s+/, '').replace(/<[^>]+>/g, '').trim() || line.trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  if (currentLines.length > 0) {
    sections.push({ title: currentTitle, content: currentLines.join('\n').trim() });
  }

  // If only one section and it's the whole text, don't bother
  return sections.filter((s) => s.content.length > 0);
}

function SectionBlock({ section, defaultExpanded }: { section: ContextSection; defaultExpanded: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const preview = section.content.slice(0, 200) + (section.content.length > 200 ? '…' : '');

  return (
    <div
      style={{
        borderBottom: '1px solid #f3f4f6',
      }}
    >
      {/* Section header */}
      <button
        onClick={() => setExpanded((e) => !e)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '8px 12px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          gap: '8px',
        }}
      >
        <span
          style={{
            fontSize: '11px',
            fontWeight: '600',
            color: '#6b7280',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {section.title}
        </span>
        <span style={{ color: '#9ca3af', fontSize: '12px', flexShrink: 0 }}>
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      {/* Section body */}
      {expanded ? (
        <pre
          style={{
            margin: 0,
            padding: '0 12px 12px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: '11px',
            lineHeight: '1.6',
            color: '#374151',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {section.content}
        </pre>
      ) : (
        <p
          style={{
            margin: 0,
            padding: '0 12px 10px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: '11px',
            color: '#9ca3af',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {preview}
        </p>
      )}
    </div>
  );
}

export function ContextPreview({ context, tokenCount }: ContextPreviewProps) {
  const sections = parseSections(context);
  const displayedTokenCount = tokenCount > 0 ? tokenCount : estimateTokenCount(context);

  return (
    <div>
      {/* Token count header */}
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
          Assembled Context
        </span>
        <span
          style={{
            fontSize: '11px',
            color: '#6b7280',
            backgroundColor: '#e5e7eb',
            padding: '2px 8px',
            borderRadius: '10px',
          }}
        >
          ~{displayedTokenCount.toLocaleString()} tokens
        </span>
      </div>

      {/* Sections */}
      <div
        style={{
          maxHeight: '240px',
          overflowY: 'auto',
          backgroundColor: '#ffffff',
        }}
      >
        {sections.length === 0 ? (
          <pre
            style={{
              margin: 0,
              padding: '12px',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: '11px',
              lineHeight: '1.6',
              color: '#374151',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {context}
          </pre>
        ) : (
          sections.map((section, i) => (
            <SectionBlock key={i} section={section} defaultExpanded={i === 0} />
          ))
        )}
      </div>
    </div>
  );
}
