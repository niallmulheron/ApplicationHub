import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, GripVertical, List } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import api from '../services/api.ts';
import type { Application, ApplicationStatus } from '../types/index.ts';
import { STATUS_CONFIG } from '../types/index.ts';

// ─── Board config ─────────────────────────────────────────────────────────────

const BOARD_COLUMNS: ApplicationStatus[] = [
  'bookmarked',
  'applied',
  'screening',
  'interviewing',
  'offer',
  'accepted',
  'rejected',
  'withdrawn',
];

const COLUMN_COLORS: Record<ApplicationStatus, string> = {
  bookmarked:   'border-t-gray-400',
  applied:      'border-t-blue-500',
  screening:    'border-t-yellow-500',
  interviewing: 'border-t-purple-500',
  offer:        'border-t-green-500',
  accepted:     'border-t-emerald-500',
  rejected:     'border-t-red-500',
  withdrawn:    'border-t-gray-300',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function Board() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  // Drag state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ApplicationStatus | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const dragCounter = useRef<Record<string, number>>({});

  useEffect(() => {
    api.get('/applications')
      .then((res) => setApplications(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Group applications by status
  const columns: Record<ApplicationStatus, Application[]> = {} as any;
  for (const status of BOARD_COLUMNS) {
    columns[status] = [];
  }
  for (const app of applications) {
    if (columns[app.status]) {
      columns[app.status].push(app);
    }
  }

  // ── Drag handlers ─────────────────────────────────────────────────────────

  function handleDragStart(e: React.DragEvent, appId: string) {
    setDraggingId(appId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', appId);

    // Slight delay so the dragged element doesn't disappear instantly
    requestAnimationFrame(() => {
      const el = document.getElementById(`card-${appId}`);
      if (el) el.style.opacity = '0.4';
    });
  }

  function handleDragEnd(appId: string) {
    setDraggingId(null);
    setDragOverColumn(null);
    dragCounter.current = {};
    const el = document.getElementById(`card-${appId}`);
    if (el) el.style.opacity = '1';
  }

  function handleColumnDragEnter(status: ApplicationStatus) {
    if (!dragCounter.current[status]) dragCounter.current[status] = 0;
    dragCounter.current[status]++;
    setDragOverColumn(status);
  }

  function handleColumnDragLeave(status: ApplicationStatus) {
    dragCounter.current[status]--;
    if (dragCounter.current[status] <= 0) {
      dragCounter.current[status] = 0;
      if (dragOverColumn === status) {
        setDragOverColumn(null);
      }
    }
  }

  function handleColumnDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  const handleDrop = useCallback(async (e: React.DragEvent, targetStatus: ApplicationStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    dragCounter.current = {};

    const appId = e.dataTransfer.getData('text/plain');
    if (!appId) return;

    const app = applications.find((a) => a.id === appId);
    if (!app || app.status === targetStatus) {
      setDraggingId(null);
      return;
    }

    // Optimistic update
    setApplications((prev) =>
      prev.map((a) => (a.id === appId ? { ...a, status: targetStatus } : a)),
    );
    setDraggingId(null);
    setUpdating(appId);

    try {
      await api.patch(`/applications/${appId}`, { status: targetStatus });
    } catch {
      // Revert on failure
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status: app.status } : a)),
      );
    } finally {
      setUpdating(null);
    }
  }, [applications]);

  // ── Score color helper ────────────────────────────────────────────────────

  function scoreColor(score: number): string {
    if (score >= 0.75) return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950';
    if (score >= 0.5) return 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950';
    if (score >= 0.25) return 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-950';
    return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950';
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Board</h1>
            <p className="mt-1 text-sm text-gray-500">Drag applications between stages.</p>
          </div>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {BOARD_COLUMNS.map((status) => (
            <div key={status} className="w-72 shrink-0">
              <div className="h-8 mb-3 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
              <div className="space-y-2">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Board</h1>
          <p className="mt-1 text-sm text-gray-500">
            {applications.length} application{applications.length !== 1 ? 's' : ''} across {Object.values(columns).filter((c) => c.length > 0).length} stages
          </p>
        </div>
        <Link to="/applications" className="btn-secondary text-sm">
          <List className="mr-2 h-4 w-4" />
          List view
        </Link>
      </div>

      {/* Columns */}
      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 'calc(100vh - 200px)' }}>
        {BOARD_COLUMNS.map((status) => {
          const cards = columns[status];
          const isOver = dragOverColumn === status;

          return (
            <div
              key={status}
              className="w-72 shrink-0 flex flex-col"
              onDragEnter={() => handleColumnDragEnter(status)}
              onDragLeave={() => handleColumnDragLeave(status)}
              onDragOver={handleColumnDragOver}
              onDrop={(e) => handleDrop(e, status)}
            >
              {/* Column header */}
              <div className={`flex items-center justify-between rounded-t-lg border-t-4 ${COLUMN_COLORS[status]} bg-white px-3 py-2.5 dark:bg-gray-900`}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{STATUS_CONFIG[status].label}</span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                    {cards.length}
                  </span>
                </div>
              </div>

              {/* Card area */}
              <div
                className={`flex-1 space-y-2 rounded-b-lg p-2 transition-colors ${
                  isOver && draggingId
                    ? 'bg-brand-50 ring-2 ring-brand-300 dark:bg-brand-950 dark:ring-brand-700'
                    : 'bg-gray-50 dark:bg-gray-900/50'
                }`}
              >
                {cards.length === 0 && (
                  <div className={`rounded-lg border-2 border-dashed py-8 text-center text-xs text-gray-400 transition-colors ${
                    isOver && draggingId ? 'border-brand-300 text-brand-500' : 'border-gray-200 dark:border-gray-700'
                  }`}>
                    {isOver && draggingId ? 'Drop here' : 'No applications'}
                  </div>
                )}

                {cards.map((app) => (
                  <div
                    key={app.id}
                    id={`card-${app.id}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, app.id)}
                    onDragEnd={() => handleDragEnd(app.id)}
                    className={`group relative rounded-lg border bg-white p-3 shadow-sm transition-all cursor-grab active:cursor-grabbing dark:bg-gray-900 dark:border-gray-700 ${
                      updating === app.id ? 'opacity-60' : ''
                    } ${
                      draggingId === app.id ? '' : 'hover:shadow-md'
                    }`}
                  >
                    {/* Drag handle */}
                    <div className="absolute -left-0.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <GripVertical className="h-4 w-4 text-gray-300" />
                    </div>

                    {/* Role + company */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-snug truncate">{app.role_title}</p>
                        <p className="text-xs text-gray-500 truncate">{app.company_name}</p>
                      </div>
                      {app.url && (
                        <a
                          href={app.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-gray-300 hover:text-brand-500 transition-colors shrink-0 mt-0.5"
                          title="Open job posting"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>

                    {/* Metadata row */}
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      {/* Skill match score */}
                      {app.skill_match_score != null && (
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${scoreColor(app.skill_match_score)}`}>
                          {Math.round(app.skill_match_score * 100)}% match
                        </span>
                      )}

                      {/* Remote type */}
                      {app.remote_type && (
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-gray-800">
                          {app.remote_type}
                        </span>
                      )}

                      {/* Location */}
                      {app.location && (
                        <span className="text-[10px] text-gray-400 truncate max-w-[100px]" title={app.location}>
                          {app.location}
                        </span>
                      )}
                    </div>

                    {/* Date */}
                    {app.date_applied && (
                      <p className="mt-1.5 text-[10px] text-gray-400">
                        Applied {formatDistanceToNow(new Date(app.date_applied), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
