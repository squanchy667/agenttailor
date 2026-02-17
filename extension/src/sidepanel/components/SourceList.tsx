/**
 * List of contributing sources with relevance scores
 * Sortable by relevance, expandable to show chunk text
 */

import { useState } from 'react';
import type { SourceItem } from '../hooks/useTailoring.js';

interface SourceListProps {
  sources: SourceItem[];
}

type SortKey = 'relevance' | 'title' | 'type';

function RelevanceBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);

  let barColor = '#10b981'; // green
  if (pct < 60) barColor = '#f59e0b'; // amber
  if (pct < 35) barColor = '#ef4444'; // red

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <div
        style={{
          flex: 1,
          height: '4px',
          backgroundColor: '#e5e7eb',
          borderRadius: '2px',
          overflow: 'hidden',
          minWidth: '40px',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            backgroundColor: barColor,
            borderRadius: '2px',
          }}
        />
      </div>
      <span style={{ fontSize: '10px', color: '#6b7280', minWidth: '28px', textAlign: 'right' }}>
        {pct}%
      </span>
    </div>
  );
}

function TypeBadge({ type }: { type: 'doc' | 'web' }) {
  const isDoc = type === 'doc';
  return (
    <span
      style={{
        fontSize: '9px',
        fontWeight: '700',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.06em',
        padding: '1px 6px',
        borderRadius: '8px',
        backgroundColor: isDoc ? '#ede9fe' : '#dbeafe',
        color: isDoc ? '#5b21b6' : '#1d4ed8',
        flexShrink: 0,
      }}
    >
      {isDoc ? 'Doc' : 'Web'}
    </span>
  );
}

function SourceRow({ source }: { source: SourceItem }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{
        borderBottom: '1px solid #f3f4f6',
      }}
    >
      <button
        onClick={() => setExpanded((e) => !e)}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          width: '100%',
          padding: '8px 12px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        {/* Top row: type badge + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <TypeBadge type={source.type} />
          <span
            style={{
              fontSize: '12px',
              fontWeight: '500',
              color: '#111827',
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {source.title}
          </span>
          {source.chunkText && (
            <span style={{ color: '#9ca3af', fontSize: '10px', flexShrink: 0 }}>
              {expanded ? '▲' : '▼'}
            </span>
          )}
        </div>

        {/* Relevance bar */}
        <RelevanceBar score={source.relevanceScore} />

        {/* URL if web */}
        {source.url && source.type === 'web' && (
          <span
            style={{
              fontSize: '10px',
              color: '#6b7280',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {source.url}
          </span>
        )}
      </button>

      {/* Expanded chunk text */}
      {expanded && source.chunkText && (
        <div
          style={{
            padding: '0 12px 10px',
            backgroundColor: '#f9fafb',
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: '10px',
              lineHeight: '1.6',
              color: '#374151',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              maxHeight: '120px',
              overflowY: 'auto',
            }}
          >
            {source.chunkText}
          </p>
        </div>
      )}
    </div>
  );
}

export function SourceList({ sources }: SourceListProps) {
  const [sortKey, setSortKey] = useState<SortKey>('relevance');
  const [sortAsc, setSortAsc] = useState(false);

  if (sources.length === 0) return null;

  const sorted = [...sources].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'relevance') cmp = a.relevanceScore - b.relevanceScore;
    else if (sortKey === 'title') cmp = a.title.localeCompare(b.title);
    else if (sortKey === 'type') cmp = a.type.localeCompare(b.type);
    return sortAsc ? cmp : -cmp;
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc((v) => !v);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  function SortBtn({ label, sk }: { label: string; sk: SortKey }) {
    const active = sortKey === sk;
    return (
      <button
        onClick={() => toggleSort(sk)}
        style={{
          padding: '2px 6px',
          fontSize: '10px',
          fontWeight: active ? '700' : '400',
          color: active ? '#4f46e5' : '#6b7280',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        {label}
        {active && <span>{sortAsc ? ' ↑' : ' ↓'}</span>}
      </button>
    );
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
          Sources ({sources.length})
        </span>
        <div style={{ display: 'flex', gap: '2px' }}>
          <SortBtn label="Relevance" sk="relevance" />
          <SortBtn label="Type" sk="type" />
        </div>
      </div>

      {/* Source rows */}
      <div style={{ maxHeight: '180px', overflowY: 'auto', backgroundColor: '#ffffff' }}>
        {sorted.map((source) => (
          <SourceRow key={source.id} source={source} />
        ))}
      </div>
    </div>
  );
}
