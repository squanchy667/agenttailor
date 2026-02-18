import { useState } from 'react';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from 'recharts';
import { useQualityTrend } from '../../hooks/useAnalytics';

const TIME_RANGES = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
] as const;

function qualityColor(score: number): string {
  if (score >= 80) return '#22c55e'; // green
  if (score >= 60) return '#eab308'; // yellow
  return '#ef4444'; // red
}

export function QualityTrend() {
  const [days, setDays] = useState(30);
  const { data, isLoading } = useQualityTrend(days);

  // Filter out days with no data for the chart
  const chartData = data?.filter((d) => d.avgScore > 0) ?? [];
  const lastEntry = chartData[chartData.length - 1];
  const latestAvg = lastEntry ? lastEntry.avgScore : 0;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-gray-900">Quality Trend</h3>
          {latestAvg > 0 && (
            <span
              className="rounded-full px-2 py-0.5 text-xs font-medium"
              style={{
                backgroundColor: `${qualityColor(latestAvg)}20`,
                color: qualityColor(latestAvg),
              }}
            >
              {latestAvg.toFixed(0)}
            </span>
          )}
        </div>
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
      ) : chartData.length === 0 ? (
        <div className="flex h-52 items-center justify-center text-sm text-gray-400">
          No quality data yet. Scores appear after tailoring sessions.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={208}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(v: string) => v.slice(5)}
              tick={{ fontSize: 11 }}
              interval="preserveStartEnd"
            />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
            <Tooltip
              labelFormatter={(label) => `Date: ${String(label)}`}
              formatter={(value, name) => [
                Number(value).toFixed(1),
                name === 'avgScore' ? 'Average' : name === 'minScore' ? 'Min' : 'Max',
              ]}
            />
            <Area
              dataKey="maxScore"
              fill="#6366f120"
              stroke="none"
              type="monotone"
            />
            <Area
              dataKey="minScore"
              fill="#ffffff"
              stroke="none"
              type="monotone"
            />
            <Line
              dataKey="avgScore"
              stroke="#6366f1"
              strokeWidth={2}
              dot={{ r: 3 }}
              type="monotone"
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
