import { useState } from 'react';
import { useConfigLibrary } from '../../hooks/useConfigLibrary';

interface ConfigLibraryBrowserProps {
  onSelect?: (template: { id: string; name: string; content: string; stack: string[]; domain: string }) => void;
}

export function ConfigLibraryBrowser({ onSelect }: ConfigLibraryBrowserProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const { data, isLoading } = useConfigLibrary({ query: search || undefined, category: category || undefined });

  const templates = data?.templates ?? [];

  return (
    <div className="space-y-4">
      {/* Search + filter */}
      <div className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search configs..."
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
        >
          <option value="">All categories</option>
          <option value="scaffold">Scaffold</option>
          <option value="backend">Backend</option>
          <option value="frontend">Frontend</option>
          <option value="llm">LLM</option>
          <option value="infrastructure">Infrastructure</option>
          <option value="testing">Testing</option>
          <option value="documentation">Documentation</option>
          <option value="security">Security</option>
        </select>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Results */}
      {!isLoading && templates.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-8">No configs found. Try adjusting your search.</p>
      )}

      <div className="grid gap-3">
        {templates.map((template) => (
          <div
            key={template.id}
            className="p-4 rounded-lg border border-slate-200 hover:border-indigo-300 transition-colors cursor-pointer"
            onClick={() => onSelect?.({
              id: template.id,
              name: template.name,
              content: template.content,
              stack: template.stack,
              domain: template.domain,
            })}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">{template.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{template.category} &middot; {template.domain}</p>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <span>{template.rating.toFixed(1)}</span>
                <svg className="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 0 0 .95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 0 0-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 0 0-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 0 0-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 0 0 .951-.69l1.07-3.292z" />
                </svg>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {template.stack.map((tech) => (
                <span
                  key={tech}
                  className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600"
                >
                  {tech}
                </span>
              ))}
            </div>
            {template.isBuiltIn && (
              <span className="mt-2 inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 text-indigo-700">
                Built-in
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
