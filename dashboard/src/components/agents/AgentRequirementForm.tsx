import { useState } from 'react';
import { FormatSelector } from './FormatSelector';

export interface AgentRequirementFormData {
  role: string;
  stack: string[];
  domain: string;
  description: string;
  targetFormat: string;
  projectId?: string;
}

interface AgentRequirementFormProps {
  onSubmit: (data: AgentRequirementFormData) => void;
  isLoading?: boolean;
  projects?: Array<{ id: string; name: string }>;
}

const COMMON_STACKS = [
  'react', 'typescript', 'nextjs', 'vue', 'angular', 'svelte',
  'express', 'fastapi', 'django', 'rails',
  'tailwind', 'prisma', 'postgresql', 'mongodb',
  'python', 'rust', 'go', 'java',
  'unity', 'docker', 'aws',
];

const DOMAINS = ['web', 'api', 'game', 'mobile', 'ai', 'devops', 'documentation', 'testing'];

export function AgentRequirementForm({ onSubmit, isLoading, projects }: AgentRequirementFormProps) {
  const [role, setRole] = useState('');
  const [stackInput, setStackInput] = useState('');
  const [selectedStack, setSelectedStack] = useState<string[]>([]);
  const [domain, setDomain] = useState('web');
  const [description, setDescription] = useState('');
  const [targetFormat, setTargetFormat] = useState('CLAUDE_AGENT');
  const [projectId, setProjectId] = useState('');

  function handleStackAdd(tech: string) {
    if (!selectedStack.includes(tech)) {
      setSelectedStack([...selectedStack, tech]);
    }
  }

  function handleStackRemove(tech: string) {
    setSelectedStack(selectedStack.filter((s) => s !== tech));
  }

  function handleStackInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && stackInput.trim()) {
      e.preventDefault();
      handleStackAdd(stackInput.trim().toLowerCase());
      setStackInput('');
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!role.trim() || selectedStack.length === 0 || !description.trim()) return;

    onSubmit({
      role: role.trim(),
      stack: selectedStack,
      domain,
      description: description.trim(),
      targetFormat,
      projectId: projectId || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Role */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Agent Role</label>
        <input
          type="text"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="e.g. React component builder, API backend developer"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          required
        />
      </div>

      {/* Stack */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Tech Stack</label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedStack.map((tech) => (
            <span
              key={tech}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700"
            >
              {tech}
              <button
                type="button"
                onClick={() => handleStackRemove(tech)}
                className="text-indigo-400 hover:text-indigo-600"
              >
                &times;
              </button>
            </span>
          ))}
        </div>
        <input
          type="text"
          value={stackInput}
          onChange={(e) => setStackInput(e.target.value)}
          onKeyDown={handleStackInputKeyDown}
          placeholder="Type and press Enter to add..."
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none mb-2"
        />
        <div className="flex flex-wrap gap-1">
          {COMMON_STACKS.filter((s) => !selectedStack.includes(s)).map((tech) => (
            <button
              key={tech}
              type="button"
              onClick={() => handleStackAdd(tech)}
              className="px-2 py-0.5 rounded text-xs text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 transition-colors"
            >
              + {tech}
            </button>
          ))}
        </div>
      </div>

      {/* Domain */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Domain</label>
        <select
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
        >
          {DOMAINS.map((d) => (
            <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what this agent should do, its responsibilities, and any specific requirements..."
          rows={4}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
          required
        />
      </div>

      {/* Target Format */}
      <FormatSelector value={targetFormat} onChange={setTargetFormat} />

      {/* Project link (optional) */}
      {projects && projects.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Link Project (optional)</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          >
            <option value="">No project — use online configs only</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading || !role.trim() || selectedStack.length === 0 || !description.trim()}
        className="w-full py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? 'Generating...' : 'Generate Agent'}
      </button>
    </form>
  );
}
