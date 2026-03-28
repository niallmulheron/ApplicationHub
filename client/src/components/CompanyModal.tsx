import { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { Modal } from './Modal.tsx';
import api from '../services/api.ts';
import type { Company } from '../types/index.ts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CompanyModalProps {
  /** Pass an existing company to open in edit mode, or null to create. */
  company?: Company | null;
  onClose: () => void;
  onSaved: (company: Company) => void;
}

interface FormState {
  name: string;
  industry: string;
  size: string;
  website: string;
  notes: string;
}

const SIZE_OPTIONS = ['1-50', '51-200', '201-1000', '1000+'];

// ─── Component ────────────────────────────────────────────────────────────────

export function CompanyModal({ company, onClose, onSaved }: CompanyModalProps) {
  const isEditing = !!company;

  const [form, setForm] = useState<FormState>({
    name: company?.name ?? '',
    industry: company?.industry ?? '',
    size: company?.size ?? '',
    website: company?.website ?? '',
    notes: company?.notes ?? '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError('');
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) {
      setError('Company name is required.');
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, any> = {
        name: form.name.trim(),
        industry: form.industry.trim() || null,
        size: form.size || null,
        website: form.website.trim() || null,
        notes: form.notes.trim(),
      };

      let res;
      if (isEditing) {
        res = await api.patch(`/companies/${company!.id}`, payload);
      } else {
        res = await api.post('/companies', payload);
      }

      onSaved(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Modal
      title={isEditing ? 'Edit company' : 'Add company'}
      onClose={onClose}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Company name */}
        <div>
          <label className="mb-1 block text-sm font-medium">
            Company name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className="input"
            placeholder="e.g. Acme Corp"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            required
            autoFocus
          />
        </div>

        {/* Industry */}
        <div>
          <label className="mb-1 block text-sm font-medium">Industry</label>
          <input
            type="text"
            className="input"
            placeholder="e.g. Technology, Finance"
            value={form.industry}
            onChange={(e) => set('industry', e.target.value)}
          />
        </div>

        {/* Size + Website — two columns */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Company size</label>
            <select
              className="input"
              value={form.size}
              onChange={(e) => set('size', e.target.value)}
            >
              <option value="">Select size…</option>
              {SIZE_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Website</label>
            <input
              type="url"
              className="input"
              placeholder="https://…"
              value={form.website}
              onChange={(e) => set('website', e.target.value)}
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="mb-1 block text-sm font-medium">Notes</label>
          <textarea
            className="input min-h-[80px] resize-y"
            placeholder="Anything worth remembering about this company…"
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
                {isEditing ? 'Saving…' : 'Adding…'}
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                {isEditing ? 'Save changes' : 'Add company'}
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
