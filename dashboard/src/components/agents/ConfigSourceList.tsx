interface ConfigSourceItem {
  url?: string;
  name: string;
  type: string;
  relevanceScore?: number;
}

interface ConfigSourceListProps {
  sources: ConfigSourceItem[];
}

export function ConfigSourceList({ sources }: ConfigSourceListProps) {
  if (sources.length === 0) return null;

  return (
    <div className="rounded-lg border border-slate-200">
      <div className="px-4 py-2 border-b border-slate-200 bg-slate-50">
        <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
          Config Sources ({sources.length})
        </h4>
      </div>
      <ul className="divide-y divide-slate-100">
        {sources.map((source, i) => (
          <li key={i} className="flex items-center gap-3 px-4 py-2.5">
            <span
              className={[
                'w-6 h-6 rounded flex items-center justify-center text-xs font-bold shrink-0',
                source.type === 'project' ? 'bg-blue-100 text-blue-700'
                  : source.type === 'curated' ? 'bg-green-100 text-green-700'
                    : 'bg-purple-100 text-purple-700',
              ].join(' ')}
            >
              {source.type === 'project' ? 'P' : source.type === 'curated' ? 'C' : 'O'}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-700 truncate">
                {source.url && source.url.startsWith('http') ? (
                  <a href={source.url} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600">
                    {source.name}
                  </a>
                ) : (
                  source.name
                )}
              </p>
              <p className="text-xs text-slate-400 capitalize">{source.type}</p>
            </div>
            {source.relevanceScore != null && (
              <span className="text-xs text-slate-500 shrink-0">
                {Math.round(source.relevanceScore * 100)}%
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
