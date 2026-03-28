# Job Tracker

An AI-powered job application tracker with smart analytics and a networking CRM.

Built with React, TypeScript, Node.js, Express, PostgreSQL, and the Claude API.

## Project structure

```
job-tracker/
├── client/                 # React + TypeScript frontend
│   ├── src/
│   │   ├── components/     # Shared UI components
│   │   ├── hooks/          # Custom React hooks (auth, etc.)
│   │   ├── pages/          # Page-level components
│   │   ├── services/       # API client (Axios)
│   │   └── types/          # Shared TypeScript types
│   └── ...config files
│
├── server/                 # Node.js + Express backend
│   ├── src/
│   │   ├── db/             # Database connection, migrations, seeds
│   │   ├── middleware/      # Auth, error handling
│   │   ├── routes/         # API route handlers
│   │   ├── services/       # Business logic (AI, analytics)
│   │   └── types/          # Server-side TypeScript types
│   └── ...config files
│
├── docs/                   # Project documentation
├── .env.example            # Environment variable template
└── package.json            # Root scripts (run both client & server)
```

## Getting started

### Prerequisites

- **Node.js** 20+
- **PostgreSQL** 15+
- **Anthropic API key** (for AI features)

### 1. Clone and install

```bash
git clone <your-repo-url>
cd job-tracker
npm run install:all
```

### 2. Set up environment

```bash
cp .env.example .env
# Edit .env with your database URL, JWT secret, and Anthropic API key
```

### 3. Create the database

```bash
createdb job_tracker
npm run db:migrate
```

### 4. Run the app

```bash
npm run dev
```

This starts both the backend (port 3001) and the frontend (port 5173) concurrently.

## API endpoints

| Method | Endpoint                          | Description                     |
|--------|-----------------------------------|---------------------------------|
| POST   | `/api/auth/register`              | Create account                  |
| POST   | `/api/auth/login`                 | Sign in                         |
| GET    | `/api/profile`                    | Get user profile                |
| PATCH  | `/api/profile`                    | Update profile & skills         |
| GET    | `/api/applications`               | List applications (filterable)  |
| POST   | `/api/applications`               | Create application              |
| GET    | `/api/applications/:id`           | Application detail + history    |
| PATCH  | `/api/applications/:id`           | Update application / status     |
| DELETE | `/api/applications/:id`           | Delete application              |
| GET    | `/api/companies`                  | List companies                  |
| POST   | `/api/companies`                  | Create company                  |
| PATCH  | `/api/companies/:id`              | Update company                  |
| DELETE | `/api/companies/:id`              | Delete company                  |
| GET    | `/api/contacts`                   | List contacts                   |
| POST   | `/api/contacts`                   | Create contact                  |
| POST   | `/api/contacts/:id/interactions`  | Log an interaction              |
| GET    | `/api/contacts/:id/interactions`  | Interaction history             |
| GET    | `/api/analytics/overview`         | Response rates, funnel, resume perf |
| GET    | `/api/analytics/response-times`   | Days to first response          |
| GET    | `/api/analytics/activity`         | Application volume over time    |
| GET    | `/api/analytics/follow-ups`       | Contacts needing follow-up      |
| POST   | `/api/ai/parse-jd`                | Parse JD + auto-fill + skill match |
| POST   | `/api/ai/score-match`             | Re-score an application's match  |

## Tech stack

| Layer     | Technology            |
|-----------|-----------------------|
| Frontend  | React 19 + TypeScript |
| Styling   | Tailwind CSS          |
| Routing   | React Router 7        |
| Backend   | Node.js + Express     |
| Database  | PostgreSQL 15+        |
| AI        | Claude API (Anthropic)|
| Auth      | JWT + bcrypt          |
| Dev       | Vite + tsx            |

## Roadmap

- [x] Database schema design
- [x] Project scaffolding
- [x] Core tracker CRUD (applications, companies)
- [x] Contact CRM + interaction logging
- [x] User profile with skills, target roles, location prefs
- [x] Analytics dashboard (response rates, pipeline funnel, resume performance)
- [x] AI: Job description parsing + skill match
- [x] Kanban board view
- [ ] AI: Cover letter generation
- [x] Dark mode
- [x] Deploy to production

## Deployment

### Frontend → Vercel

The `client/` directory deploys as a standalone Vite project on Vercel.

1. Import the repo in Vercel and set **Root Directory** to `client`.
2. Add one environment variable: `BACKEND_URL` = your backend's URL (e.g. `https://job-tracker-api.up.railway.app`).
3. Vercel will auto-detect Vite and use `vercel.json` for API proxy rewrites and SPA fallback.

### Backend → Railway or Render

The `server/` directory ships with a Dockerfile, `railway.toml`, and `render.yaml`.

**Railway:**
1. Create a new project, connect the repo, and set **Root Directory** to `server`.
2. Add a PostgreSQL plugin (Railway provisions it automatically).
3. Set env vars: `DATABASE_URL` (from the plugin), `JWT_SECRET`, `ANTHROPIC_API_KEY`, `CLIENT_URL`.

**Render:**
1. Create a new **Blueprint** from the repo pointing at `server/render.yaml`.
2. Render will create the web service + a free Postgres database.
3. Fill in `ANTHROPIC_API_KEY` and `CLIENT_URL` as manual env vars.

After deploying, run the migration once: `npm run db:migrate` (Railway: `railway run npm run db:migrate`; Render: via the shell tab).

## License

MIT
