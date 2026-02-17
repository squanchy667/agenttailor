import type { HTMLAttributes } from 'react';

// Base skeleton element
function SkeletonBase({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={`animate-pulse rounded bg-secondary-200 ${className}`}
    />
  );
}

// SkeletonText: one or more lines of text placeholder
export interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

export function SkeletonText({ lines = 1, className = '' }: SkeletonTextProps) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBase
          key={i}
          className={i === lines - 1 && lines > 1 ? 'h-3 w-3/4' : 'h-3 w-full'}
        />
      ))}
    </div>
  );
}

// SkeletonAvatar: circular avatar placeholder
export interface SkeletonAvatarProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const avatarSizeClasses: Record<NonNullable<SkeletonAvatarProps['size']>, string> = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
};

export function SkeletonAvatar({ size = 'md', className = '' }: SkeletonAvatarProps) {
  return (
    <SkeletonBase
      className={`rounded-full shrink-0 ${avatarSizeClasses[size]} ${className}`}
    />
  );
}

// SkeletonCard: card-shaped placeholder
export interface SkeletonCardProps {
  className?: string;
}

export function SkeletonCard({ className = '' }: SkeletonCardProps) {
  return (
    <div
      className={`rounded-lg border border-secondary-200 bg-white p-4 space-y-3 ${className}`}
    >
      <SkeletonBase className="h-4 w-2/3" />
      <SkeletonText lines={3} />
      <div className="flex gap-2 pt-1">
        <SkeletonBase className="h-8 w-20 rounded-md" />
        <SkeletonBase className="h-8 w-20 rounded-md" />
      </div>
    </div>
  );
}

// SkeletonTable: table-shaped placeholder
export interface SkeletonTableProps {
  rows?: number;
  cols?: number;
  className?: string;
}

export function SkeletonTable({ rows = 5, cols = 4, className = '' }: SkeletonTableProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {/* Header */}
      <div className="flex gap-4 pb-2 border-b border-secondary-200">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonBase key={i} className="h-3 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex gap-4 py-1.5">
          {Array.from({ length: cols }).map((_, colIdx) => (
            <SkeletonBase
              key={colIdx}
              className={`h-3 flex-1 ${colIdx === 0 ? 'max-w-[120px]' : ''}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
