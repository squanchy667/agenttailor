interface FormatSelectorProps {
  value: string;
  onChange: (format: string) => void;
}

const FORMATS = [
  {
    id: 'CLAUDE_AGENT',
    label: 'Claude Code Agent',
    description: 'YAML frontmatter + markdown for Claude Code .claude/agents/',
    icon: '🤖',
  },
  {
    id: 'CURSOR_RULES',
    label: 'Cursor Rules',
    description: 'Flat text conventions for .cursorrules file',
    icon: '📝',
  },
  {
    id: 'SYSTEM_PROMPT',
    label: 'System Prompt',
    description: 'Plain text role + instructions for any LLM',
    icon: '💬',
  },
];

export function FormatSelector({ value, onChange }: FormatSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">Export Format</label>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {FORMATS.map((format) => (
          <button
            key={format.id}
            type="button"
            onClick={() => onChange(format.id)}
            className={[
              'flex flex-col items-start p-3 rounded-lg border text-left transition-colors',
              value === format.id
                ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                : 'border-slate-200 hover:border-slate-300',
            ].join(' ')}
          >
            <span className="text-lg mb-1">{format.icon}</span>
            <span className="text-sm font-medium text-slate-900">{format.label}</span>
            <span className="text-xs text-slate-500 mt-0.5">{format.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
