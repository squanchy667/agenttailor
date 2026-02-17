import { useCallback, useRef, useState } from 'react';
import { Button, Spinner } from '../ui';
import { useUploadDocument } from '../../hooks/useDocuments';
import { useToast } from '../../hooks/useToast';

// ---- Types ------------------------------------------------------------------

export interface DocumentUploaderProps {
  projectId: string;
  onUploadComplete?: () => void;
  className?: string;
}

interface FileUploadState {
  file: File;
  progress: number;
  status: 'uploading' | 'done' | 'error';
  error?: string;
}

// ---- Helpers ----------------------------------------------------------------

const ACCEPTED_EXTENSIONS = ['.pdf', '.md', '.txt', '.docx', '.html', '.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go', '.rs', '.cpp', '.c', '.cs', '.rb', '.php', '.swift', '.kt'];
const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'text/markdown',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/html',
  'text/typescript',
  'text/javascript',
  'application/javascript',
];

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exp);
  return `${value.toFixed(exp === 0 ? 0 : 1)} ${units[exp]}`;
}

function isAcceptedFile(file: File): boolean {
  if (ACCEPTED_MIME_TYPES.includes(file.type)) return true;
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  return ACCEPTED_EXTENSIONS.includes(ext);
}

// ---- Component --------------------------------------------------------------

export function DocumentUploader({ projectId, onUploadComplete, className = '' }: DocumentUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploads, setUploads] = useState<FileUploadState[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mutateAsync: uploadDocument } = useUploadDocument(projectId);
  const { toast } = useToast();

  const updateUpload = useCallback((file: File, patch: Partial<FileUploadState>) => {
    setUploads((prev) =>
      prev.map((u) => (u.file === file ? { ...u, ...patch } : u))
    );
  }, []);

  const processFiles = useCallback(
    async (files: File[]) => {
      const validFiles = files.filter(isAcceptedFile);
      const invalid = files.filter((f) => !isAcceptedFile(f));

      if (invalid.length > 0) {
        toast.warning(`${invalid.length} file(s) skipped — unsupported format.`);
      }

      if (validFiles.length === 0) return;

      // Add all files to state as "uploading"
      const newUploads: FileUploadState[] = validFiles.map((file) => ({
        file,
        progress: 0,
        status: 'uploading',
      }));
      setUploads((prev) => [...prev, ...newUploads]);

      // Upload each file
      await Promise.allSettled(
        validFiles.map(async (file) => {
          try {
            await uploadDocument({
              file,
              onProgress: (progress) => updateUpload(file, { progress }),
            });
            updateUpload(file, { status: 'done', progress: 100 });
            onUploadComplete?.();
          } catch (err) {
            const error = err instanceof Error ? err.message : 'Upload failed';
            updateUpload(file, { status: 'error', error });
            toast.error(`Failed to upload "${file.name}": ${error}`);
          }
        })
      );

      // Clear completed uploads after a delay
      setTimeout(() => {
        setUploads((prev) => prev.filter((u) => u.status !== 'done'));
      }, 2000);
    },
    [uploadDocument, updateUpload, onUploadComplete, toast]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      void processFiles(files);
    },
    [processFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      void processFiles(files);
      // Reset input so same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [processFiles]
  );

  const hasActiveUploads = uploads.some((u) => u.status === 'uploading');

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload documents — drag and drop or click to browse"
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
        }}
        className={[
          'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors select-none',
          isDragOver
            ? 'border-primary-400 bg-primary-50'
            : 'border-secondary-200 bg-secondary-50 hover:border-primary-300 hover:bg-primary-50/50',
        ].join(' ')}
      >
        <div className="flex items-center justify-center h-12 w-12 rounded-full bg-white shadow-sm border border-secondary-200">
          {hasActiveUploads ? (
            <Spinner size="md" />
          ) : (
            <svg
              className="h-6 w-6 text-secondary-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>
          )}
        </div>

        <div>
          <p className="text-sm font-medium text-secondary-800">
            {isDragOver ? 'Drop files here' : 'Drag & drop files here'}
          </p>
          <p className="text-xs text-secondary-500 mt-0.5">
            or{' '}
            <span className="text-primary-600 hover:text-primary-700 font-medium">
              browse files
            </span>
          </p>
        </div>

        <p className="text-xs text-secondary-400">
          PDF, DOCX, MD, TXT, HTML, and common code files
        </p>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_EXTENSIONS.join(',')}
        className="sr-only"
        onChange={handleFileInput}
        aria-hidden="true"
      />

      {/* Upload progress list */}
      {uploads.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label="Upload progress">
          {uploads.map((upload) => (
            <li
              key={`${upload.file.name}-${upload.file.size}`}
              className="flex items-center gap-3 rounded-lg border border-secondary-100 bg-white px-3 py-2.5 shadow-sm"
            >
              {/* File icon */}
              <div className="shrink-0">
                {upload.status === 'uploading' && <Spinner size="sm" />}
                {upload.status === 'done' && (
                  <svg className="h-4 w-4 text-accent-600" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    <path
                      fillRule="evenodd"
                      d="M13.707 4.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414L7 9.586l5.293-5.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                {upload.status === 'error' && (
                  <svg className="h-4 w-4 text-red-500" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L8 6.586l2.293-2.293a1 1 0 111.414 1.414L9.414 8l2.293 2.293a1 1 0 01-1.414 1.414L8 9.414l-2.293 2.293a1 1 0 01-1.414-1.414L6.586 8 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>

              {/* File info and progress */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-secondary-800 truncate">
                    {upload.file.name}
                  </span>
                  <span className="text-xs text-secondary-500 shrink-0">
                    {formatBytes(upload.file.size)}
                  </span>
                </div>

                {upload.status === 'uploading' && (
                  <div className="mt-1.5 h-1 w-full rounded-full bg-secondary-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary-500 transition-all duration-200"
                      style={{ width: `${upload.progress}%` }}
                      role="progressbar"
                      aria-valuenow={upload.progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Uploading ${upload.file.name}: ${upload.progress}%`}
                    />
                  </div>
                )}

                {upload.status === 'error' && upload.error && (
                  <p className="mt-0.5 text-xs text-red-600">{upload.error}</p>
                )}
              </div>

              {/* Dismiss error */}
              {upload.status === 'error' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setUploads((prev) => prev.filter((u) => u.file !== upload.file));
                  }}
                  aria-label={`Dismiss error for ${upload.file.name}`}
                  className="shrink-0 h-6 w-6 p-0"
                >
                  <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L6 5.586l.293-.293a1 1 0 111.414 1.414L7.414 7l.293.293a1 1 0 01-1.414 1.414L6 8.414l-.293.293a1 1 0 01-1.414-1.414L4.586 7l-.293-.293a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
