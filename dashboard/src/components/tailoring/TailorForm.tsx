import { useState } from 'react';
import { Button, TextArea, ErrorBanner, Spinner } from '../ui';
import { useProjects } from '../../hooks/useProjects';
import type { TailorRequestBody, TailorResponse } from '../../hooks/useTailoring';
import { useTailorContext } from '../../hooks/useTailoring';
import { useToast } from '../../hooks/useToast';

export interface TailorFormProps {
  onResult: (result: TailorResponse) => void;
}

export function TailorForm({ onResult }: TailorFormProps) {
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const tailorMutation = useTailorContext();
  const { toast } = useToast();

  const [projectId, setProjectId] = useState('');
  const [taskInput, setTaskInput] = useState('');
  const [targetPlatform, setTargetPlatform] = useState<'chatgpt' | 'claude'>('claude');
  const [includeWebSearch, setIncludeWebSearch] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!projectId) {
      toast.error('Please select a project.');
      return;
    }
    if (!taskInput.trim()) {
      toast.error('Please describe what you are working on.');
      return;
    }

    const body: TailorRequestBody = {
      projectId,
      taskInput: taskInput.trim(),
      targetPlatform,
      options: { includeWebSearch },
    };

    try {
      const result = await tailorMutation.mutateAsync(body);
      toast.success('Context assembled successfully!');
      onResult(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to assemble context';
      toast.error(message);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-5">
      {/* Project selector */}
      <div className="flex flex-col gap-1">
        <label htmlFor="project-select" className="text-sm font-medium text-secondary-700">
          Project
        </label>
        {projectsLoading ? (
          <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-secondary-300 bg-white">
            <Spinner size="sm" />
            <span className="text-sm text-secondary-400">Loading projects…</span>
          </div>
        ) : (
          <select
            id="project-select"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            disabled={tailorMutation.isPending}
            className="w-full rounded-md border border-secondary-300 bg-white px-3 py-2 text-sm text-secondary-900 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:border-primary-500 focus:ring-primary-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">Select a project…</option>
            {projects?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Task description */}
      <TextArea
        label="What are you working on?"
        id="task-input"
        placeholder="Describe your task, question, or goal in detail…"
        value={taskInput}
        onChange={(e) => setTaskInput(e.target.value)}
        rows={4}
        disabled={tailorMutation.isPending}
      />

      {/* Target platform toggle */}
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-secondary-700">Target Platform</span>
        <div className="flex rounded-md border border-secondary-300 overflow-hidden w-fit">
          <button
            type="button"
            onClick={() => setTargetPlatform('claude')}
            disabled={tailorMutation.isPending}
            className={[
              'px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500',
              targetPlatform === 'claude'
                ? 'bg-amber-500 text-white'
                : 'bg-white text-secondary-600 hover:bg-secondary-50',
            ].join(' ')}
          >
            Claude
          </button>
          <button
            type="button"
            onClick={() => setTargetPlatform('chatgpt')}
            disabled={tailorMutation.isPending}
            className={[
              'px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 border-l border-secondary-300',
              targetPlatform === 'chatgpt'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-secondary-600 hover:bg-secondary-50',
            ].join(' ')}
          >
            ChatGPT
          </button>
        </div>
      </div>

      {/* Web search toggle */}
      <label className="flex items-center gap-3 cursor-pointer w-fit">
        <button
          type="button"
          role="switch"
          aria-checked={includeWebSearch}
          onClick={() => setIncludeWebSearch((prev) => !prev)}
          disabled={tailorMutation.isPending}
          className={[
            'relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
            includeWebSearch ? 'bg-primary-600' : 'bg-secondary-300',
            'disabled:cursor-not-allowed disabled:opacity-60',
          ].join(' ')}
        >
          <span
            className={[
              'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform mt-0.5',
              includeWebSearch ? 'translate-x-4.5' : 'translate-x-0.5',
            ].join(' ')}
          />
        </button>
        <span className="text-sm text-secondary-700">Include web search</span>
      </label>

      {/* Error banner */}
      {tailorMutation.isError && (
        <ErrorBanner
          message={
            tailorMutation.error instanceof Error
              ? tailorMutation.error.message
              : 'Failed to assemble context'
          }
        />
      )}

      {/* Submit */}
      <div>
        <Button
          type="submit"
          variant="primary"
          size="md"
          loading={tailorMutation.isPending}
          disabled={tailorMutation.isPending}
        >
          {tailorMutation.isPending ? 'Assembling…' : 'Tailor Context'}
        </Button>
      </div>
    </form>
  );
}
