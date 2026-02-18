import { useState } from 'react';
import { useProjectStats } from '../../hooks/useAnalytics';
import type { ProjectStat } from '../../hooks/useAnalytics';

type SortField = 'projectName' | 'sessionCount' | 'avgQuality' | 'documentCount';

function qualityBadge(score: number): string {
  if (score >= 80) return 'bg-green-100 text-green-700';
  if (score >= 60) return 'bg-yellow-100 text-yellow-700';
  if (score > 0) return 'bg-red-100 text-red-700';
  return 'bg-gray-100 text-gray-500';
}

export function ProjectStats() {
  const { data, isLoading } = useProjectStats();
  const [sortField, setSortField] = useState<SortField>('sessionCount');
  const [sortAsc, setSortAsc] = useState(false);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  }

  const sorted = [...(data ?? [])].sort((a, b) => {
    const av = a[sortField];
    const bv = b[sortField];
    const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number);
    return sortAsc ? cmp : -cmp;
  });

  const sortIcon = (field: SortField) =>
    sortField === field ? (sortAsc ? ' \u2191' : ' \u2193') : '';

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="mb-4 text-sm font-semibold text-gray-900">Project Statistics</h3>
      {isLoading ? (
        <div className="flex h-32 items-center justify-center text-sm text-gray-400">Loading...</div>
      ) : !sorted || sorted.length === 0 ? (
        <div className="flex h-32 items-center justify-center text-sm text-gray-400">
          No projects yet. Create a project to see statistics.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {([
                  ['projectName', 'Project'],
                  ['sessionCount', 'Sessions'],
                  ['avgQuality', 'Avg Quality'],
                  ['documentCount', 'Documents'],
                ] as [SortField, string][]).map(([field, label]) => (
                  <th
                    key={field}
                    className="cursor-pointer pb-2 pr-4 text-xs font-medium text-gray-500 hover:text-gray-700"
                    onClick={() => handleSort(field)}
                  >
                    {label}{sortIcon(field)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((p: ProjectStat) => (
                <tr key={p.projectId} className="border-b border-gray-50 last:border-0">
                  <td className="py-2.5 pr-4">
                    <a
                      href={`/projects/${p.projectId}`}
                      className="font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      {p.projectName}
                    </a>
                  </td>
                  <td className="py-2.5 pr-4 text-gray-700">{p.sessionCount}</td>
                  <td className="py-2.5 pr-4">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${qualityBadge(p.avgQuality)}`}>
                      {p.avgQuality > 0 ? p.avgQuality : '—'}
                    </span>
                  </td>
                  <td className="py-2.5 text-gray-700">{p.documentCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
