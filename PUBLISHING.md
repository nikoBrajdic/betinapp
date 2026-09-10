# Publishing Betinapp

## Branch → preview → merge

[The workflow](.github/workflows/vercel-deploy.yml) runs on every branch push.
It runs `npm run check`, then deploys:

- `main` → production, immediately after checks pass
- Other branches → a preview URL in the Actions run summary

Work on a branch, inspect the preview, then merge when ready:

```bash
git checkout -b codex/my-change
git push -u origin codex/my-change
```

The GitHub Action uses Vercel CLI; it does not depend on Vercel's Git
integration. Required repository secrets are `VERCEL_TOKEN`, `VERCEL_ORG_ID`,
and `VERCEL_PROJECT_ID`. Use `gh run watch` to follow a run.

A preview isolates code, **not its database**. If Preview and Production use
the same Supabase environment variables, both edit the live household data.
Use a separate Supabase project to test migrations without affecting production.

## Before publishing

```bash
npm ci
npm run check
npm run build
```

`check` runs ESLint, TypeScript and regression tests. Database tests use
in-memory PostgreSQL and never connect to Supabase. Vercel also builds the
app and fails on type errors. Manual deployments bypass the Actions check job,
so run the checks locally first.

Apply the migrations required by the code before releasing it. Migrations
are never applied by the workflow or by a web build.

## Reliability release: migrations 036 and 037

Matea reported both migrations applied successfully on 2026-09-10. This is
user-confirmed; verify the integrated behavior on the branch preview. Their
presence in the repository alone does not establish another database's state.

1. Back up the current schema, policies and household data. Check that at
   least one intended superadmin has both a profile and a matching allowlist
   entry for their Auth email.
2. Test `036_household_access.sql`, then `037_atomic_season_lists.sql` on a
   disposable Supabase project with the current schema and representative data.
3. At release time, run 036 then 037 in the production Supabase SQL editor.
   Each script uses a transaction. Don't replay historical scripts.
4. Deploy this branch's code and verify existing-member sign-in, the new-member
   approval flow, note/diary saves, and season-list creation/editing.

036 replaces all policies on the named application tables and removes the
old trigger that automatically created profiles for OAuth signups. It requires
allowlist membership plus a profile for household data access. Its signup RPC
creates a profile only after approval. Existing approved family users retain
access; coordinate new-member onboarding with the code release because the
old callback does not call this RPC.

036 also restricts storage listing, upload, update and delete policies for the
four app buckets. **Existing public file/image URLs stay publicly readable.**
Making those buckets private needs a separate signed-URL rollout; do not toggle
bucket privacy alone, because stored note/diary image URLs would break.

037 creates atomic functions for season setup and saving. New years copy the
most recent previous list, including an intentionally empty list, with
completion reset. Edited lists commit together or not at all. Concurrent
checkbox ticks and rows added after editing began are preserved; simultaneous
text edits to the same row still use the last successful write.

Do not restore old permissive policies to roll back a frontend issue. Web
rollback leaves SQL changes in place. Use the matching release or prepare a
reviewed forward correction for database changes.

## Migration history

`scripts/` contains historical migrations, seeds and repairs, applied by hand.
The latest forward migration in this branch is `037_atomic_season_lists.sql`.
Record applied filenames and dates in the deployment record for each Supabase
project. File presence does not prove a migration has been applied.

The old "run everything in numeric order" instruction is unsafe for an existing
project. There are two 027 files, and 010 recreates the tasks table. Only apply
reviewed pending migrations. Never renumber already-applied files.

The app queries Supabase directly. `prisma/schema.prisma` is historical
reference material and cannot be used as a current schema baseline.

## Environment and OAuth

Required app environment variables:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public client key; RLS protects the data |
| `NEXT_PUBLIC_SITE_URL` | Optional callback fallback if request host is absent |
| `NEXT_PUBLIC_SITE_URL_DEV` | Optional local callback override; keep out of Vercel |
| `NEXT_PUBLIC_CURRENCY`, `NEXT_PUBLIC_CURRENCY_SYMBOL` | Optional display settings; EUR / € by default |

The current application does not use `SUPABASE_SERVICE_ROLE_KEY`,
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, or
`NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL`. Configure Google credentials in the
Supabase provider settings. Never expose a service-role key in `NEXT_PUBLIC_*`.

The canonical production address is `https://betinapp.vercel.app`;
`https://betin-app.vercel.app` is an existing alias.

`signInWithGoogle` uses the incoming request host unless the development
override is set. Supabase → Authentication → URL Configuration should have:

- Site URL: `https://betinapp.vercel.app`
- Redirect URLs: `https://betinapp.vercel.app/auth/callback`,
  `http://localhost:3000/auth/callback`, and the preview pattern
  `https://betinapp-*-mateabrajdics-projects.vercel.app/auth/callback`

In Google Cloud, the authorized redirect URI is the **Supabase** callback:
`https://<project-ref>.supabase.co/auth/v1/callback`.
Add a replacement callback before removing an existing one. Configure Vercel
Deployment Protection to allow the intended preview reviewers access; app
membership is checked separately. Rebuild after changing app environment vars.

## Manual deploy and rollback

Manual commands upload the current working tree, including uncommitted edits:

```bash
npx vercel        # preview
npx vercel --prod # production; only when explicitly authorized
```

Choose the branch workflow or a manual production deploy; doing both creates
duplicate deployments. To restore a known-good web deployment:

```bash
npx vercel ls betinapp
npx vercel promote <deployment-url>
```

On a new machine, `npx vercel login` and `npx vercel link` connect the directory
to the `betinapp` project in `mateabrajdics-projects`. `.vercel/` is gitignored.

## Desktop and PWA

Electron wraps the live site; normal web edits need no new desktop binary.
For wrapper changes, use `npm run electron:build:mac` or
`npm run electron:build:win`. For a Windows auto-update, bump `package.json`'s
version and run `npm run electron:publish:win` with `GH_TOKEN` configured.
The updater reads GitHub Releases for `nikoBrajdic/betinapp`.

After changing PWA install metadata or icons, remove and re-add the iOS
home-screen icon to check the new install metadata.
