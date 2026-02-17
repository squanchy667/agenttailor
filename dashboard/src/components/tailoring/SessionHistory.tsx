import { Link } from 'react-router-dom';
import { Badge, Card, EmptyState, ErrorBanner, SkeletonCard } from '../ui';
import { useSessions } from '../../hooks/useTailoring';
import type { TailoringSessionSummary } from '../../hooks/useTailoring';

export interface SessionHistoryProps {
  projectId?: string;
}

function PlatformBadge({ platform }: { platform: TailoringSessionSummary['targetPlatform'] }) {
  return (
    <Badge variant={platform === 'chatgpt' ? 'info' : 'warning'}>
      {platform === 'chatgpt' ? 'ChatGPT' : 'Claude'}
    </Badge>
  );
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(dateStr));
}

function truncate(text: string, max = 100): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export function SessionHistory({ projectId }: SessionHistoryProps) {
  const { data: sessions, isLoading, isError, error, refetch } = useSessions(projectId);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorBanner
        message={error instanceof Error ? error.message : 'Failed to load session history'}
        onRetry={() => void refetch()}
      />
    );
  }

  if (!sessions || sessions.length === 0) {
    return (
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
        description="Submit a tailoring request above to get started."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {sessions.map((session) => (
        <Card key={session.id} className="hover:border-secondary-300 transition-colors">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            {/* Left: timestamp + task preview */}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-secondary-400 mb-1">{formatDate(session.createdAt)}</p>
              <p className="text-sm text-secondary-800 leading-snug">
                {truncate(session.taskInput)}
              </p>
            </div>

            {/* Right: badges + metadata + link */}
            <div className="flex items-center gap-3 flex-wrap shrink-0">
              <PlatformBadge platform={session.targetPlatform} />
              <span className="text-xs text-secondary-500">
                {session.tokenCount.toLocaleString()} tokens
              </span>
              <Link
                to={`/tailoring/${session.id}`}
                className="text-xs font-medium text-primary-600 hover:text-primary-800 hover:underline"
              >
                View
              </Link>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
