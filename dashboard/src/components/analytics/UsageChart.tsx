import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useSessionsOverTime } from '../../hooks/useAnalytics';

const TIME_RANGES = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
] as const;

export function UsageChart() {
  const [days, setDays] = useState(30);
  const { data, isLoading } = useSessionsOverTime(days);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Sessions Over Time</h3>
        <div className="flex gap-1">
          {TIME_RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => setDays(r.days)}
              className={`rounded px-2.5 py-1 text-xs font-medium transition ${
                days === r.days
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      {isLoading ? (
        <div className="flex h-52 items-center justify-center text-sm text-gray-400">Loading...</div>
      ) : !data || data.length === 0 ? (
        <div className="flex h-52 items-center justify-center text-sm text-gray-400">
          No sessions yet. Start tailoring to see usage data.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={208}>
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(v: string) => v.slice(5)} // MM-DD
              tick={{ fontSize: 11 }}
              interval="preserveStartEnd"
            />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip
              labelFormatter={(label) => `Date: ${String(label)}`}
              formatter={(value) => [`${value} session${value !== 1 ? 's' : ''}`, 'Count']}
            />
            <Bar dataKey="count" fill="#6366f1" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
