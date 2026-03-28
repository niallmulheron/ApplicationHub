import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal } from './Modal.tsx';
import api from '../services/api.ts';
import type { Interaction, InteractionType } from '../types/index.ts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface InteractionModalProps {
  contactId: string;
  contactName: string;
  onClose: () => void;
  onSaved: (interaction: Interaction) => void;
}

interface FormState {
  interaction_type: InteractionType | '';
  interaction_date: string;
  notes: string;
}

const INTERACTION_TYPES: InteractionType[] = [
  'email', 'phone', 'coffee_chat', 'linkedin_message', 'interview', 'referral', 'other',
];

const INTERACTION_LABELS: Record<InteractionType, string> = {
  email: 'Email',
  phone: 'Phone call',
  coffee_chat: 'Coffee chat',
  linkedin_message: 'LinkedIn message',
  interview: 'Interview',
  referral: 'Referral',
  other: 'Other',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function InteractionModal({ contactId, contactName, onClose, onSaved }: InteractionModalProps) {
  // Default to today's date
  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState<FormState>({
    interaction_type: '',
    interaction_date: today,
    notes: '',
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

    if (!form.interaction_type) {
      setError('Please select an interaction type.');
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, any> = {
        interaction_type: form.interaction_type,
        interaction_date: form.interaction_date,
        notes: form.notes.trim(),
      };

      const res = await api.post(`/contacts/${contactId}/interactions`, payload);
      onSaved(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Modal title={`Log interaction with ${contactName}`} onClose={onClose} size="md">
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Interaction type */}
        <div>
          <label className="mb-1 block text-sm font-medium">
            Interaction type <span className="text-red-500">*</span>
          </label>
          <select
            className="input"
            value={form.interaction_type}
            onChange={(e) => set('interaction_type', e.target.value as InteractionType | '')}
            required
          >
            <option value="">Select a type…</option>
            {INTERACTION_TYPES.map((type) => (
              <option key={type} value={type}>{INTERACTION_LABELS[type]}</option>
            ))}
          </select>
        </div>

        {/* Interaction date */}
        <div>
          <label className="mb-1 block text-sm font-medium">Date</label>
          <input
            type="date"
            className="input"
            value={form.interaction_date}
            onChange={(e) => set('interaction_date', e.target.value)}
          />
        </div>

        {/* Notes */}
        <div>
          <label className="mb-1 block text-sm font-medium">Notes</label>
          <textarea
            className="input min-h-[80px] resize-y"
            placeholder="What did you discuss? Any follow-up items?"
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
                Saving…
              </>
            ) : (
              'Log interaction'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
