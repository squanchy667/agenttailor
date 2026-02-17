import { useState } from 'react';
import { Card } from '../components/ui';
import { DocumentUploader } from '../components/documents/DocumentUploader';
import { DocumentList } from '../components/documents/DocumentList';
import { useProjects } from '../hooks/useProjects';

// ---- Component --------------------------------------------------------------

export function DocumentsPage() {
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // Auto-select the first project when they load
  const projectList = projects ?? [];
  const effectiveProjectId = selectedProjectId || projectList[0]?.id || '';

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-secondary-900">Documents</h1>
        <p className="text-sm text-secondary-500 mt-0.5">
          Upload and manage documents for your AI context projects
        </p>
      </div>

      {/* Project selector */}
      <div className="flex items-center gap-3">
        <label
          htmlFor="project-selector"
          className="text-sm font-medium text-secondary-700 shrink-0"
        >
          Project
        </label>
        {projectsLoading ? (
          <div className="h-9 w-48 animate-pulse rounded-md bg-secondary-200" />
        ) : projectList.length === 0 ? (
          <p className="text-sm text-secondary-500">
            No projects found.{' '}
            <a href="/projects" className="text-primary-600 hover:text-primary-700 underline">
              Create a project
            </a>{' '}
            first.
          </p>
        ) : (
          <select
            id="project-selector"
            value={effectiveProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="rounded-md border border-secondary-300 bg-white px-3 py-2 text-sm text-secondary-800 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 min-w-[200px]"
          >
            {projectList.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Content — only shown when a project is selected */}
      {effectiveProjectId ? (
        <div className="flex flex-col gap-6">
          {/* Upload section */}
          <Card header={<span className="text-sm font-semibold">Upload Documents</span>}>
            <DocumentUploader
              projectId={effectiveProjectId}
              onUploadComplete={() => {
                // DocumentList auto-refreshes via React Query invalidation
              }}
            />
          </Card>

          {/* Document list */}
          <div>
            <h2 className="text-base font-semibold text-secondary-800 mb-3">Documents</h2>
            <DocumentList projectId={effectiveProjectId} />
          </div>
        </div>
      ) : (
        !projectsLoading && projectList.length > 0 && (
          <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-secondary-200 bg-secondary-50 p-12 text-center">
            <p className="text-sm text-secondary-500">Select a project to manage its documents</p>
          </div>
        )
      )}
    </div>
  );
}
