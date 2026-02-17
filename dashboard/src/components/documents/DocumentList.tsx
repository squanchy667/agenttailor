import { useState } from 'react';
import { Button, EmptyState, ErrorBanner, SkeletonTable } from '../ui';
import { DocumentStatus } from './DocumentStatus';
import type { DocumentResponse } from '../../hooks/useDocuments';
import { useDocuments, useDeleteDocument, useReprocessDocument } from '../../hooks/useDocuments';
import { useToast } from '../../hooks/useToast';

// ---- Types ------------------------------------------------------------------

export interface DocumentListProps {
  projectId: string;
  className?: string;
}

type SortField = 'filename' | 'createdAt';
type SortDirection = 'asc' | 'desc';

// ---- Helpers ----------------------------------------------------------------

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exp);
  return `${value.toFixed(exp === 0 ? 0 : 1)} ${units[exp]}`;
}

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(dateString));
}

function sortDocuments(
  docs: DocumentResponse[],
  field: SortField,
  direction: SortDirection
): DocumentResponse[] {
  return [...docs].sort((a, b) => {
    let cmp: number;
    if (field === 'filename') {
      cmp = a.filename.localeCompare(b.filename);
    } else {
      cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    return direction === 'asc' ? cmp : -cmp;
  });
}

// ---- Sort header button -----------------------------------------------------

interface SortButtonProps {
  label: string;
  field: SortField;
  currentField: SortField;
  direction: SortDirection;
  onClick: (field: SortField) => void;
}

function SortButton({ label, field, currentField, direction, onClick }: SortButtonProps) {
  const isActive = field === currentField;
  return (
    <button
      type="button"
      onClick={() => onClick(field)}
      className="inline-flex items-center gap-1 text-xs font-medium text-secondary-500 hover:text-secondary-800 uppercase tracking-wide transition-colors"
      aria-sort={isActive ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      {label}
      <svg
        className={`h-3.5 w-3.5 transition-transform ${isActive && direction === 'desc' ? 'rotate-180' : ''} ${isActive ? 'text-secondary-700' : 'text-secondary-300'}`}
        viewBox="0 0 16 16"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M8 3a.5.5 0 01.354.146l4 4a.5.5 0 11-.708.708L8 4.207 4.354 7.854a.5.5 0 11-.708-.708l4-4A.5.5 0 018 3z"
          clipRule="evenodd"
        />
      </svg>
    </button>
  );
}

// ---- Component --------------------------------------------------------------

export function DocumentList({ projectId, className = '' }: DocumentListProps) {
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { toast } = useToast();
  const { data: documents, isLoading, isError, error, refetch } = useDocuments(projectId);
  const deleteMutation = useDeleteDocument(projectId);
  const reprocessMutation = useReprocessDocument(projectId);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleDelete = async (doc: DocumentResponse) => {
    setDeletingId(doc.id);
    try {
      await deleteMutation.mutateAsync(doc.id);
      toast.success(`"${doc.filename}" deleted`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete document';
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleReprocess = async (doc: DocumentResponse) => {
    await reprocessMutation.mutateAsync(doc.id);
  };

  if (isLoading) {
    return <SkeletonTable rows={4} cols={5} className={className} />;
  }

  if (isError) {
    return (
      <ErrorBanner
        message={error instanceof Error ? error.message : 'Failed to load documents'}
        onRetry={() => void refetch()}
        className={className}
      />
    );
  }

  const docs = documents ?? [];

  if (docs.length === 0) {
    return (
      <EmptyState
        icon={
          <svg
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
        description="Upload your first document to start building context."
        className={className}
      />
    );
  }

  const sorted = sortDocuments(docs, sortField, sortDirection);

  return (
    <div className={`overflow-x-auto rounded-lg border border-secondary-200 ${className}`}>
      <table className="w-full text-sm">
        <thead className="bg-secondary-50 border-b border-secondary-200">
          <tr>
            <th className="px-4 py-3 text-left">
              <SortButton
                label="Name"
                field="filename"
                currentField={sortField}
                direction={sortDirection}
                onClick={handleSort}
              />
            </th>
            <th className="px-4 py-3 text-left">
              <span className="text-xs font-medium text-secondary-500 uppercase tracking-wide">
                Type
              </span>
            </th>
            <th className="px-4 py-3 text-left">
              <span className="text-xs font-medium text-secondary-500 uppercase tracking-wide">
                Size
              </span>
            </th>
            <th className="px-4 py-3 text-left">
              <span className="text-xs font-medium text-secondary-500 uppercase tracking-wide">
                Status
              </span>
            </th>
            <th className="px-4 py-3 text-left">
              <SortButton
                label="Uploaded"
                field="createdAt"
                currentField={sortField}
                direction={sortDirection}
                onClick={handleSort}
              />
            </th>
            <th className="px-4 py-3 text-right">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-secondary-100 bg-white">
          {sorted.map((doc) => {
            const isDeleting = deletingId === doc.id;
            return (
              <tr
                key={doc.id}
                className={`transition-colors hover:bg-secondary-50 ${isDeleting ? 'opacity-50' : ''}`}
              >
                {/* Name */}
                <td className="px-4 py-3">
                  <span className="font-medium text-secondary-900 line-clamp-1 max-w-xs block">
                    {doc.filename}
                  </span>
                </td>

                {/* Type */}
                <td className="px-4 py-3">
                  <span className="text-secondary-500">{doc.type}</span>
                </td>

                {/* Size */}
                <td className="px-4 py-3">
                  <span className="text-secondary-500 whitespace-nowrap">
                    {formatBytes(doc.sizeBytes)}
                  </span>
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <DocumentStatus status={doc.status} />
                </td>

                {/* Date */}
                <td className="px-4 py-3">
                  <span className="text-secondary-500 whitespace-nowrap">
                    {formatDate(doc.createdAt)}
                  </span>
                </td>

                {/* Actions */}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {doc.status === 'ERROR' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleReprocess(doc)}
                        disabled={reprocessMutation.isPending}
                        aria-label={`Reprocess ${doc.filename}`}
                      >
                        Retry
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleDelete(doc)}
                      disabled={isDeleting}
                      loading={isDeleting}
                      aria-label={`Delete ${doc.filename}`}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="px-4 py-2 border-t border-secondary-100 bg-secondary-50">
        <p className="text-xs text-secondary-500">
          {docs.length} {docs.length === 1 ? 'document' : 'documents'}
        </p>
      </div>
    </div>
  );
}
