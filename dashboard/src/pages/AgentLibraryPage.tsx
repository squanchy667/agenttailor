import { useState } from 'react';
import { ConfigLibraryBrowser } from '../components/agents/ConfigLibraryBrowser';

export function AgentLibraryPage() {
  const [selectedConfig, setSelectedConfig] = useState<{
    id: string;
    name: string;
    content: string;
    stack: string[];
    domain: string;
  } | null>(null);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Config Library</h1>
        <p className="text-sm text-slate-500 mt-1">
          Browse curated agent configurations. Use them as starting points for your own agents.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Browser */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <ConfigLibraryBrowser onSelect={setSelectedConfig} />
        </div>

        {/* Right: Preview */}
        <div>
          {selectedConfig ? (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden sticky top-4">
              <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                <h3 className="text-sm font-semibold text-slate-900">{selectedConfig.name}</h3>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedConfig.stack.map((tech) => (
                    <span key={tech} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-100 text-indigo-600">
                      {tech}
                    </span>
                  ))}
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                    {selectedConfig.domain}
                  </span>
                </div>
              </div>
              <div className="p-4 max-h-[600px] overflow-y-auto">
                <pre className="text-xs text-slate-700 font-mono whitespace-pre-wrap leading-relaxed">
                  {selectedConfig.content}
                </pre>
              </div>
              <div className="px-4 py-3 border-t border-slate-200 bg-slate-50">
                <a
                  href={`/agents/builder?fromConfig=${selectedConfig.id}`}
                  className="block w-full py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold text-center hover:bg-indigo-700 transition-colors"
                >
                  Use as Starting Point
                </a>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-slate-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
              </div>
              <p className="text-sm text-slate-600">Select a config to preview</p>
              <p className="text-xs text-slate-400 mt-1">Click any config in the library to see its contents</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
