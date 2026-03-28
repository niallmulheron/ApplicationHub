import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2, ExternalLink, Kanban } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import api from '../services/api.ts';
import type { Application, ApplicationStatus } from '../types/index.ts';
import { STATUS_CONFIG } from '../types/index.ts';
import { ApplicationModal } from '../components/ApplicationModal.tsx';

const statuses: (ApplicationStatus | 'all')[] = [
  'all', 'bookmarked', 'applied', 'screening', 'interviewing', 'offer', 'accepted', 'rejected', 'withdrawn',
];

export function Applications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ApplicationStatus | 'all'>('all');
  const [search, setSearch] = useState('');

  // Modal state — null = closed, undefined = create mode, Application = edit mode
  const [modalApp, setModalApp] = useState<Application | null | undefined>(undefined);
  const isModalOpen = modalApp !== undefined;

  // Confirmation state for delete
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchApplications = useCallback(() => {
    const params = new URLSearchParams();
    if (filter !== 'all') params.set('status', filter);
    if (search) params.set('search', search);

    api.get(`/applications?${params}`)
      .then((res) => setApplications(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filter, search]);

  useEffect(() => {
    setLoading(true);
    fetchApplications();
  }, [fetchApplications]);

  // ── Modal handlers ──────────────────────────────────────────────────────────

  function openCreate() {
    setModalApp(null); // null = create mode
  }

  function openEdit(app: Application, e: React.MouseEvent) {
    e.stopPropagation(); // prevent row click from double-firing
    setModalApp(app);
  }

  function closeModal() {
    setModalApp(undefined); // undefined = modal closed
  }

  function handleSaved(saved: Application) {
    setApplications((prev) => {
      const exists = prev.some((a) => a.id === saved.id);
      if (exists) {
        return prev.map((a) => (a.id === saved.id ? saved : a));
      }
      return [saved, ...prev];
    });
    closeModal();
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();

    if (deletingId === id) {
      // Second click — confirmed
      try {
        await api.delete(`/applications/${id}`);
        setApplications((prev) => prev.filter((a) => a.id !== id));
      } catch {
        // non-fatal: could add a toast here later
      } finally {
        setDeletingId(null);
      }
    } else {
      // First click — ask for confirmation
      setDeletingId(id);
      // Auto-cancel confirmation after 3s
      setTimeout(() => setDeletingId((curr) => (curr === id ? null : curr)), 3000);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Applications</h1>
          <p className="mt-1 text-sm text-gray-500">
            {applications.length} application{applications.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/board" className="btn-secondary text-sm">
            <Kanban className="mr-2 h-4 w-4" />
            Board view
          </Link>
          <button className="btn-primary" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add application
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            className="input pl-9"
            placeholder="Search by role or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filter === s
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
              }`}
            >
              {s === 'all' ? 'All' : STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Application list */}
      <div className="mt-4 space-y-2">
        {loading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
          ))
        ) : applications.length === 0 ? (
          <div className="card py-12 text-center text-sm text-gray-500">
            {search || filter !== 'all'
              ? 'No applications match your filters.'
              : (
                <div>
                  <p>No applications yet.</p>
                  <button onClick={openCreate} className="mt-3 btn-primary text-sm">
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add your first application
                  </button>
                </div>
              )}
          </div>
        ) : (
          applications.map((app) => (
            <div
              key={app.id}
              className="card flex items-center gap-4 py-4 hover:shadow-md transition-shadow cursor-pointer group"
              onClick={(e) => openEdit(app, e)}
            >
              {/* Main info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">{app.role_title}</p>
                  {app.url && (
                    <a
                      href={app.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-gray-400 hover:text-brand-600 transition-colors shrink-0"
                      title="Open job posting"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
                <p className="text-sm text-gray-500 truncate">
                  {app.company_name}
                  {app.location && ` · ${app.location}`}
                  {app.remote_type && ` · ${app.remote_type}`}
                  {app.date_applied && (
                    <span className="ml-1 text-gray-400">
                      · {formatDistanceToNow(new Date(app.date_applied), { addSuffix: true })}
                    </span>
                  )}
                </p>
              </div>

              {/* Right side: match score + status + actions */}
              <div className="flex items-center gap-3 shrink-0">
                {app.skill_match_score != null && (
                  <span className="hidden sm:block text-sm font-medium text-gray-500">
                    {Math.round(app.skill_match_score * 100)}% match
                  </span>
                )}
                <span className={`badge ${STATUS_CONFIG[app.status].color}`}>
                  {STATUS_CONFIG[app.status].label}
                </span>

                {/* Action buttons — always visible on hover */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    title="Edit"
                    onClick={(e) => openEdit(app, e)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    title={deletingId === app.id ? 'Click again to confirm delete' : 'Delete'}
                    onClick={(e) => handleDelete(app.id, e)}
                    className={`rounded-lg p-1.5 transition-colors ${
                      deletingId === app.id
                        ? 'bg-red-100 text-red-600 dark:bg-red-900/30'
                        : 'text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20'
                    }`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <ApplicationModal
          application={modalApp}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
