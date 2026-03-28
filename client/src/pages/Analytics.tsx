import { useState, useEffect } from 'react';
import api from '../services/api.ts';
import type { AnalyticsOverview } from '../types/index.ts';
import { STATUS_CONFIG } from '../types/index.ts';

export function Analytics() {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics/overview')
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-48 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Analytics</h1>
      <p className="mt-1 text-sm text-gray-500">Insights into your job search performance.</p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Response rate card */}
        <div className="card">
          <h2 className="text-lg font-semibold">Response rate</h2>
          {data?.response_rates ? (
            <div className="mt-4">
              <p className="text-4xl font-bold text-brand-600">
                {data.response_rates.response_rate_pct}%
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {data.response_rates.responses} responses from{' '}
                {data.response_rates.total_applications} applications
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-500">
              Not enough data yet. Keep applying!
            </p>
          )}
        </div>

        {/* Pipeline funnel */}
        <div className="card">
          <h2 className="text-lg font-semibold">Pipeline funnel</h2>
          <div className="mt-4 space-y-2">
            {data?.pipeline_funnel && data.pipeline_funnel.length > 0 ? (
              data.pipeline_funnel.map((stage) => {
                const config = STATUS_CONFIG[stage.status];
                const maxCount = Math.max(...data.pipeline_funnel.map(s => s.count));
                const width = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;

                return (
                  <div key={stage.status} className="flex items-center gap-3">
                    <span className="w-24 text-sm text-gray-600 dark:text-gray-400">
                      {config.label}
                    </span>
                    <div className="flex-1 rounded-full bg-gray-100 dark:bg-gray-800 h-6 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-brand-500 transition-all duration-500"
                        style={{ width: `${Math.max(width, 2)}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-sm font-medium">{stage.count}</span>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-gray-500">No pipeline data yet.</p>
            )}
          </div>
        </div>

        {/* Resume performance */}
        <div className="card lg:col-span-2">
          <h2 className="text-lg font-semibold">Resume performance</h2>
          {data?.resume_performance && data.resume_performance.length > 0 ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="pb-3 text-left font-medium text-gray-500">Resume version</th>
                    <th className="pb-3 text-right font-medium text-gray-500">Times used</th>
                    <th className="pb-3 text-right font-medium text-gray-500">Got response</th>
                    <th className="pb-3 text-right font-medium text-gray-500">Response rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {data.resume_performance.map((rv) => (
                    <tr key={rv.resume_version_id}>
                      <td className="py-3 font-medium">{rv.resume_label}</td>
                      <td className="py-3 text-right text-gray-500">{rv.times_used}</td>
                      <td className="py-3 text-right text-gray-500">{rv.got_response}</td>
                      <td className="py-3 text-right font-medium">
                        {rv.response_rate_pct != null ? `${rv.response_rate_pct}%` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-500">
              Upload resume versions and link them to applications to see performance data.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
