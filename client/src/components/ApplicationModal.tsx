import { useState, useEffect } from 'react';
import { Plus, Loader2, Sparkles, ChevronDown, ChevronUp, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Modal } from './Modal.tsx';
import api from '../services/api.ts';
import type { Application, ApplicationStatus, RemoteType, Company } from '../types/index.ts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ApplicationModalProps {
  /** Pass an existing application to open in edit mode, or null to create. */
  application?: Application | null;
  onClose: () => void;
  onSaved: (application: Application) => void;
}

interface FormState {
  company_id: string;
  newCompanyName: string;
  role_title: string;
  status: ApplicationStatus;
  url: string;
  date_applied: string;
  location: string;
  remote_type: RemoteType | '';
  salary_min: string;
  salary_max: string;
  notes: string;
}

interface SkillMatchResult {
  score: number;
  matched_skills: string[];
  missing_skills: string[];
  partial_matches: string[];
  summary: string;
}

interface ParsedJDData {
  requirements: string[];
  nice_to_haves: string[];
  responsibilities: string[];
  raw_text: string;
}

const STATUS_OPTIONS: ApplicationStatus[] = [
  'bookmarked', 'applied', 'screening', 'interviewing', 'offer', 'accepted', 'rejected', 'withdrawn',
];

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  bookmarked: 'Bookmarked',
  applied: 'Applied',
  screening: 'Screening',
  interviewing: 'Interviewing',
  offer: 'Offer received',
  accepted: 'Accepted',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ApplicationModal({ application, onClose, onSaved }: ApplicationModalProps) {
  const isEditing = !!application;

  const [form, setForm] = useState<FormState>({
    company_id: application?.company_id ?? '',
    newCompanyName: '',
    role_title: application?.role_title ?? '',
    status: application?.status ?? 'bookmarked',
    url: application?.url ?? '',
    date_applied: application?.date_applied ? application.date_applied.split('T')[0] : '',
    location: application?.location ?? '',
    remote_type: application?.remote_type ?? '',
    salary_min: application?.salary_min?.toString() ?? '',
    salary_max: application?.salary_max?.toString() ?? '',
    notes: application?.notes ?? '',
  });

  const [companies, setCompanies] = useState<Company[]>([]);
  const [creatingCompany, setCreatingCompany] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // ── AI state ────────────────────────────────────────────────────────────────
  const [jdText, setJdText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsedJd, setParsedJd] = useState<ParsedJDData | null>(null);
  const [skillMatch, setSkillMatch] = useState<SkillMatchResult | null>(null);
  const [showJdSection, setShowJdSection] = useState(!isEditing); // expanded by default in create mode
  const [showParsedDetails, setShowParsedDetails] = useState(false);

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

  // ── Company handling ────────────────────────────────────────────────────────

  const showNewCompanyField = form.company_id === '__new__';

  async function resolveCompanyId(): Promise<string> {
    if (!showNewCompanyField) return form.company_id;

    if (!form.newCompanyName.trim()) {
      throw new Error('Please enter a company name.');
    }
    setCreatingCompany(true);
    const res = await api.post('/companies', { name: form.newCompanyName.trim() });
    setCompanies((prev) => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name)));
    setCreatingCompany(false);
    return res.data.id;
  }

  // ── AI: Parse Job Description ───────────────────────────────────────────────

  async function handleParseJD() {
    if (!jdText.trim() || jdText.trim().length < 20) {
      setError('Paste at least a few lines of the job description to parse.');
      return;
    }

    setParsing(true);
    setError('');
    setSkillMatch(null);
    setParsedJd(null);

    try {
      const res = await api.post('/ai/parse-jd', { text: jdText.trim() });
      const { parsed_jd, extracted, skill_match } = res.data;

      // Store parsed data
      setParsedJd(parsed_jd);
      if (skill_match) {
        setSkillMatch(skill_match);
      }

      // Auto-fill empty form fields from extracted data
      setForm((prev) => {
        const updated = { ...prev };

        // Role title
        if (!prev.role_title && extracted.role_title) {
          updated.role_title = extracted.role_title;
        }

        // Company — try to find a matching company or set up for creation
        if (!prev.company_id && extracted.company_name) {
          const match = companies.find(
            (c) => c.name.toLowerCase() === extracted.company_name.toLowerCase(),
          );
          if (match) {
            updated.company_id = match.id;
          } else {
            updated.company_id = '__new__';
            updated.newCompanyName = extracted.company_name;
          }
        }

        // Location
        if (!prev.location && extracted.location) {
          updated.location = extracted.location;
        }

        // Remote type
        if (!prev.remote_type && extracted.remote_type) {
          updated.remote_type = extracted.remote_type;
        }

        // Salary
        if (!prev.salary_min && extracted.salary_min) {
          updated.salary_min = extracted.salary_min.toString();
        }
        if (!prev.salary_max && extracted.salary_max) {
          updated.salary_max = extracted.salary_max.toString();
        }

        return updated;
      });

      setShowParsedDetails(true);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to parse job description.');
    } finally {
      setParsing(false);
    }
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!form.role_title.trim()) {
      setError('Role title is required.');
      return;
    }
    if (!form.company_id) {
      setError('Please select or create a company.');
      return;
    }

    setSaving(true);
    try {
      const company_id = await resolveCompanyId();

      const payload: Record<string, any> = {
        company_id,
        role_title: form.role_title.trim(),
        status: form.status,
        url: form.url.trim() || null,
        date_applied: form.date_applied || null,
        location: form.location.trim() || null,
        remote_type: form.remote_type || null,
        salary_min: form.salary_min ? Number(form.salary_min) : null,
        salary_max: form.salary_max ? Number(form.salary_max) : null,
        notes: form.notes.trim(),
      };

      // Include AI data if we parsed a JD
      if (parsedJd) {
        payload.parsed_jd = parsedJd;
      }
      if (skillMatch) {
        payload.skill_match_score = skillMatch.score;
      }

      let res;
      if (isEditing) {
        res = await api.patch(`/applications/${application!.id}`, payload);
      } else {
        res = await api.post('/applications', payload);
      }

      onSaved(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Something went wrong.');
    } finally {
      setSaving(false);
      setCreatingCompany(false);
    }
  }

  // ── Score display helper ──────────────────────────────────────────────────

  function scoreColor(score: number): string {
    if (score >= 0.75) return 'text-green-600 dark:text-green-400';
    if (score >= 0.5) return 'text-yellow-600 dark:text-yellow-400';
    if (score >= 0.25) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Modal
      title={isEditing ? 'Edit application' : 'Add application'}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── AI: Paste Job Description ──────────────────────────────────── */}
        <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 dark:border-indigo-800 dark:bg-indigo-950/30">
          <button
            type="button"
            className="flex w-full items-center justify-between px-4 py-3"
            onClick={() => setShowJdSection(!showJdSection)}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                Parse job description with AI
              </span>
              {parsedJd && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
                  Parsed
                </span>
              )}
            </div>
            {showJdSection ? (
              <ChevronUp className="h-4 w-4 text-indigo-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-indigo-400" />
            )}
          </button>

          {showJdSection && (
            <div className="space-y-3 px-4 pb-4">
              <textarea
                className="input min-h-[120px] resize-y text-sm"
                placeholder="Paste the job description here and click &quot;Parse with AI&quot; to auto-fill the form, extract requirements, and get a skill match score..."
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                rows={5}
              />
              <button
                type="button"
                onClick={handleParseJD}
                disabled={parsing || jdText.trim().length < 20}
                className="btn-primary text-sm"
              >
                {parsing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Parsing…
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Parse with AI
                  </>
                )}
              </button>

              {/* ── Skill match result ──────────────────────────────────── */}
              {skillMatch && (
                <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Skill match</span>
                    <span className={`text-2xl font-bold ${scoreColor(skillMatch.score)}`}>
                      {Math.round(skillMatch.score * 100)}%
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{skillMatch.summary}</p>

                  <button
                    type="button"
                    className="mt-2 text-xs text-indigo-600 hover:underline dark:text-indigo-400"
                    onClick={() => setShowParsedDetails(!showParsedDetails)}
                  >
                    {showParsedDetails ? 'Hide details' : 'Show details'}
                  </button>

                  {showParsedDetails && (
                    <div className="mt-3 space-y-2 text-xs">
                      {skillMatch.matched_skills.length > 0 && (
                        <div>
                          <p className="font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Matched skills
                          </p>
                          <p className="mt-0.5 text-gray-600 dark:text-gray-400">
                            {skillMatch.matched_skills.join(', ')}
                          </p>
                        </div>
                      )}
                      {skillMatch.partial_matches.length > 0 && (
                        <div>
                          <p className="font-medium text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> Partial matches
                          </p>
                          <p className="mt-0.5 text-gray-600 dark:text-gray-400">
                            {skillMatch.partial_matches.join(', ')}
                          </p>
                        </div>
                      )}
                      {skillMatch.missing_skills.length > 0 && (
                        <div>
                          <p className="font-medium text-red-600 dark:text-red-400 flex items-center gap-1">
                            <XCircle className="h-3 w-3" /> Missing skills
                          </p>
                          <p className="mt-0.5 text-gray-600 dark:text-gray-400">
                            {skillMatch.missing_skills.join(', ')}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── Parsed requirements ─────────────────────────────────── */}
              {parsedJd && showParsedDetails && !skillMatch && (
                <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 space-y-2 text-xs">
                  {parsedJd.requirements.length > 0 && (
                    <div>
                      <p className="font-medium text-gray-700 dark:text-gray-300">Requirements</p>
                      <ul className="mt-1 list-disc pl-4 text-gray-600 dark:text-gray-400 space-y-0.5">
                        {parsedJd.requirements.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </div>
                  )}
                  {parsedJd.nice_to_haves.length > 0 && (
                    <div>
                      <p className="font-medium text-gray-700 dark:text-gray-300">Nice to have</p>
                      <ul className="mt-1 list-disc pl-4 text-gray-600 dark:text-gray-400 space-y-0.5">
                        {parsedJd.nice_to_haves.map((n, i) => <li key={i}>{n}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

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
            <option value="__new__">+ Add new company…</option>
          </select>

          {showNewCompanyField && (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="text"
                className="input"
                placeholder="Company name"
                value={form.newCompanyName}
                onChange={(e) => set('newCompanyName', e.target.value)}
                autoFocus
              />
              {creatingCompany && (
                <Loader2 className="h-4 w-4 animate-spin text-gray-400 shrink-0" />
              )}
            </div>
          )}
        </div>

        {/* Role title */}
        <div>
          <label className="mb-1 block text-sm font-medium">
            Role title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className="input"
            placeholder="e.g. Senior Software Engineer"
            value={form.role_title}
            onChange={(e) => set('role_title', e.target.value)}
            required
          />
        </div>

        {/* Status + Date applied — two columns */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Status</label>
            <select
              className="input"
              value={form.status}
              onChange={(e) => set('status', e.target.value as ApplicationStatus)}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Date applied</label>
            <input
              type="date"
              className="input"
              value={form.date_applied}
              onChange={(e) => set('date_applied', e.target.value)}
            />
          </div>
        </div>

        {/* Job URL */}
        <div>
          <label className="mb-1 block text-sm font-medium">Job posting URL</label>
          <input
            type="url"
            className="input"
            placeholder="https://…"
            value={form.url}
            onChange={(e) => set('url', e.target.value)}
          />
        </div>

        {/* Location + Remote type — two columns */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Location</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Dublin, Ireland"
              value={form.location}
              onChange={(e) => set('location', e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Work type</label>
            <select
              className="input"
              value={form.remote_type}
              onChange={(e) => set('remote_type', e.target.value as RemoteType | '')}
            >
              <option value="">Not specified</option>
              <option value="onsite">On-site</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
        </div>

        {/* Salary range — two columns */}
        <div>
          <label className="mb-1 block text-sm font-medium">Salary range</label>
          <div className="grid grid-cols-2 gap-4">
            <input
              type="number"
              className="input"
              placeholder="Min (e.g. 60000)"
              value={form.salary_min}
              onChange={(e) => set('salary_min', e.target.value)}
              min={0}
            />
            <input
              type="number"
              className="input"
              placeholder="Max (e.g. 80000)"
              value={form.salary_max}
              onChange={(e) => set('salary_max', e.target.value)}
              min={0}
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="mb-1 block text-sm font-medium">Notes</label>
          <textarea
            className="input min-h-[80px] resize-y"
            placeholder="Anything worth remembering about this role…"
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
                {isEditing ? 'Save changes' : 'Add application'}
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
