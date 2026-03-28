import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Building2, Users, TrendingUp } from 'lucide-react';
import api from '../services/api.ts';
import type { Application, AnalyticsOverview } from '../types/index.ts';
import { STATUS_CONFIG } from '../types/index.ts';

export function Dashboard() {
  const [recentApps, setRecentApps] = useState<Application[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/applications?sort=created_at&order=desc'),
      api.get('/analytics/overview'),
    ])
      .then(([appsRes, analyticsRes]) => {
        setRecentApps(appsRes.data.slice(0, 5));
        setAnalytics(analyticsRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="animate-pulse space-y-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-24 rounded-xl bg-gray-200 dark:bg-gray-800" />
      ))}
    </div>;
  }

  const stats = [
    {
      label: 'Total applications',
      value: analytics?.response_rates?.total_applications ?? 0,
      icon: Briefcase,
      color: 'text-blue-600',
    },
    {
      label: 'Response rate',
      value: analytics?.response_rates?.response_rate_pct
        ? `${analytics.response_rates.response_rate_pct}%`
        : '—',
      icon: TrendingUp,
      color: 'text-green-600',
    },
    {
      label: 'Active companies',
      value: new Set(recentApps.map(a => a.company_id)).size,
      icon: Building2,
      color: 'text-purple-600',
    },
    {
      label: 'Pipeline stages',
      value: analytics?.pipeline_funnel?.length ?? 0,
      icon: Users,
      color: 'text-amber-600',
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-1 text-sm text-gray-500">Your job search at a glance.</p>

      {/* Stat cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card flex items-center gap-4">
            <div className={`rounded-lg bg-gray-100 p-2.5 dark:bg-gray-800 ${stat.color}`}>
              <stat.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent applications */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent applications</h2>
          <Link to="/applications" className="text-sm text-brand-600 hover:underline">
            View all
          </Link>
        </div>

        <div className="mt-4 space-y-2">
          {recentApps.length === 0 ? (
            <div className="card text-center text-sm text-gray-500 py-12">
              No applications yet. <Link to="/applications" className="text-brand-600 hover:underline">Add your first one.</Link>
            </div>
          ) : (
            recentApps.map((app) => (
              <div key={app.id} className="card flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">{app.role_title}</p>
                  <p className="text-sm text-gray-500">{app.company_name}</p>
                </div>
                <span className={`badge ${STATUS_CONFIG[app.status].color}`}>
                  {STATUS_CONFIG[app.status].label}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
