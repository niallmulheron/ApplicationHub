// ============================================================
// Database types — mirrors the PostgreSQL schema
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

export type AIOutputType =
  | 'parsed_jd'
  | 'cover_letter'
  | 'skill_match'
  | 'interview_prep'
  | 'debrief';

export type InteractionType =
  | 'email'
  | 'phone'
  | 'coffee_chat'
  | 'linkedin_message'
  | 'interview'
  | 'referral'
  | 'other';

// ============================================================
// Entity interfaces
// ============================================================

export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  skills: Skill[];
  experience_summary: string;
  target_roles: string[];
  location_prefs: LocationPrefs;
  updated_at: string;
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
  user_id: string;
  name: string;
  industry: string | null;
  size: string | null;
  website: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Application {
  id: string;
  user_id: string;
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
  parsed_jd: ParsedJobDescription;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface ParsedJobDescription {
  requirements?: string[];
  nice_to_haves?: string[];
  responsibilities?: string[];
  raw_text?: string;
}

export interface StatusHistoryEntry {
  id: string;
  application_id: string;
  from_status: ApplicationStatus | null;
  to_status: ApplicationStatus;
  changed_at: string;
}

export interface Document {
  id: string;
  application_id: string;
  doc_type: DocumentType;
  file_url: string;
  filename: string;
  uploaded_at: string;
}

export interface AIOutput {
  id: string;
  application_id: string;
  output_type: AIOutputType;
  content: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface ResumeVersion {
  id: string;
  user_id: string;
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
  created_at: string;
  updated_at: string;
}

export interface Interaction {
  id: string;
  contact_id: string;
  interaction_type: InteractionType;
  notes: string;
  interaction_date: string;
  created_at: string;
}
