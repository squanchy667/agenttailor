import { useState } from 'react';
import type { ProjectResponse } from '@agenttailor/shared';
import {
  Button,
  EmptyState,
  ErrorBanner,
  Input,
  Modal,
  SkeletonCard,
} from '../components/ui';
import { ProjectCard } from '../components/projects/ProjectCard';
import { ProjectForm } from '../components/projects/ProjectForm';
import { useProjects, useDeleteProject } from '../hooks/useProjects';
import { useToast } from '../hooks/useToast';

export function ProjectsPage() {
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editProject, setEditProject] = useState<ProjectResponse | null>(null);
  const [deleteProject, setDeleteProject] = useState<ProjectResponse | null>(null);

  const { toast } = useToast();

  // Use debounced search in a real app; for now pass directly
  const { data: projects, isLoading, isError, error, refetch } = useProjects(search || undefined);
  const deleteProjectMutation = useDeleteProject();

  // Client-side filter as fallback if server doesn't support search
  const filteredProjects = projects
    ? search
      ? projects.filter(
          (p) =>
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            (p.description ?? '').toLowerCase().includes(search.toLowerCase())
        )
      : projects
    : [];

  const handleDeleteConfirm = async () => {
    if (!deleteProject) return;
    try {
      await deleteProjectMutation.mutateAsync(deleteProject.id);
      toast.success(`"${deleteProject.name}" deleted`);
      setDeleteProject(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete project';
      toast.error(message);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-secondary-900">Projects</h1>
          <p className="text-sm text-secondary-500 mt-0.5">
            Manage your AI context projects
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={() => setCreateOpen(true)}
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
                d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
          }
        >
          New Project
        </Button>
      </div>

      {/* Search bar */}
      <div className="max-w-sm">
        <Input
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          prefixIcon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                clipRule="evenodd"
              />
            </svg>
          }
        />
      </div>

      {/* Error state */}
      {isError && (
        <ErrorBanner
          message={error instanceof Error ? error.message : 'Failed to load projects'}
          onRetry={() => void refetch()}
        />
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Project grid */}
      {!isLoading && !isError && filteredProjects.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={(p) => setEditProject(p)}
              onDelete={(p) => setDeleteProject(p)}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && filteredProjects.length === 0 && (
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
                d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
              />
            </svg>
          }
          title={search ? 'No projects match your search' : 'No projects yet'}
          description={
            search
              ? 'Try a different search term or clear the filter.'
              : 'Create your first project to start assembling AI context.'
          }
          action={
            !search
              ? { label: 'New Project', onClick: () => setCreateOpen(true) }
              : undefined
          }
        />
      )}

      {/* Create modal */}
      <ProjectForm
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />

      {/* Edit modal */}
      <ProjectForm
        open={editProject !== null}
        onClose={() => setEditProject(null)}
        project={editProject ?? undefined}
      />

      {/* Delete confirmation modal */}
      <Modal
        open={deleteProject !== null}
        onClose={() => setDeleteProject(null)}
        title="Delete Project"
        footer={
          <>
            <Button
              variant="outline"
              size="md"
              onClick={() => setDeleteProject(null)}
              disabled={deleteProjectMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="md"
              loading={deleteProjectMutation.isPending}
              onClick={() => void handleDeleteConfirm()}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-secondary-700">
          Are you sure you want to delete{' '}
          <span className="font-semibold">"{deleteProject?.name}"</span>? This action
          cannot be undone and will remove all associated documents.
        </p>
      </Modal>
    </div>
  );
}
