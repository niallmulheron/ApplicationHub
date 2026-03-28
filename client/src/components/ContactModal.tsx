import { useState, useEffect } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { Modal } from './Modal.tsx';
import api from '../services/api.ts';
import type { Contact, Company } from '../types/index.ts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContactModalProps {
  onClose: () => void;
  onSaved: (contact: Contact) => void;
}

interface FormState {
  company_id: string;
  name: string;
  role: string;
  email: string;
  linkedin_url: string;
  notes: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ContactModal({ onClose, onSaved }: ContactModalProps) {
  const [form, setForm] = useState<FormState>({
    company_id: '',
    name: '',
    role: '',
    email: '',
    linkedin_url: '',
    notes: '',
  });

  const [companies, setCompanies] = useState<Company[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Fetch the user's companies for the dropdown
  useEffect(() => {
    api.get('/companies')
      .then((res) => setCompanies(res.data))
      .catch(() => {/* non-fatal */});
  }, []);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError('');
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }
    if (!form.company_id) {
      setError('Please select a company.');
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, any> = {
        company_id: form.company_id,
        name: form.name.trim(),
        role: form.role.trim() || null,
        email: form.email.trim() || null,
        linkedin_url: form.linkedin_url.trim() || null,
        notes: form.notes.trim(),
      };

      const res = await api.post('/contacts', payload);
      onSaved(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Modal title="Add contact" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Company */}
        <div>
          <label className="mb-1 block text-sm font-medium">
            Company <span className="text-red-500">*</span>
          </label>
          <select
            className="input"
            value={form.company_id}
            onChange={(e) => set('company_id', e.target.value)}
            required
          >
            <option value="">Select a company…</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Name */}
        <div>
          <label className="mb-1 block text-sm font-medium">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className="input"
            placeholder="e.g. Sarah Chen"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            required
          />
        </div>

        {/* Role + Email — two columns */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Role</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Engineering Manager"
              value={form.role}
              onChange={(e) => set('role', e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input
              type="email"
              className="input"
              placeholder="sarah@company.com"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
            />
          </div>
        </div>

        {/* LinkedIn URL */}
        <div>
          <label className="mb-1 block text-sm font-medium">LinkedIn URL</label>
          <input
            type="url"
            className="input"
            placeholder="https://linkedin.com/in/…"
            value={form.linkedin_url}
            onChange={(e) => set('linkedin_url', e.target.value)}
          />
        </div>

        {/* Notes */}
        <div>
          <label className="mb-1 block text-sm font-medium">Notes</label>
          <textarea
            className="input min-h-[80px] resize-y"
            placeholder="Where you met, shared interests, etc."
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            rows={3}
          />
        </div>

        {/* Error */}
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding…
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Add contact
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
