# Betinapp

Shared household management for the family's property in Betina, Croatia.
Next.js 16, React 19, TypeScript, Supabase and Tailwind CSS v4, with an
Electron wrapper for the live web app.

## Features

- Notes and documents, plus a photo diary
- Tasks and end-of-season checklists
- Guest stays with a linked calendar
- Meter readings, bills and household settlements
- Inventory photos and stock levels
- English and Croatian interface translations

## Run locally

Use Node.js 22 LTS and the existing Supabase project:

```bash
npm ci
npm run dev
```

Ask the project owner for `.env.local`. Required keys are
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
For a fixed local OAuth return address, optionally set
`NEXT_PUBLIC_SITE_URL_DEV=http://localhost:3000`.
See [SETUP_GUIDE.md](SETUP_GUIDE.md) for account and OAuth setup.

## Access

Google OAuth identifies the account. Household access requires both an
allowlisted Auth email and an approved profile. New members submit a join
request and sign in again after approval. New approved family members receive
full access (`superadmin`); invite-code pages are legacy.

Migration 036 enforces this in the database, including direct API requests.
Public storage URLs remain public; these are not private photo/file links.
See [PUBLISHING.md](PUBLISHING.md) before applying the access migration.

## Checks

```bash
npm run check  # lint, TypeScript, and regression tests
npm run build # production build
```

Tests cover access policies and atomic checklist operations in isolated
PostgreSQL (PGlite), autosave failures/order, and bill calculations. Tests never
connect to the live Supabase project. The deploy workflow runs the checks
before producing either a preview or a production deployment.

## Project map

- `app/`: pages and client views; calendar lives inside Guest Stays
- `components/`: shared UI; `hooks/`: autosave, realtime and presence
- `lib/actions/`: Supabase server actions
- `lib/bill-splitting.ts`: bill shares, night overlaps and settlement netting
- `scripts/`: historical SQL and forward migrations, applied manually
- `tests/`: regression checks
- `proxy.ts`: session and membership checks
- `electron/`: desktop wrapper and auto-updater

Read [CONVENTIONS.md](CONVENTIONS.md) before UI or data-model changes.
[CLAUDE.md](CLAUDE.md) is the repository context map.
[Currency formatting](CURRENCY_SETUP.md) documents the display helpers.

## Shipping

Work on a branch and push it to get a preview URL in the GitHub Actions run
summary. Merge to `main` only when it looks right: `main` publishes immediately
after checks pass. Database migrations are a separate manual step; a preview
using production Supabase still shares live data.

See [PUBLISHING.md](PUBLISHING.md) for migrations, OAuth redirects, rollback,
and Electron releases.
