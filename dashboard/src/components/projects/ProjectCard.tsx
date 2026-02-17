import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ProjectResponse } from '@agenttailor/shared';
import { Badge } from '../ui';

export interface ProjectCardProps {
  project: ProjectResponse;
  onEdit: (project: ProjectResponse) => void;
  onDelete: (project: ProjectResponse) => void;
}

export function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const handleCardClick = () => {
    navigate(`/projects/${project.id}`);
  };

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(project.updatedAt));

  const truncatedDescription =
    project.description && project.description.length > 120
      ? `${project.description.slice(0, 120)}...`
      : project.description;

  return (
    <div className="group relative rounded-lg border border-secondary-200 bg-white shadow-sm hover:shadow-md hover:border-primary-300 transition-all duration-200 cursor-pointer flex flex-col">
      {/* Clickable body */}
      <div
        className="flex-1 p-5"
        onClick={handleCardClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') handleCardClick();
        }}
        aria-label={`Open project ${project.name}`}
      >
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="text-sm font-semibold text-secondary-900 leading-tight line-clamp-2 flex-1">
            {project.name}
          </h3>
          <Badge variant="info" className="shrink-0">
            {project.documentCount} {project.documentCount === 1 ? 'doc' : 'docs'}
          </Badge>
        </div>

        {/* Description */}
        {truncatedDescription ? (
          <p className="text-sm text-secondary-500 leading-relaxed mb-4">
            {truncatedDescription}
          </p>
        ) : (
          <p className="text-sm text-secondary-400 italic mb-4">No description</p>
        )}

        {/* Footer */}
        <p className="text-xs text-secondary-400">Updated {formattedDate}</p>
      </div>

      {/* Three-dot menu */}
      <div
        className="absolute top-3 right-3"
        ref={menuRef}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          className="flex items-center justify-center w-7 h-7 rounded-md text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Project options"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          {/* Three dots icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>

        {menuOpen && (
          <div
            className="absolute right-0 mt-1 w-36 rounded-md bg-white border border-secondary-200 shadow-lg z-10 py-1"
            role="menu"
          >
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-secondary-700 hover:bg-secondary-50 hover:text-secondary-900"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                onEdit(project);
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-secondary-400"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
              Edit
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                onDelete(project);
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
