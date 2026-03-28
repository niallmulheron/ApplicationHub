# Project brief — Job application tracker

> **Working title:** ApplicationHub
> **Author:** Niall Mulheron
> **Last updated:** March 2026
> **Status:** Pre-development

---

## Problem statement

Job hunting is chaotic. Applicants juggle dozens of applications across multiple platforms, lose track of follow-ups, reuse the same generic resume, and have no visibility into what's actually working. Existing tools (Huntr, Teal, spreadsheets) treat the process as a data-entry problem — they track *what* you applied to, but don't help you get *better* at applying.

## Product vision

An AI-powered job search command centre that combines application tracking, intelligent document generation, networking CRM, and data-driven analytics into a single tool. It should feel less like a spreadsheet and more like a **strategy platform** — one that learns from your search and actively helps you improve it.

### Core differentiators

| Feature | What it does | Why it matters |
|---|---|---|
| **AI engine** | Parses job descriptions, scores skill-match, tailors resumes, drafts cover letters | Eliminates copy-paste busywork; every application is personalised |
| **Smart analytics** | Tracks response rates, resume version performance, timing patterns | Turns gut feelings into data — you can see what's working |
| **Contact CRM** | Maps people to companies, tracks networking touchpoints, nudges follow-ups | Job searching is relationship-driven; this treats it that way |

---

## Tech stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | React + TypeScript | Industry standard, strong typing, excellent for portfolio |
| Styling | Tailwind CSS | Rapid prototyping, professional look with minimal custom CSS |
| Backend | Node.js + Express | Same language across the stack, large ecosystem |
| Database | PostgreSQL | Robust relational queries for analytics, strong JSON support |
| AI | Claude API (Anthropic) | Document generation, JD parsing, skill matching |
| Hosting | Vercel (frontend) + Railway or Render (backend) | Free tiers available, simple CI/CD, good DX |

---

## Feature breakdown

### Phase 1 — Tracker + AI basics

The minimum viable product. A usable tracker that already does something no competitor does out of the box.

**Application tracker (core)**
- Kanban-style pipeline: Applied → Screening → Interview → Offer → Rejected → Withdrawn
- Each application stores: company, role title, URL, salary range, location/remote, date applied, current status, notes
- List view and board view
- Search, filter by status/company/date range
- Document uploads per application (resume version used, cover letter)

**AI features (v1)**
- Paste a job description or URL → auto-extract company name, role, requirements, nice-to-haves
- Skill-match score: compare extracted requirements against a user-defined skill profile
- Basic cover letter draft generation using role + company + user profile as context

**Auth & user profile**
- Email/password authentication (or OAuth with Google)
- User profile: name, target roles, skills list, experience summary, location preferences
- This profile feeds the AI features

### Phase 2 — Analytics + CRM

The layer that turns data into insight and makes the app sticky.

**Analytics dashboard**
- Response rate over time (applied vs. heard back)
- Average days-to-response, segmented by company size / industry
- Resume version tracking: which version of your resume correlates with more callbacks
- Application volume trends (weekly/monthly)
- Funnel visualisation: how many apps convert at each pipeline stage
- Pattern detection: surface insights like "you get more responses from startups" or "applications submitted on Mondays perform better"

**Contact CRM**
- Add contacts linked to companies (recruiters, hiring managers, referrals)
- Track interactions: emails sent, calls, coffee chats, LinkedIn messages
- Networking timeline per company
- Follow-up reminders: "You haven't contacted [person] at [company] in 2 weeks"
- Referral tracking: who referred you where, and what came of it

### Phase 3 — Polish + integrations

The features that elevate it from a side project to a portfolio showpiece.

**Advanced AI**
- Full cover letter generation with tone/length controls
- Resume bullet point suggestions tailored per job description
- Interview prep: generate likely questions based on the JD and your experience gaps
- Application debrief: after a rejection, AI suggests what to adjust next time

**Integrations**
- Google Calendar sync for interview scheduling
- Email integration: detect application confirmation emails, auto-create tracker entries
- Browser extension (stretch goal): one-click save from job boards

**UX polish**
- Dark mode
- Mobile-responsive design
- Keyboard shortcuts for power users
- Export data as CSV
- Onboarding flow for new users

---

## Data model (preliminary)

High-level entities — full schema to be designed before development begins.

```
users
├── id, email, password_hash, name, created_at
├── profile (skills[], experience_summary, target_roles[], location_prefs)
│
├── applications
│   ├── id, user_id, company_id, role_title, url, status, date_applied
│   ├── salary_min, salary_max, location, remote_type
│   ├── notes, skill_match_score, resume_version_id
│   ├── created_at, updated_at
│   │
│   ├── status_history (id, application_id, from_status, to_status, changed_at)
│   ├── documents (id, application_id, type, file_url, uploaded_at)
│   └── ai_outputs (id, application_id, type, content, created_at)
│
├── companies
│   ├── id, name, industry, size, website, notes
│   └── contacts
│       ├── id, company_id, name, role, email, linkedin_url
│       └── interactions (id, contact_id, type, notes, date)
│
└── resume_versions
    ├── id, user_id, label, file_url, uploaded_at
    └── (linked to applications for A/B tracking)
```

---

## Non-functional requirements

- **Performance:** Dashboard loads in under 2 seconds with 500+ applications
- **Security:** Passwords hashed with bcrypt, JWT-based auth, environment variables for all secrets, API keys never exposed client-side
- **Data privacy:** User data isolated by account, no sharing between users
- **Accessibility:** WCAG 2.1 AA compliance target — semantic HTML, keyboard navigation, sufficient contrast
- **Testing:** Unit tests for API routes and AI parsing logic, integration tests for auth flow

---

## Success metrics

- [ ] Can track 50+ applications without the UI feeling slow
- [ ] AI skill-match score correlates with actual callback rates (validate after ~30 applications)
- [ ] Analytics surface at least one non-obvious insight per user
- [ ] A developer reviewing the GitHub repo can understand the project in under 5 minutes
- [ ] Deployed and publicly accessible with a polished README

---

## Open questions

- [ ] App name — needs something memorable, not generic
- [ ] Free tier AI usage limits — how many Claude API calls per user per day?
- [ ] Job description scraping — parse from URL or require manual paste? (URL parsing adds complexity + legal considerations)
- [ ] Multi-resume support from day one, or add in Phase 2?
- [ ] Should analytics track applications across multiple job searches / time periods?

---

## Project goals (dual purpose)

1. **Personal utility:** Actually use this during the job search. It should be genuinely better than a spreadsheet.
2. **Portfolio piece:** Demonstrate full-stack skills, AI integration, data modelling, and product thinking to potential employers. The brief itself, the commit history, and the README all matter.

---

