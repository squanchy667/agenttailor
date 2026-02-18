import { useState } from 'react';
import { AgentRequirementForm, type AgentRequirementFormData } from '../components/agents/AgentRequirementForm';
import { AgentPreview } from '../components/agents/AgentPreview';
import { AgentExporter } from '../components/agents/AgentExporter';
import { ConfigSourceList } from '../components/agents/ConfigSourceList';
import { useGenerateAgent } from '../hooks/useAgents';
import { useProjects } from '../hooks/useProjects';

interface GenerationResult {
  exportedContent: string;
  qualityScore: number;
  configSourceCount: number;
  processingTimeMs: number;
  agent: {
    name: string;
    sourceAttribution: Array<{
      url?: string;
      name: string;
      type: string;
      relevanceScore?: number;
    }>;
  };
}

export function AgentBuilderPage() {
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [format, setFormat] = useState('CLAUDE_AGENT');
  const generateAgent = useGenerateAgent();
  const { data: projects } = useProjects();

  function handleSubmit(data: AgentRequirementFormData) {
    setResult(null);
    setFormat(data.targetFormat);
    generateAgent.mutate(data, {
      onSuccess: (res) => {
        setResult(res as unknown as GenerationResult);
      },
    });
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Agent Builder</h1>
        <p className="text-sm text-slate-500 mt-1">
          Create specialized AI agents by combining proven configurations with your project documentation.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Form */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Agent Requirements</h2>
          <AgentRequirementForm
            onSubmit={handleSubmit}
            isLoading={generateAgent.isPending}
            projects={projects?.map((p) => ({ id: p.id, name: p.name })) ?? []}
          />
          {generateAgent.isError && (
            <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-700">
                Generation failed. Please try again.
              </p>
            </div>
          )}
        </div>

        {/* Right: Preview + Export */}
        <div className="space-y-4">
          {generateAgent.isPending && (
            <div className="bg-white rounded-xl border border-slate-200 p-8 flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-600">Generating agent...</p>
              <p className="text-xs text-slate-400">Searching configs, scoring, synthesizing...</p>
            </div>
          )}

          {result && (
            <>
              <AgentPreview
                content={result.exportedContent}
                qualityScore={result.qualityScore}
                format={format}
                configSourceCount={result.configSourceCount}
                processingTimeMs={result.processingTimeMs}
              />

              <ConfigSourceList
                sources={result.agent.sourceAttribution}
              />

              <AgentExporter
                content={result.exportedContent}
                format={format}
                agentName={result.agent.name}
              />
            </>
          )}

          {!result && !generateAgent.isPending && (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-indigo-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                </svg>
              </div>
              <p className="text-sm text-slate-600">Fill in the requirements and click Generate</p>
              <p className="text-xs text-slate-400 mt-1">Your agent will appear here with quality score and sources</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
