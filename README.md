# CovenantWatch Dashboard

React frontend for the CovenantWatch covenant monitoring dashboard. Uses mock auth and portfolio data (no backend required).

## Quick start

1. Copy `.env.example` to `.env` and set `MONGODB_URI` (MongoDB Atlas) and `JWT_SECRET`.
2. Install and run both API and frontend:

```bash
npm install
npm run dev:all
```

Or in two terminals:

```bash
npm run dev:server   # API on http://localhost:5000
npm run dev          # UI on http://localhost:5173
```

Open [http://localhost:5173](http://localhost:5173). The Vite dev server proxies `/api` to the backend.

On first API start, demo companies and users are seeded into MongoDB if the database is empty.

## Demo logins

| Role    | Email                     | Password      |
|---------|---------------------------|---------------|
| Admin   | admin@covenantwatch.com   | CW_admin2025  |
| Company | cfo@acme.com              | acme2025      |
| Company | cfo@vertex.com            | vertex2025    |
| Company | cfo@cascade.com           | cascade2025   |
| Company | cfo@summit.com            | summit2025    |

## Scripts

- `npm run dev` — development server
- `npm run build` — production build to `dist/`
- `npm run preview` — preview production build
- `npm run typecheck` — TypeScript check

## Stack

**Frontend**

- React 19 + TypeScript
- Vite 7
- Tailwind CSS 4
- Wouter (routing)
- TanStack Query
- shadcn/ui components
- Recharts

**Backend**

- Node.js + Express 5
- MongoDB Atlas (Mongoose)
- JWT authentication
- bcrypt password hashing

## API

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/signup` | Register company user + create company record |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Current user (Bearer token) |
| GET | `/api/companies` | List companies (admin: all; company: own) |
| GET | `/api/companies/:id` | Single company |
| POST | `/api/sync/quickbooks` | Pull QuickBooks reports → update covenants (Bearer token) |

## QuickBooks nightly sync (Node.js + node-cron)

Covenant figures are pulled from QuickBooks **P&L**, **Balance Sheet**, and **Cash Flow**, then saved to MongoDB. Scheduling uses **node-cron** inside the API server (no Python).

**Full env guide:** see [ENV_SETUP.md](ENV_SETUP.md) and [.env.example](.env.example).

### Quick setup

1. Copy `.env.example` → `.env` and fill in MongoDB + JWT + Intuit credentials.
2. Get **realm ID** and **refresh token** from the [Intuit OAuth Playground](https://developer.intuit.com/app/developer/playground).
3. Enable cron in `.env`:

```env
ENABLE_QB_CRON=true
QB_CRON_SCHEDULE=0 2 * * *
QB_CRON_MAX_RUNS=4
```

4. Start the API: `npm run dev:server` (or `npm run dev:all`).

Cron runs at **2:00 AM** daily and stops after **4** runs. Manual sync: `npm run sync:qb`. Dashboard **Sync QuickBooks** calls `POST /api/sync/quickbooks`.
