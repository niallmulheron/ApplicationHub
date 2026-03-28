import { useState, useEffect, useCallback } from 'react';
import { Plus, X, Save } from 'lucide-react';
import api from '../services/api.ts';
import type { UserProfile, Skill } from '../types/index.ts';

const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'] as const;

export function Profile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Editable fields
  const [name, setName] = useState('');
  const [experienceSummary, setExperienceSummary] = useState('');
  const [targetRoles, setTargetRoles] = useState<string[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [newRole, setNewRole] = useState('');
  const [newSkillName, setNewSkillName] = useState('');
  const [openToRemote, setOpenToRemote] = useState(false);
  const [preferredCities, setPreferredCities] = useState<string[]>([]);
  const [newCity, setNewCity] = useState('');

  useEffect(() => {
    api.get('/profile')
      .then((res) => {
        const p = res.data as UserProfile;
        setProfile(p);
        setName(p.name);
        setExperienceSummary(p.experience_summary || '');
        setTargetRoles(p.target_roles || []);
        setSkills(p.skills || []);
        setOpenToRemote(p.location_prefs?.open_to_remote ?? false);
        setPreferredCities(p.location_prefs?.preferred_cities ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setMessage('');
    try {
      await api.patch('/profile', {
        name,
        experience_summary: experienceSummary,
        target_roles: targetRoles,
        skills,
        location_prefs: {
          preferred_cities: preferredCities,
          open_to_remote: openToRemote,
          willing_to_relocate: false,
        },
      });
      setMessage('Profile saved.');
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setMessage('Failed to save profile.');
    } finally {
      setSaving(false);
    }
  }, [name, experienceSummary, targetRoles, skills, preferredCities, openToRemote]);

  function addSkill() {
    if (!newSkillName.trim()) return;
    setSkills([...skills, { name: newSkillName.trim(), level: 'intermediate' }]);
    setNewSkillName('');
  }

  function removeSkill(index: number) {
    setSkills(skills.filter((_, i) => i !== index));
  }

  function updateSkillLevel(index: number, level: Skill['level']) {
    const updated = [...skills];
    updated[index] = { ...updated[index], level };
    setSkills(updated);
  }

  function addTag(value: string, list: string[], setList: (v: string[]) => void, clear: () => void) {
    const trimmed = value.trim();
    if (!trimmed || list.includes(trimmed)) return;
    setList([...list, trimmed]);
    clear();
  }

  function removeTag(index: number, list: string[], setList: (v: string[]) => void) {
    setList(list.filter((_, i) => i !== index));
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Profile</h1>
          <p className="mt-1 text-sm text-gray-500">
            This information powers the AI features — skill matching, cover letters, and tailored suggestions.
          </p>
        </div>
        <button onClick={handleSave} className="btn-primary" disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {message && (
        <div className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-400">
          {message}
        </div>
      )}

      <div className="mt-6 space-y-6">
        {/* Name */}
        <div className="card">
          <label htmlFor="name" className="mb-1 block text-sm font-medium">Name</label>
          <input
            id="name"
            type="text"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Experience summary */}
        <div className="card">
          <label htmlFor="summary" className="mb-1 block text-sm font-medium">
            Experience summary
          </label>
          <p className="mb-2 text-xs text-gray-500">
            A brief overview of your background — this is sent to the AI as context for generating personalised content.
          </p>
          <textarea
            id="summary"
            className="input min-h-[120px] resize-y"
            value={experienceSummary}
            onChange={(e) => setExperienceSummary(e.target.value)}
            placeholder="e.g. Final year CS student with internship experience in frontend development. Built several React projects, comfortable with TypeScript, familiar with Node.js and PostgreSQL..."
          />
        </div>

        {/* Skills */}
        <div className="card">
          <h2 className="text-sm font-medium">Skills</h2>
          <p className="mb-3 text-xs text-gray-500">
            These are matched against job description requirements to generate your skill-match score.
          </p>

          <div className="space-y-2">
            {skills.map((skill, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="flex-1 text-sm">{skill.name}</span>
                <select
                  value={skill.level}
                  onChange={(e) => updateSkillLevel(i, e.target.value as Skill['level'])}
                  className="input w-auto text-sm py-1"
                >
                  {SKILL_LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {l.charAt(0).toUpperCase() + l.slice(1)}
                    </option>
                  ))}
                </select>
                <button onClick={() => removeSkill(i)} className="text-gray-400 hover:text-red-500">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            <input
              type="text"
              className="input flex-1"
              placeholder="Add a skill..."
              value={newSkillName}
              onChange={(e) => setNewSkillName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
            />
            <button onClick={addSkill} className="btn-secondary">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Target roles */}
        <div className="card">
          <h2 className="text-sm font-medium">Target roles</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {targetRoles.map((role, i) => (
              <span key={i} className="badge bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300">
                {role}
                <button onClick={() => removeTag(i, targetRoles, setTargetRoles)} className="ml-1.5">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              className="input flex-1"
              placeholder="e.g. Frontend Engineer"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag(newRole, targetRoles, setTargetRoles, () => setNewRole('')))}
            />
            <button onClick={() => addTag(newRole, targetRoles, setTargetRoles, () => setNewRole(''))} className="btn-secondary">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Location preferences */}
        <div className="card">
          <h2 className="text-sm font-medium">Location preferences</h2>

          <label className="mt-3 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={openToRemote}
              onChange={(e) => setOpenToRemote(e.target.checked)}
              className="rounded border-gray-300"
            />
            Open to remote work
          </label>

          <div className="mt-3">
            <p className="mb-2 text-xs text-gray-500">Preferred cities</p>
            <div className="flex flex-wrap gap-2">
              {preferredCities.map((city, i) => (
                <span key={i} className="badge bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                  {city}
                  <button onClick={() => removeTag(i, preferredCities, setPreferredCities)} className="ml-1.5">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                className="input flex-1"
                placeholder="e.g. London"
                value={newCity}
                onChange={(e) => setNewCity(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag(newCity, preferredCities, setPreferredCities, () => setNewCity('')))}
              />
              <button onClick={() => addTag(newCity, preferredCities, setPreferredCities, () => setNewCity(''))} className="btn-secondary">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
