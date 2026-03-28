import { useState, useEffect } from 'react';
import { Plus, Building2, Pencil, Trash2 } from 'lucide-react';
import api from '../services/api.ts';
import type { Company } from '../types/index.ts';
import { CompanyModal } from '../components/CompanyModal.tsx';

export function Companies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state — null = closed, undefined = create mode, Company = edit mode
  const [modalCompany, setModalCompany] = useState<Company | null | undefined>(undefined);
  const isModalOpen = modalCompany !== undefined;

  // Confirmation state for delete
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    api.get('/companies')
      .then((res) => setCompanies(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ── Modal handlers ──────────────────────────────────────────────────────────

  function openCreate() {
    setModalCompany(null); // null = create mode
  }

  function openEdit(company: Company, e: React.MouseEvent) {
    e.stopPropagation(); // prevent card click from double-firing
    setModalCompany(company);
  }

  function closeModal() {
    setModalCompany(undefined); // undefined = modal closed
  }

  function handleSaved(saved: Company) {
    setCompanies((prev) => {
      const exists = prev.some((c) => c.id === saved.id);
      if (exists) {
        return prev.map((c) => (c.id === saved.id ? saved : c));
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
        await api.delete(`/companies/${id}`);
        setCompanies((prev) => prev.filter((c) => c.id !== id));
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

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Companies</h1>
          <p className="mt-1 text-sm text-gray-500">
            {companies.length} {companies.length === 1 ? 'company' : 'companies'} tracked
          </p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add company
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
          ))
        ) : companies.length === 0 ? (
          <div className="card col-span-full py-12 text-center text-sm text-gray-500">
            <p>No companies yet. They'll be created automatically when you add applications.</p>
            <button onClick={openCreate} className="mt-3 btn-primary text-sm">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add your first company
            </button>
          </div>
        ) : (
          companies.map((company) => (
            <div
              key={company.id}
              className="card hover:shadow-md transition-shadow cursor-pointer group"
              onClick={(e) => openEdit(company, e)}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 shrink-0">
                    <Building2 className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{company.name}</p>
                    <p className="text-xs text-gray-500">
                      {[company.industry, company.size].filter(Boolean).join(' · ') || 'No details'}
                    </p>
                  </div>
                </div>

                {/* Action buttons — show on hover */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    title="Edit"
                    onClick={(e) => openEdit(company, e)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    title={deletingId === company.id ? 'Click again to confirm delete' : 'Delete'}
                    onClick={(e) => handleDelete(company.id, e)}
                    className={`rounded-lg p-1.5 transition-colors ${
                      deletingId === company.id
                        ? 'bg-red-100 text-red-600 dark:bg-red-900/30'
                        : 'text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20'
                    }`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {company.application_count != null && (
                <p className="text-sm text-gray-500">
                  {company.application_count} application{company.application_count !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <CompanyModal
          company={modalCompany}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
