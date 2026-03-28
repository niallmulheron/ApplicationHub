// ============================================================
// Shared types — keep in sync with server/src/types/index.ts
// ============================================================

export type ApplicationStatus =
  | 'bookmarked'
  | 'applied'
  | 'screening'
  | 'interviewing'
  | 'offer'
  | 'accepted'
  | 'rejected'
  | 'withdrawn';

export type RemoteType = 'onsite' | 'remote' | 'hybrid';
export type DocumentType = 'resume' | 'cover_letter' | 'portfolio' | 'other';
export type InteractionType =
  | 'email' | 'phone' | 'coffee_chat' | 'linkedin_message'
  | 'interview' | 'referral' | 'other';

export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export interface UserProfile extends User {
  skills: Skill[];
  experience_summary: string;
  target_roles: string[];
  location_prefs: LocationPrefs;
}

export interface Skill {
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

export interface LocationPrefs {
  preferred_cities: string[];
  open_to_remote: boolean;
  willing_to_relocate: boolean;
}

export interface Company {
  id: string;
  name: string;
  industry: string | null;
  size: string | null;
  website: string | null;
  notes: string;
  application_count?: number;
}

export interface Application {
  id: string;
  company_id: string;
  resume_version_id: string | null;
  role_title: string;
  url: string | null;
  status: ApplicationStatus;
  date_applied: string | null;
  salary_min: number | null;
  salary_max: number | null;
  location: string | null;
  remote_type: RemoteType | null;
  skill_match_score: number | null;
  notes: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  company_name?: string;
  company_industry?: string;
  resume_label?: string;
}

export interface ApplicationDetail extends Application {
  company_size?: string;
  company_website?: string;
  parsed_jd: ParsedJobDescription;
  status_history: StatusHistoryEntry[];
  documents: Document[];
  ai_outputs: AIOutput[];
}

export interface ParsedJobDescription {
  requirements?: string[];
  nice_to_haves?: string[];
  responsibilities?: string[];
  raw_text?: string;
}

export interface StatusHistoryEntry {
  id: string;
  from_status: ApplicationStatus | null;
  to_status: ApplicationStatus;
  changed_at: string;
}

export interface Document {
  id: string;
  doc_type: DocumentType;
  file_url: string;
  filename: string;
  uploaded_at: string;
}

export interface AIOutput {
  id: string;
  output_type: string;
  content: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface ResumeVersion {
  id: string;
  label: string;
  file_url: string;
  is_default: boolean;
  uploaded_at: string;
}

export interface Contact {
  id: string;
  company_id: string;
  name: string;
  role: string | null;
  email: string | null;
  linkedin_url: string | null;
  notes: string;
  company_name?: string;
  last_interaction?: string | null;
}

export interface Interaction {
  id: string;
  interaction_type: InteractionType;
  notes: string;
  interaction_date: string;
}

// ============================================================
// Analytics types
// ============================================================

export interface AnalyticsOverview {
  response_rates: {
    total_applications: number;
    responses: number;
    response_rate_pct: number;
  } | null;
  pipeline_funnel: { status: ApplicationStatus; count: number }[];
  resume_performance: {
    resume_version_id: string;
    resume_label: string;
    times_used: number;
    got_response: number;
    response_rate_pct: number;
  }[];
}

// ============================================================
// Status display config
// ============================================================

export const STATUS_CONFIG: Record<ApplicationStatus, { label: string; color: string }> = {
  bookmarked:   { label: 'Bookmarked',   color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  applied:      { label: 'Applied',      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  screening:    { label: 'Screening',    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' },
  interviewing: { label: 'Interviewing', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
  offer:        { label: 'Offer',        color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  accepted:     { label: 'Accepted',     color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' },
  rejected:     { label: 'Rejected',     color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
  withdrawn:    { label: 'Withdrawn',    color: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400' },
};
