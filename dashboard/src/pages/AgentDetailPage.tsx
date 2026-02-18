import { useParams, useNavigate } from 'react-router-dom';
import { useAgent, useDeleteAgent } from '../hooks/useAgents';
import { AgentExporter } from '../components/agents/AgentExporter';

export function AgentDetailPage() {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const { data: agent, isLoading, isError } = useAgent(agentId ?? '');
  const deleteAgent = useDeleteAgent();

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isError || !agent) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <h2 className="text-lg font-semibold text-slate-900">Agent not found</h2>
        <p className="text-sm text-slate-500 mt-1">The agent may have been deleted.</p>
        <button
          onClick={() => navigate('/agents/builder')}
          className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          Create a new agent
        </button>
      </div>
    );
  }

  const qualityPercent = agent.qualityScore != null ? Math.round(agent.qualityScore * 100) : null;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{agent.name}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {agent.role} &middot; {agent.model} &middot;{' '}
            {agent.format === 'CLAUDE_AGENT' ? 'Claude Agent' : agent.format === 'CURSOR_RULES' ? 'Cursor Rules' : 'System Prompt'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {qualityPercent != null && (
            <span
              className={[
                'px-2 py-1 rounded text-sm font-bold',
                qualityPercent >= 70
                  ? 'bg-green-100 text-green-700'
                  : qualityPercent >= 40
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700',
              ].join(' ')}
            >
              {qualityPercent}%
            </span>
          )}
          <button
            onClick={() => {
              if (confirm('Delete this agent?')) {
                deleteAgent.mutate(agent.id, {
                  onSuccess: () => navigate('/agents/builder'),
                });
              }
            }}
            className="px-3 py-1.5 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
          <h2 className="text-sm font-semibold text-slate-700">Agent Content</h2>
        </div>
        <div className="p-4 max-h-[500px] overflow-y-auto">
          <pre className="text-xs text-slate-700 font-mono whitespace-pre-wrap leading-relaxed">
            {agent.content}
          </pre>
        </div>
      </div>

      {/* Export */}
      <AgentExporter
        content={agent.content}
        format={agent.format}
        agentName={agent.name}
      />

      {/* Metadata */}
      <div className="mt-6 text-xs text-slate-400">
        Created: {new Date(agent.createdAt).toLocaleString()}
        {agent.projectId && <span> &middot; Project: {agent.projectId}</span>}
      </div>
    </div>
  );
}
