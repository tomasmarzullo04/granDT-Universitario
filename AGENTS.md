# Gran DT Universitario — Base44 Dev Environment

## What this is
Fantasy rugby web app for Club Universitario de Mar del Plata. React 19 + Vite 8 frontend that talks to a **hosted Supabase** backend (PostgreSQL + Auth). There is no local backend server — the frontend is the only process.

## Running the app
```
docker compose -f docker-compose.base44.yml up -d
```
- Vite dev server on port 3000 (mapped from container port 5173), with HMR and live source.
- Source is bind-mounted; edits appear via live reload.
- `node_modules` is a named volume (persists across restarts, not bind-mounted to avoid host conflicts).

## Required credentials
The app needs two environment variables to connect to Supabase:
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon/public key

Both are delivered via `/run/base44/app.env` (platform-managed). Development placeholders exist in `.env.base44-defaults` so the app boots without real credentials, but **auth and data won't work** until real Supabase values are provided. Find them in the Supabase dashboard → Project Settings → API.

## Architecture notes
- `src/lib/supabase.js` — Supabase client init from `import.meta.env`.
- `src/lib/api.js` — all data access functions.
- `src/contexts/AuthContext.jsx` — auth state + role detection (player vs admin).
- Routes: `/login`, `/signup`, `/dashboard` (player), `/admin` (admin), `/resumenes`.
- SQL migrations live in `supabase/migrations/` and `supabase/*.sql` — these run against the hosted Supabase project, not locally.
- `scripts/` contains one-off data population/fix scripts (run against hosted Supabase).

## Verifying it works
- `curl http://localhost:3000/` returns the Vite-served HTML with title "Gran DT UNI".
- Without real Supabase creds, the app loads but shows a login page that can't authenticate.
