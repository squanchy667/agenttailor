import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  SkeletonText,
  Spinner,
} from '../components/ui';
import { ProjectForm } from '../components/projects/ProjectForm';
import { useProject } from '../hooks/useProjects';

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);

  const { data: project, isLoading, isError, error, refetch } = useProject(projectId ?? '');

  const formattedCreated = project
    ? new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(project.createdAt))
    : '';

  const formattedUpdated = project
    ? new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(project.updatedAt))
    : '';

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        {/* Back + skeleton header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                clipRule="evenodd"
              />
            </svg>
          </Button>
          <SkeletonText lines={1} className="w-48" />
        </div>
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" label="Loading project..." />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/projects')}
          className="self-start"
        >
          Back to Projects
        </Button>
        <ErrorBanner
          message={error instanceof Error ? error.message : 'Failed to load project'}
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="flex flex-col gap-6">
      {/* Back navigation */}
      <button
        type="button"
        onClick={() => navigate('/projects')}
        className="inline-flex items-center gap-1.5 text-sm text-secondary-500 hover:text-secondary-700 self-start"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
            clipRule="evenodd"
          />
        </svg>
        Back to Projects
      </button>

      {/* Project header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap mb-1">
            <h1 className="text-2xl font-semibold text-secondary-900 truncate">
              {project.name}
            </h1>
            <Badge variant="info">
              {project.documentCount} {project.documentCount === 1 ? 'document' : 'documents'}
            </Badge>
          </div>
          {project.description && (
            <p className="text-sm text-secondary-600 mt-1 max-w-2xl">
              {project.description}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="md"
          onClick={() => setEditOpen(true)}
          iconLeft={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          }
        >
          Edit Project
        </Button>
      </div>

      {/* Overview stats */}
      <section aria-labelledby="overview-heading">
        <h2 id="overview-heading" className="text-sm font-semibold text-secondary-700 uppercase tracking-wide mb-3">
          Overview
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card variant="flat">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-secondary-500 uppercase tracking-wide">Documents</span>
              <span className="text-2xl font-bold text-secondary-900">{project.documentCount}</span>
            </div>
          </Card>
          <Card variant="flat">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-secondary-500 uppercase tracking-wide">Created</span>
              <span className="text-sm font-medium text-secondary-800">{formattedCreated}</span>
            </div>
          </Card>
          <Card variant="flat">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-secondary-500 uppercase tracking-wide">Last Updated</span>
              <span className="text-sm font-medium text-secondary-800">{formattedUpdated}</span>
            </div>
          </Card>
        </div>
      </section>

      {/* Documents section */}
      <section aria-labelledby="documents-heading">
        <div className="flex items-center justify-between mb-3">
          <h2 id="documents-heading" className="text-sm font-semibold text-secondary-700 uppercase tracking-wide">
            Documents
          </h2>
          <Button
            variant="outline"
            size="sm"
            iconLeft={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            }
          >
            Upload
          </Button>
        </div>
        <Card variant="outlined">
          <EmptyState
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
            }
            title="No documents yet"
            description="Upload PDFs, Word docs, Markdown, or text files to build AI context."
            action={{ label: 'Upload Document', onClick: () => {} }}
          />
        </Card>
      </section>

      {/* Recent Sessions section */}
      <section aria-labelledby="sessions-heading">
        <div className="flex items-center justify-between mb-3">
          <h2 id="sessions-heading" className="text-sm font-semibold text-secondary-700 uppercase tracking-wide">
            Recent Sessions
          </h2>
        </div>
        <Card variant="outlined">
          <EmptyState
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
            title="No sessions yet"
            description="Tailoring sessions will appear here after you use the browser extension."
          />
        </Card>
      </section>

      {/* Edit modal */}
      <ProjectForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        project={project}
      />
    </div>
  );
}
