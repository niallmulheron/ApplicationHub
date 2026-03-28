-- ============================================================
-- Job Application Tracker — Initial Schema
-- Database: PostgreSQL 15+
-- Run with: psql -d your_db -f 001_initial_schema.sql
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE application_status AS ENUM (
    'bookmarked',   -- saved but not yet applied
    'applied',      -- application submitted
    'screening',    -- initial HR/recruiter screen
    'interviewing', -- active interview rounds
    'offer',        -- received an offer
    'accepted',     -- accepted the offer
    'rejected',     -- rejected by company
    'withdrawn'     -- withdrawn by user
);

CREATE TYPE remote_type AS ENUM (
    'onsite',
    'remote',
    'hybrid'
);

CREATE TYPE document_type AS ENUM (
    'resume',
    'cover_letter',
    'portfolio',
    'other'
);

CREATE TYPE ai_output_type AS ENUM (
    'parsed_jd',         -- structured extraction from job description
    'cover_letter',      -- generated cover letter draft
    'skill_match',       -- skill match analysis
    'interview_prep',    -- generated interview questions (phase 3)
    'debrief'            -- post-rejection suggestions (phase 3)
);

CREATE TYPE interaction_type AS ENUM (
    'email',
    'phone',
    'coffee_chat',
    'linkedin_message',
    'interview',
    'referral',
    'other'
);

-- ============================================================
-- USERS & PROFILES
-- ============================================================

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    name            VARCHAR(255) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_profiles (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

    -- Skills stored as JSONB array of objects:
    -- [{ "name": "React", "level": "advanced" }, { "name": "Python", "level": "intermediate" }]
    skills              JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- Free-text summary for AI context
    experience_summary  TEXT DEFAULT '',

    -- Target roles as JSONB array: ["Frontend Engineer", "Full Stack Developer"]
    target_roles        JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- Location preferences as JSONB:
    -- { "preferred_cities": ["London", "Manchester"], "open_to_remote": true, "willing_to_relocate": false }
    location_prefs      JSONB NOT NULL DEFAULT '{}'::jsonb,

    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- COMPANIES
-- ============================================================

CREATE TABLE companies (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    name        VARCHAR(255) NOT NULL,
    industry    VARCHAR(100),
    size        VARCHAR(50),       -- e.g. "1-50", "51-200", "201-1000", "1000+"
    website     VARCHAR(500),
    notes       TEXT DEFAULT '',

    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Prevent duplicate company names per user
    UNIQUE(user_id, name)
);

-- ============================================================
-- RESUME VERSIONS
-- ============================================================

CREATE TABLE resume_versions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    label       VARCHAR(255) NOT NULL,  -- e.g. "Frontend Focus v2", "General Purpose"
    file_url    VARCHAR(500) NOT NULL,
    is_default  BOOLEAN NOT NULL DEFAULT FALSE,

    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Prevent duplicate labels per user
    UNIQUE(user_id, label)
);

-- Partial unique index: only one default resume per user
CREATE UNIQUE INDEX idx_resume_versions_one_default
    ON resume_versions (user_id)
    WHERE is_default = TRUE;

-- ============================================================
-- APPLICATIONS (core entity)
-- ============================================================

CREATE TABLE applications (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id          UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    resume_version_id   UUID REFERENCES resume_versions(id) ON DELETE SET NULL,

    role_title          VARCHAR(255) NOT NULL,
    url                 VARCHAR(500),           -- link to the job posting
    status              application_status NOT NULL DEFAULT 'bookmarked',
    date_applied        DATE,                   -- null if still bookmarked

    salary_min          INTEGER,                -- stored in smallest currency unit or annual figure
    salary_max          INTEGER,
    location            VARCHAR(255),
    remote_type         remote_type,

    -- AI-generated skill match (0.00 to 1.00)
    skill_match_score   NUMERIC(3,2) CHECK (skill_match_score >= 0 AND skill_match_score <= 1),

    -- Structured data extracted from the job description by AI
    -- { "requirements": [...], "nice_to_haves": [...], "responsibilities": [...], "raw_text": "..." }
    parsed_jd           JSONB DEFAULT '{}'::jsonb,

    notes               TEXT DEFAULT '',

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- STATUS HISTORY (powers analytics)
-- ============================================================

CREATE TABLE status_history (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id  UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,

    from_status     application_status,         -- null for initial status
    to_status       application_status NOT NULL,
    changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- DOCUMENTS
-- ============================================================

CREATE TABLE documents (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id  UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,

    doc_type        document_type NOT NULL,
    file_url        VARCHAR(500) NOT NULL,
    filename        VARCHAR(255) NOT NULL,

    uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AI OUTPUTS
-- ============================================================

CREATE TABLE ai_outputs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id  UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,

    output_type     ai_output_type NOT NULL,
    content         TEXT NOT NULL,              -- the generated text (cover letter, analysis, etc.)

    -- Flexible metadata: model used, token count, user rating, prompt version
    -- { "model": "claude-sonnet-4-20250514", "tokens_used": 1200, "user_rating": 4 }
    metadata        JSONB DEFAULT '{}'::jsonb,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CONTACTS (CRM)
-- ============================================================

CREATE TABLE contacts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    name            VARCHAR(255) NOT NULL,
    role            VARCHAR(255),               -- their job title
    email           VARCHAR(255),
    linkedin_url    VARCHAR(500),
    notes           TEXT DEFAULT '',

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INTERACTIONS (CRM activity log)
-- ============================================================

CREATE TABLE interactions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id          UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,

    interaction_type    interaction_type NOT NULL,
    notes               TEXT DEFAULT '',
    interaction_date    DATE NOT NULL,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Users
CREATE INDEX idx_users_email ON users(email);

-- Applications: the most-queried table
CREATE INDEX idx_applications_user_id ON applications(user_id);
CREATE INDEX idx_applications_company_id ON applications(company_id);
CREATE INDEX idx_applications_status ON applications(user_id, status);
CREATE INDEX idx_applications_date_applied ON applications(user_id, date_applied DESC);
CREATE INDEX idx_applications_resume_version ON applications(resume_version_id);

-- Status history: time-series queries for analytics
CREATE INDEX idx_status_history_application ON status_history(application_id);
CREATE INDEX idx_status_history_changed_at ON status_history(changed_at DESC);

-- Documents
CREATE INDEX idx_documents_application ON documents(application_id);

-- AI outputs
CREATE INDEX idx_ai_outputs_application ON ai_outputs(application_id);
CREATE INDEX idx_ai_outputs_type ON ai_outputs(application_id, output_type);

-- Companies
CREATE INDEX idx_companies_user_id ON companies(user_id);

-- Contacts & interactions (CRM queries)
CREATE INDEX idx_contacts_company ON contacts(company_id);
CREATE INDEX idx_interactions_contact ON interactions(contact_id);
CREATE INDEX idx_interactions_date ON interactions(interaction_date DESC);

-- Resume versions
CREATE INDEX idx_resume_versions_user ON resume_versions(user_id);

-- ============================================================
-- TRIGGERS: auto-update updated_at timestamps
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_applications_updated_at
    BEFORE UPDATE ON applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_contacts_updated_at
    BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TRIGGER: auto-log status changes to status_history
-- ============================================================

CREATE OR REPLACE FUNCTION log_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO status_history (application_id, from_status, to_status)
        VALUES (NEW.id, OLD.status, NEW.status);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_application_status_change
    AFTER UPDATE ON applications
    FOR EACH ROW EXECUTE FUNCTION log_status_change();

-- Also log initial status on insert
CREATE OR REPLACE FUNCTION log_initial_status()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO status_history (application_id, from_status, to_status)
    VALUES (NEW.id, NULL, NEW.status);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_application_initial_status
    AFTER INSERT ON applications
    FOR EACH ROW EXECUTE FUNCTION log_initial_status();

-- ============================================================
-- USEFUL ANALYTICS VIEWS
-- ============================================================

-- Response rate: what % of applications got past "applied"
CREATE VIEW v_response_rates AS
SELECT
    a.user_id,
    COUNT(*) AS total_applications,
    COUNT(*) FILTER (WHERE a.status NOT IN ('bookmarked', 'applied', 'withdrawn')) AS responses,
    ROUND(
        COUNT(*) FILTER (WHERE a.status NOT IN ('bookmarked', 'applied', 'withdrawn'))::numeric
        / NULLIF(COUNT(*) FILTER (WHERE a.status != 'bookmarked'), 0)
        * 100, 1
    ) AS response_rate_pct
FROM applications a
WHERE a.date_applied IS NOT NULL
GROUP BY a.user_id;

-- Average days to first response, by company
CREATE VIEW v_days_to_response AS
SELECT
    a.user_id,
    c.name AS company_name,
    c.size AS company_size,
    a.role_title,
    a.date_applied,
    sh.changed_at::date AS first_response_date,
    (sh.changed_at::date - a.date_applied) AS days_to_response
FROM applications a
JOIN companies c ON c.id = a.company_id
JOIN LATERAL (
    SELECT changed_at
    FROM status_history
    WHERE application_id = a.id
      AND from_status = 'applied'
      AND to_status NOT IN ('withdrawn')
    ORDER BY changed_at ASC
    LIMIT 1
) sh ON TRUE
WHERE a.date_applied IS NOT NULL;

-- Resume version performance
CREATE VIEW v_resume_performance AS
SELECT
    rv.user_id,
    rv.id AS resume_version_id,
    rv.label AS resume_label,
    COUNT(*) AS times_used,
    COUNT(*) FILTER (WHERE a.status NOT IN ('bookmarked', 'applied', 'withdrawn')) AS got_response,
    ROUND(
        COUNT(*) FILTER (WHERE a.status NOT IN ('bookmarked', 'applied', 'withdrawn'))::numeric
        / NULLIF(COUNT(*), 0) * 100, 1
    ) AS response_rate_pct
FROM resume_versions rv
LEFT JOIN applications a ON a.resume_version_id = rv.id
GROUP BY rv.user_id, rv.id, rv.label;

-- Pipeline funnel: count at each stage
CREATE VIEW v_pipeline_funnel AS
SELECT
    a.user_id,
    a.status,
    COUNT(*) AS count
FROM applications a
GROUP BY a.user_id, a.status
ORDER BY
    CASE a.status
        WHEN 'bookmarked'   THEN 1
        WHEN 'applied'      THEN 2
        WHEN 'screening'    THEN 3
        WHEN 'interviewing' THEN 4
        WHEN 'offer'        THEN 5
        WHEN 'accepted'     THEN 6
        WHEN 'rejected'     THEN 7
        WHEN 'withdrawn'    THEN 8
    END;
