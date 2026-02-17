/**
 * Dropdown that lets the user pick the active project.
 * Fetches projects from the API and persists the selection in chrome.storage.
 */

import { useEffect, useState } from 'react';

interface Project {
  id: string;
  name: string;
  documentCount?: number;
}

interface ProjectSelectorProps {
  activeProjectId: string | null;
  apiEndpoint: string;
  authToken: string | null;
  onProjectChange: (projectId: string | null) => void;
}

type FetchState = 'idle' | 'loading' | 'error' | 'success';

const DASHBOARD_URL = 'http://localhost:5173';

export function ProjectSelector({
  activeProjectId,
  apiEndpoint,
  authToken,
  onProjectChange,
}: ProjectSelectorProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [fetchState, setFetchState] = useState<FetchState>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const base = apiEndpoint || DASHBOARD_URL;

  useEffect(() => {
    if (!authToken) {
      setFetchState('idle');
      return;
    }

    let cancelled = false;
    setFetchState('loading');

    fetch(`${base}/api/projects`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as { data: Project[] };
        return json.data;
      })
      .then((data) => {
        if (!cancelled) {
          setProjects(data);
          setFetchState('success');
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setErrorMessage(err instanceof Error ? err.message : 'Failed to load projects');
          setFetchState('error');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authToken, base]);

  const labelStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#6b7280',
    marginBottom: '6px',
    display: 'block',
  };

  const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: '6px 8px',
    fontSize: '13px',
    color: '#374151',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    outline: 'none',
    cursor: 'pointer',
    appearance: 'auto',
  };

  const infoStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#9ca3af',
    marginTop: '4px',
  };

  const errorStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#dc2626',
    marginTop: '4px',
  };

  if (!authToken) {
    return (
      <div>
        <span style={labelStyle}>Active Project</span>
        <p style={infoStyle}>Sign in to select a project.</p>
      </div>
    );
  }

  if (fetchState === 'loading') {
    return (
      <div>
        <span style={labelStyle}>Active Project</span>
        <p style={infoStyle}>Loading projects…</p>
      </div>
    );
  }

  if (fetchState === 'error') {
    return (
      <div>
        <span style={labelStyle}>Active Project</span>
        <p style={errorStyle}>{errorMessage}</p>
      </div>
    );
  }

  if (fetchState === 'success' && projects.length === 0) {
    return (
      <div>
        <span style={labelStyle}>Active Project</span>
        <p style={infoStyle}>No projects yet. Create one in the dashboard.</p>
      </div>
    );
  }

  return (
    <div>
      <span style={labelStyle}>Active Project</span>
      <select
        style={selectStyle}
        value={activeProjectId ?? ''}
        onChange={(e) => onProjectChange(e.target.value || null)}
      >
        <option value="">— Select a project —</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
            {p.documentCount !== undefined ? ` (${p.documentCount} docs)` : ''}
          </option>
        ))}
      </select>
    </div>
  );
}
