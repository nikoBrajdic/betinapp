# Publishing Betinapp

Everything you need to get a change from your laptop to the live app.

---

## How a deploy happens

There are two routes to production, and **the first one is automatic**.

### 1. Push to `main` — this deploys

[`.github/workflows/vercel-deploy.yml`](.github/workflows/vercel-deploy.yml)
runs on every push to `main` and executes `vercel deploy --prod`. It has been
the actual deploy path for months.

> **So pushing to `main` is publishing.** There is no staging step and no
> approval gate. Treat `git push` with the same care as a deploy command. Work
> on a branch if you are not ready to go live.

The Vercel *project* is not linked to the GitHub repo in Vercel's own
dashboard — there is no Vercel Git integration, no preview-per-PR. The
GitHub Action is what bridges them, using a stored token.

It needs three repository secrets (GitHub → Settings → Secrets and variables →
Actions), all already set:

`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

Check a run:

```bash
gh run list --limit 5
gh run watch          # follow the one in progress
```

### Two things previews need, once

1. **Vercel Deployment Protection** — by default preview URLs sit behind
   Vercel's SSO wall (they redirect to `vercel.com/sso-api`), so only someone
   logged into the Vercel account can open them. Project Settings →
   Deployment Protection → set *Vercel Authentication* to **Only Production**.
   Previews are still useless to a stranger: the app itself requires Google
   sign-in and an allowlisted email.

2. **A wildcard in Supabase** — preview hosts change on every deploy, so add
   `https://betinapp-*-mateabrajdics-projects.vercel.app/auth/callback`
   to Authentication → URL Configuration → Redirect URLs. Without it Supabase
   rejects the preview's `redirectTo` and drops you on production instead.

`signInWithGoogle` uses the host the request came from, so no env var needs
changing per environment.

### Check it first — push a branch

Any branch that is not `main` deploys a **preview**: a private URL with your
change on it, nothing live touched. This is the way to look before publishing.

```bash
git checkout -b my-change
git push -u origin my-change
```

The URL appears in the Actions run summary (GitHub → Actions → the run), or:

```bash
gh run watch
```

When it looks right, merge to `main` — that publishes.

### Pick one — don't do both

Running `npx vercel --prod` *after* pushing deploys the same commit a second
time. That is where the duplicate production deployments in the dashboard came
from. Push **or** deploy manually, not both.

### 2. Manual, from your laptop

Useful for deploying uncommitted work, or when Actions is down:

```bash
npx vercel --prod
```

Run it from the repo root. It builds locally, uploads, and promotes in one
step. This deploys your working tree — committed or not.

---

## Live URLs

| URL | Notes |
|---|---|
| `https://betinapp.vercel.app` | The canonical one. Use this everywhere. |
| `https://betin-app.vercel.app` | An **alias** of the same deployment, kept from an earlier setup. |

Both resolve to the same build. Prefer `betinapp.vercel.app` in anything you
configure — see *OAuth redirects* below.

---

## First-time setup on a new machine

1. **Install deps and get the env file.**

   ```bash
   npm install
   ```

   Ask Matea for `.env.local` — it is gitignored and never in the repo. It needs:

   | Variable | Used for |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase project |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase client |
   | `SUPABASE_SERVICE_ROLE_KEY` | Server actions needing elevated access |
   | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth |
   | `NEXT_PUBLIC_SITE_URL_DEV` | Local OAuth redirect target |
   | `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` | Local Supabase redirect |

2. **Log in to Vercel** with an account that can access
   `mateabrajdics-projects`:

   ```bash
   npx vercel login
   ```

3. **Link the directory to the project:**

   ```bash
   npx vercel link
   ```

   Pick the `betinapp` project. This writes `.vercel/project.json`, which is
   gitignored, so every machine does this once.

   > Heads-up: this file once held `"projectName":"y"`. `projectId` is what
   > routes the deploy, so it still went to the right project — but the CLI uses
   > `projectName` to *name* the deployment, so CLI deploys showed up in the
   > dashboard as `y` while Action deploys showed as `betinapp`. It looked like
   > two projects; there is only one. Fixed by re-running `npx vercel link`.

4. **Run it:**

   ```bash
   npm run dev
   ```

   Then open `http://localhost:3000` and sign in with Google. Only allowlisted
   emails can get in (see `allowlist` table).

---

## Before you publish — either route

Whether you are pushing to `main` or running the CLI:

- [ ] `npm run build` passes locally — it now typechecks, so a green build
      means the types are clean too. There are no known-broken files; if you
      see a type error, it is yours.
- [ ] Any new SQL migration has already been applied (below)

`npm run lint` does **not** work — there is no `eslint.config.*` in the repo and
`next lint` was removed in Next 16. The build is the only automated gate.

To deploy a preview instead of production, drop the flag:

```bash
npx vercel
```

Preview deploys are only ever manual — the Action always goes to production.

---

## Environment variables in production

Production env vars live in the Vercel project, **not** in the repo. List them:

```bash
npx vercel env ls production
```

### Config vs Secret

Vercel offers two types. The rule is simple:

| Variable | Type | Why |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | **Config** | `NEXT_PUBLIC_*` is inlined into the browser bundle by Next.js. Marking it Secret hides it from *you*, not from the public. |
| `NEXT_PUBLIC_SUPABASE_URL` | **Config** | Same — and it is in every request the browser makes. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Config** | The anon key is designed to be public; Row Level Security is what protects the data (`scripts/002_enable_rls.sql`). |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret** | Bypasses RLS entirely. Never expose, never prefix with `NEXT_PUBLIC_`. |
| `GOOGLE_CLIENT_SECRET` | **Secret** | Real secret. |
| `GOOGLE_CLIENT_ID` | Secret is fine | Not client-side in this app, so it costs nothing to keep it closed. |

Anything named `NEXT_PUBLIC_*` is public by definition — storing it as a Secret
buys no security and only stops you reading the value back.

Secrets cannot be read, only replaced:

```bash
npx vercel env rm NEXT_PUBLIC_SITE_URL production
npx vercel env add NEXT_PUBLIC_SITE_URL production
```

Changing an env var does **not** rebuild the app. Redeploy afterwards.

---

## OAuth redirects

After signing in with Google the app lands on whatever
`NEXT_PUBLIC_SITE_URL` says, via `signInWithGoogle` in
[`lib/actions/auth.ts`](lib/actions/auth.ts). Nothing in the repo hardcodes a
domain.

**These three must agree.** They did not, historically: Supabase was configured
for `betin-app.vercel.app` while everything else moved to `betinapp.vercel.app`.
Because the app's `redirect_to` was not on Supabase's allow-list, Supabase
silently fell back to its own Site URL and sign-in landed on the old host. If a
redirect goes somewhere unexpected, suspect this first.

Check all three:

1. **Vercel** — `NEXT_PUBLIC_SITE_URL` for Production should be
   `https://betinapp.vercel.app`.
2. **Supabase** → Authentication → URL Configuration:
   - *Site URL* = `https://betinapp.vercel.app`
   - *Redirect URLs* must include `https://betinapp.vercel.app/auth/callback`
     and `http://localhost:3000/auth/callback` (local work).
     If the `redirectTo` the app sends is not on this list, Supabase silently
     falls back to *Site URL* — this is the usual cause of a surprise domain.

   When changing these, **add the new redirect URL before** changing Site URL or
   the Vercel value, and leave the old entry in place until the new one is
   verified. Removing both sides at once locks you out of sign-in.
3. **Google Cloud Console** → the OAuth client's *Authorized redirect URIs*
   must include the Supabase callback
   (`https://<project-ref>.supabase.co/auth/v1/callback`).

Redeploy after changing the Vercel value.

---

## Database migrations

Migrations are plain SQL in [`scripts/`](scripts/), numbered and applied **in
numeric order** by hand in the Supabase SQL editor. There is no migration
runner and nothing applies them automatically on deploy.

The latest is `031_create_note_documents.sql`.

Adding one: create `scripts/0NN_short_description.sql`, run it in Supabase,
then deploy the code that depends on it. Apply the migration **first** — the
deployed app will query the new shape immediately.

`prisma/schema.prisma` is a reference document only; the app talks to Supabase
directly and does not use Prisma at runtime.

---

## After deploying

- Load `https://betinapp.vercel.app` and sign in.
- **If you changed anything about the PWA** (`app/manifest.ts`, the icons, or
  the `appleWebApp` / `apple-mobile-web-app-*` metadata in
  [`app/layout.tsx`](app/layout.tsx)): iOS caches install metadata forever.
  Delete the home-screen icon and re-add it, or you will keep seeing the old
  behaviour no matter how many times you deploy.

---

## Rolling back

List recent deployments and promote a known-good one:

```bash
npx vercel ls betinapp
npx vercel promote <deployment-url>
```

---

## Desktop (Electron)

The Electron wrapper is a separate build and is **not** part of the web deploy:

```bash
npm run electron:build:mac
npm run electron:build:win
```

It wraps the live site; deploying the web app updates it without a new binary.
