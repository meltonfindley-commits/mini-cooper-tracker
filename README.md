# Mini Cooper Revival — Monorepo

Two independent apps sharing the same Supabase project and design system.

| App | Description |
|-----|-------------|
| `apps/dashboard` | Restoration task tracker |
| `apps/fuel-tracker` | Fuel log & MPG tracker |

---

## Local Development

### Prerequisites
- Node.js 18+
- npm 9+ (workspaces support)

### 1. Install dependencies

```bash
cd mini-cooper
npm install
```

### 2. Set up environment variables

Copy `.env.example` in each app and fill in your Supabase credentials:

```bash
cp apps/dashboard/.env.example apps/dashboard/.env
cp apps/fuel-tracker/.env.example apps/fuel-tracker/.env
```

Both apps share the **same** `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` — they use the same Supabase project.

### 3. Set up Supabase tables

In your Supabase Dashboard → SQL Editor, run each file once:

- `apps/dashboard/supabase/tasks.sql`
- `apps/fuel-tracker/supabase/fuel_logs.sql`

### 4. Deploy Edge Functions

```bash
# Install Supabase CLI if needed
npm install -g supabase

supabase login
supabase link --project-ref YOUR_PROJECT_REF

# Dashboard functions
supabase functions deploy admin-verify --project-ref YOUR_PROJECT_REF
supabase functions deploy admin-insert --project-ref YOUR_PROJECT_REF
supabase functions deploy admin-update --project-ref YOUR_PROJECT_REF
supabase functions deploy admin-delete --project-ref YOUR_PROJECT_REF

# Fuel tracker functions
supabase functions deploy fuel-verify --project-ref YOUR_PROJECT_REF
supabase functions deploy fuel-insert --project-ref YOUR_PROJECT_REF
supabase functions deploy fuel-update --project-ref YOUR_PROJECT_REF
supabase functions deploy fuel-delete --project-ref YOUR_PROJECT_REF
```

Set these secrets in Supabase Dashboard → Project Settings → Edge Functions:

```
ADMIN_PASSWORD=your_secret_password
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

> The same `ADMIN_PASSWORD` unlocks both apps — one password for the whole project.

### 5. Run locally

```bash
# Dashboard (http://localhost:5173)
npm run dev:dashboard

# Fuel Tracker (http://localhost:5174)
npm run dev:fuel
```

---

## Vercel Deployment

Each app is a **separate Vercel project** pointing at the same Supabase project.

### Dashboard project
- **Root Directory:** `apps/dashboard`
- **Build Command:** `vite build`
- **Output Directory:** `dist`
- **Environment Variables:**
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_FUEL_URL` → URL of the deployed fuel tracker

### Fuel Tracker project
- **Root Directory:** `apps/fuel-tracker`
- **Build Command:** `vite build`
- **Output Directory:** `dist`
- **Environment Variables:**
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_DASHBOARD_URL` → URL of the deployed dashboard
  - `VITE_FUEL_URL` → URL of this app (used by Nav self-link)

> Both apps include `vercel.json` with SPA rewrites so React Router (or direct URL access) works correctly.

---

## Architecture

```
mini-cooper/
├── apps/
│   ├── dashboard/          React 19 + Vite — restoration task tracker
│   └── fuel-tracker/       React 19 + Vite — fuel log & MPG tracker
├── packages/
│   └── shared/
│       └── src/Nav.jsx     Shared sticky nav bar (inline styles only)
└── package.json            npm workspaces root
```

### Design tokens
All styling uses inline JavaScript objects — no Tailwind, no CSS frameworks. See the `COLORS` constants in each `App.jsx` and the shared helper functions (`inputStyle`, `selectStyle`, `labelStyle`).

### Admin auth
Both apps use a custom password system — no Supabase Auth. Public visitors can read all data; only an admin with the correct password can write. The password is verified by a Supabase Edge Function (`admin-verify` / `fuel-verify`) which checks it against the `ADMIN_PASSWORD` environment secret. The session is stored in `sessionStorage` and clears on tab close.
