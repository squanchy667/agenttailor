import { useSummaryStats } from '../hooks/useAnalytics';
import { UsageChart } from '../components/analytics/UsageChart';
import { QualityTrend } from '../components/analytics/QualityTrend';
import { ProjectStats } from '../components/analytics/ProjectStats';
import { PlanUsage } from '../components/analytics/PlanUsage';

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

export function AnalyticsPage() {
  const { data: summary, isLoading } = useSummaryStats();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Analytics</h1>

      {/* Summary cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Total Sessions" value={summary.totalSessions} />
          <StatCard label="Total Documents" value={summary.totalDocuments} />
          <StatCard
            label="Avg Quality"
            value={summary.avgQualityAllTime > 0 ? `${summary.avgQualityAllTime}%` : '—'}
          />
          <StatCard label="Active Projects" value={summary.activeProjects} />
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          No data yet. Start by creating a project and running a tailoring session.
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <UsageChart />
        <QualityTrend />
      </div>

      {/* Project stats + plan usage */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ProjectStats />
        </div>
        <PlanUsage />
      </div>
    </div>
  );
}
