import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, ErrorBanner, SkeletonText } from '../components/ui';
import { TailorForm } from '../components/tailoring/TailorForm';
import { ContextViewer } from '../components/tailoring/ContextViewer';
import { SourceCard } from '../components/tailoring/SourceCard';
import { SessionHistory } from '../components/tailoring/SessionHistory';
import type { TailorResponse } from '../hooks/useTailoring';
import { useSession } from '../hooks/useTailoring';
import type { SourceChunk } from '../components/tailoring/SourceCard';

// ---- Session detail view ----------------------------------------------------

function SessionDetailView({ sessionId }: { sessionId: string }) {
  const { data: session, isLoading, isError, error } = useSession(sessionId);

  if (isLoading) {
    return (
      <Card>
        <SkeletonText lines={6} />
      </Card>
    );
  }

  if (isError) {
    return (
      <ErrorBanner
        message={error instanceof Error ? error.message : 'Failed to load session'}
      />
    );
  }

  if (!session) return null;

  // Build a TailorResponse-like object from the session for ContextViewer
  const result: TailorResponse = {
    sessionId: session.id,
    context: session.assembledContext,
    sections: [],
    metadata: session.metadata,
  };

  return <ContextViewer result={result} />;
}

// ---- Main page --------------------------------------------------------------

export function TailoringPage() {
  const { sessionId } = useParams<{ sessionId?: string }>();
  const [liveResult, setLiveResult] = useState<TailorResponse | null>(null);

  // When viewing a historical session, show that session's context
  const showSessionDetail = Boolean(sessionId) && !liveResult;

  // Extract source cards from sections (sections have name, content, tokenCount, sourceCount)
  // The API doesn't return individual source chunks in the main response, so we derive
  // placeholder source cards from the sections array if available.
  const sourcesFromSections: SourceChunk[] = liveResult?.sections.map((section, i) => ({
    title: section.name,
    relevanceScore: Math.max(20, 100 - i * 15),
    type: 'document' as const,
    text: section.content,
  })) ?? [];

  return (
    <div className="flex flex-col gap-8">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-secondary-900">Tailor Context</h1>
        <p className="text-sm text-secondary-500 mt-0.5">
          Assemble optimized context from your documents for AI assistants.
        </p>
      </div>

      {/* Form section */}
      <Card header="New Tailoring Request">
        <TailorForm onResult={(result) => setLiveResult(result)} />
      </Card>

      {/* Live result — context viewer + source cards */}
      {liveResult && (
        <div className="flex flex-col gap-6">
          <ContextViewer result={liveResult} />

          {sourcesFromSections.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-secondary-700">Sources Used</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sourcesFromSections.map((source, i) => (
                  <SourceCard key={i} source={source} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Historical session detail */}
      {showSessionDetail && sessionId && (
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-secondary-700">Session Detail</h2>
          <SessionDetailView sessionId={sessionId} />
        </div>
      )}

      {/* Session history */}
      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-secondary-700">Session History</h2>
        <SessionHistory />
      </div>
    </div>
  );
}
