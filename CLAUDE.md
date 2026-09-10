# Betinapp — LLM Context

Household management dashboard for a family vacation property in **Betina, Croatia** (apartment "BE 2"). Built and maintained by Matea. English UI (being translated to Croatian), Croatian receipts.

## Read these first

| Doc | When |
|---|---|
| [CONVENTIONS.md](CONVENTIONS.md) | **Before any UI change.** Design tokens, components, contrast rules, editor and data conventions. |
| [PUBLISHING.md](PUBLISHING.md) | Deploying, env vars, OAuth redirects, migrations. |

**Standing instruction — keep CONVENTIONS.md current.** It is part of the change,
not documentation written afterwards. Whenever you change a design token, a
shared component's API, a colour pairing, an animation, the editor model, a
stored-vs-derived data decision, or a working preference, update
CONVENTIONS.md in the *same* change and say that you did. Delete rules that
stopped being true. If a new convention gets decided in conversation, write it
down before moving on. `CONVENTIONS.md §0` lists the exact triggers. The same
applies to PUBLISHING.md when the deploy process or auth config changes.

**Standing instruction — always state the safe way to ship.** Matea will not
remember the branch/preview flow, so do not wait to be asked. Whenever work is
finished, or a deploy/push/publish comes up, say this plainly:

> Work on a branch and push it — you get a preview URL to check. Merge to
> `main` only when it looks right, because `main` publishes immediately.
>
> ```bash
> git checkout -b <name> && git push -u origin <name>
> ```

Never push to `main` or run `npx vercel --prod` unless explicitly told to.

---

## Deploy

**Pushing to `main` deploys to production.** `.github/workflows/vercel-deploy.yml` runs `vercel deploy --prod` on every push to `main` — there is no staging step and no approval gate, so treat `git push` as publishing. Work on a branch if a change isn't ready to go live.

Manual deploy (also production, and it uploads your working tree, committed or not):

```bash
npx vercel --prod
```

The GitHub Action supplies branch previews using the CLI, independently of Vercel Git integration. Preview URLs appear in the Actions run summary.

Live URL: **https://betinapp.vercel.app** (`betin-app.vercel.app` is an alias of the same deployment).

Full workflow, including env vars and the OAuth redirect settings: [PUBLISHING.md](PUBLISHING.md).

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16, App Router, Server Actions |
| Database | Supabase (PostgreSQL), RLS enabled |
| Auth | Supabase Auth + Google OAuth with allowlist + approved profile |
| Styling | Tailwind CSS v4 |
| UI components | shadcn/ui (but **not** for tables — see Design below) |
| Language | TypeScript |
| Desktop | Electron wrapper (separate build, not the web app) |

---

## Project Structure

```
app/
  utilities/          # Bills + meter readings (main financial view)
  guest-stays/        # Guest stays cards + the calendar tab (StaysShell)
  calendar/           # Redirect only — the calendar is a tab inside guest-stays
  notes/              # Rich notes
  tasks/              # Kanban tasks
  diary/              # Photo diary
  tables/             # Inventory tables
  inventory/          # End-of-season stock: shelf photos + optional named items
  admin/manage/       # Superadmin: invite codes, user management
  auth/               # Login / signup / callback

components/
  guest-stay-dialog.tsx   # Create/Edit/Duplicate stays
  bill-dialog.tsx         # Create/Edit bills
  utility-dialog.tsx      # Log meter readings
  sidebar.tsx / top-bar.tsx

lib/actions/             # All server actions (one file per domain)
scripts/                 # Historical SQL + forward migrations; see PUBLISHING.md
prisma/schema.prisma     # Reference schema — app uses Supabase directly, not Prisma ORM
```

---

## Database Tables (Supabase/PostgreSQL)

All IDs are `uuid`, auth uses `auth.users`.

| Table | Key columns | Notes |
|---|---|---|
| `bills` | `name, amount, due_date, paid, category, recurring` | `category` ∈ utilities/rent/insurance/subscription/other |
| `guest_stays` | `guest_name, from_date, to_date, status, type, notes, event_id` | `type` ∈ family/friend; `status` auto-computed from dates |
| `events` | `title, start_date, end_date, category` | Guest stays create a linked event; deleting a stay deletes its event |
| `utility_readings` | `type, value, max_value, date` | `type` is the meter name, e.g. "Struja 1", "Struja 2", "Voda" |
| `utilities` | `name, current_usage, max_usage, cost, unit, trend` | Synced from latest readings; electricity split across "Struja 1"/"Struja 2" |
| `notes` | `title, content, color, author_id` | |
| `tasks` | `title, completed, task_group_id` | |
| `inventory_photos` | `year, category, url, thumb_url, caption` | Shelf shots — the primary record |
| `inventory_items` | `year, category, name, level, location, note` | Optional named index over the photos |
| `profiles` | `id, role` | role ∈ admin/superadmin |
| `allowlist` | `email, role` | Controls who can sign up |

Migrations live in `scripts/`. Apply only reviewed pending files, by hand, in the Supabase SQL editor; never replay the historical directory against existing data. This branch adds `036_household_access.sql` and `037_atomic_season_lists.sql`; see PUBLISHING.md for rollout and applied-state verification.

---

## Business Logic

### Bill splitting (`lib/bill-splitting.ts`)
- **Vesna** (previously written as "Mama") is always present for the **full billing month** (`daysInMonth` days), whether or not a stay was recorded for her, and whether or not she is the payer. Her own stay rows are ignored (filter: `!name.includes("vesna")`) and she is added to the summaries with the full month instead — otherwise a bill someone else paid drops her from the split entirely.
- **Other guests** contribute their actual night-overlap with the billing month. `to_date` is the exclusive checkout date (same convention as the rest of the app).
- Split formula: `person_share = (person_days / total_person_days) * bill_amount`
- **Two kinds of bill.** `split_preset: "default"` divides by nights — the utilities Vesna pays, where who took part is derived from the stays. `split_preset: "equal"` divides evenly between a chosen set regardless of stays — the Internet, always three ways between Niko, Matea and Vesna. Stays must never add or remove anyone from an `equal` bill.
- **The chips are everyone whose stay overlapped the billing month** — derived from stays, never from stored selection. Someone with no nights that month never appears; someone with nights always does.
- Chips are toggleable to exclude a person from the split. Deselecting greys the chip, it does not remove them from the row.
- **The payer's chip is always shown and always toggleable**, whether or not they stayed — whoever fronted the money can be counted in or left out. It renders a rung darker (`blue-700`) than a guest's so "who paid" reads apart from "who shared it". When included, the payer counts for the full billing month.
- A bill whose `split_between` has never been set defaults to **everyone present**, not to nobody.
- `due_date` is always the **1st of the billing month** (`YYYY-MM-01`).
- **Settle up nets each pair off.** Vesna pays the utilities and Niko pays the Internet, so both directions exist; showing them unnetted meant two people appeared to owe each other at once and neither figure was transferable. It lives in the Bills tab, since it is about bills.
- Bills list **newest month first, then alphabetically by name** within a month. Sorting on the date alone leaves same-month bills in database order, which changes between months.

### Guest stays
- `from_date` = arrival, `to_date` = departure (exclusive — last night is `to_date - 1`).
- `nights(from, to)` = `(to - from)` in days.
- `status` is derived on read in `getGuestStays` (also written on create/update for compatibility).
- Creating/editing/deleting a stay also creates/updates/deletes the linked calendar event.
- **Duplicate stay** opens the dialog with same dates/type/room/notes but empty name.

### Electricity meters
- Two sub-meters: "Struja 1" and "Struja 2". They are grouped under display name "Struja".
- `meterGroupName()` maps "Struja 1"/"Struja 2" → "Struja".
- Readings show combined value + parts breakdown (e.g. "1: 012345 / 2: 067890").
- Water meter ("Voda") uses 5-digit display; electricity uses 6-digit.

---

## Design Conventions

Moved to **[CONVENTIONS.md](CONVENTIONS.md)** so there is one source of truth:
design tokens and section accents, the shared components (`PageShell`,
`Segmented`, `Pill`, `EmptyState`, `FileTypePill`, `EditorHeader`), the custom
flex-row table pattern, contrast rules, animation, mobile/PWA behaviour, and
the editor and data conventions.

Read it before changing any UI.

---

## Realtime
`useRealtimeRefresh(["table_name", ...])` in hooks/use-realtime-refresh.ts subscribes to Supabase realtime and calls `router.refresh()` on changes.

---

## Save Indicator
`trackSave(promise)` wraps any server action to show a save indicator. Import from `@/lib/save-events`.

---

## Auth Flow
- Google OAuth only. Users need an allowlisted Auth email plus an approved profile. New join requests require approval before `complete_household_signup` creates a profile.
- Route protection lives in `proxy.ts` (there is no `middleware.ts`); it checks membership on protected routes; OAuth callback/signup routes, the manifest, service worker and static assets have separate handling.
- All new approved family members receive `superadmin` access. `admin` remains a legacy role. Invite-code onboarding is legacy.

---

## Currency
All amounts in **EUR**. `formatMoney(amount)` from `@/lib/currency` formats as `€X.XX`.

---

## Common Tasks

**Add a new bill type to the dropdown** → `components/bill-dialog.tsx`

**Add a migration** → create a forward `scripts/0NN_description.sql`, test it on a disposable database, then follow PUBLISHING.md for the coordinated database/code rollout

**Seed bills from PDF receipts** → extract with `python3 + pypdf`, insert into `public.bills`. See `scripts/026_seed_betina_bills.sql` for format.

**Change split logic** → `lib/bill-splitting.ts`; run `npm test`

**Change who counts as the household payer** → the `VESNA` constant and the `!s.guest_name.toLowerCase().includes("vesna")` filter in `lib/bill-splitting.ts`

**Change inventory categories or stock levels** → `lib/inventory.ts` (and the
`check` constraints in `scripts/034_create_inventory.sql`)

**Deploy** → branch push → preview → merge to `main`; see PUBLISHING.md. Never publish without explicit authorization.
