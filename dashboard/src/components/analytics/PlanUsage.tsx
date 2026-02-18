import { usePlanUsage } from '../../hooks/useAnalytics';

function usageColor(percent: number): string {
  if (percent >= 90) return 'text-red-600';
  if (percent >= 80) return 'text-amber-600';
  return 'text-indigo-600';
}

function barColor(percent: number): string {
  if (percent >= 90) return 'bg-red-500';
  if (percent >= 80) return 'bg-amber-500';
  return 'bg-indigo-500';
}

export function PlanUsage() {
  const { data, isLoading } = usePlanUsage();

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex h-24 items-center justify-center text-sm text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!data) return null;

  const { used, limit, planTier, percentUsed } = data;
  const isWarning = percentUsed >= 80;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Plan Usage</h3>
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
          {planTier}
        </span>
      </div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className={`text-2xl font-bold ${usageColor(percentUsed)}`}>
          {used}
        </span>
        <span className="text-sm text-gray-500">of {limit} requests today</span>
      </div>
      <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full transition-all ${barColor(percentUsed)}`}
          style={{ width: `${Math.min(percentUsed, 100)}%` }}
        />
      </div>
      <p className={`text-xs ${isWarning ? 'font-medium text-amber-600' : 'text-gray-500'}`}>
        {isWarning
          ? `${percentUsed}% used — approaching your daily limit`
          : `${percentUsed}% of daily limit used`}
      </p>
      {planTier === 'FREE' && percentUsed >= 60 && (
        <a
          href="/settings"
          className="mt-3 inline-block rounded bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
        >
          Upgrade Plan
        </a>
      )}
    </div>
  );
}
