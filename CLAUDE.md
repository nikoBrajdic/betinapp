# Betinapp — LLM Context

Household management dashboard for a family vacation property in **Betina, Croatia** (apartment "BE 2"). Built and maintained by Matea. All content is English UI, Croatian receipts.

---

## Deploy

**Git push does NOT trigger Vercel.** The Vercel project (`mateabrajdics-projects/betinapp`) is not connected to the GitHub repo (`nikoBrajdic/betinapp`). Always deploy with:

```bash
npx vercel --prod
```

Live URL: **https://betinapp.vercel.app**

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16, App Router, Server Actions |
| Database | Supabase (PostgreSQL), RLS enabled |
| Auth | Supabase Auth + Google OAuth only, invite-based |
| Styling | Tailwind CSS v4 |
| UI components | shadcn/ui (but **not** for tables — see Design below) |
| Language | TypeScript |
| Desktop | Electron wrapper (separate build, not the web app) |

---

## Project Structure

```
app/
  utilities/          # Bills + meter readings (main financial view)
  guest-stays/        # Guest stays cards
  calendar/           # Events (guest stays auto-create calendar events)
  notes/              # Rich notes
  tasks/              # Kanban tasks
  diary/              # Photo diary
  tables/             # Inventory tables
  admin/manage/       # Superadmin: invite codes, user management
  auth/               # Login / signup / callback

components/
  guest-stay-dialog.tsx   # Create/Edit/Duplicate stays
  bill-dialog.tsx         # Create/Edit bills
  utility-dialog.tsx      # Log meter readings
  sidebar.tsx / top-bar.tsx

lib/actions/             # All server actions (one file per domain)
scripts/                 # Numbered SQL migrations (001–026), run in order
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
| `profiles` | `id, role` | role ∈ admin/superadmin |
| `allowlist` | `email, role` | Controls who can sign up |

Migrations live in `scripts/` — always run them in numeric order. The latest is `026_seed_betina_bills.sql`.

---

## Business Logic

### Bill splitting (utilities-client.tsx)
- **Mama/Vesna** is always present for the **full billing month** (`daysInMonth` days). She is excluded from the guest chip toggles (filter: `!name.includes("vesna")`).
- **Other guests** contribute their actual night-overlap with the billing month. `to_date` is the exclusive checkout date (same convention as the rest of the app).
- Split formula: `person_share = (person_days / total_person_days) * bill_amount`
- Guest chips are toggleable — only included guests affect the split. Chips display day count.
- `due_date` is always the **1st of the billing month** (`YYYY-MM-01`).

### Guest stays
- `from_date` = arrival, `to_date` = departure (exclusive — last night is `to_date - 1`).
- `nights(from, to)` = `(to - from)` in days.
- `status` is auto-computed server-side on create/update.
- Creating/editing/deleting a stay also creates/updates/deletes the linked calendar event.
- **Duplicate stay** opens the dialog with same dates/type/room/notes but empty name.

### Electricity meters
- Two sub-meters: "Struja 1" and "Struja 2". They are grouped under display name "Struja".
- `meterGroupName()` maps "Struja 1"/"Struja 2" → "Struja".
- Readings show combined value + parts breakdown (e.g. "1: 012345 / 2: 067890").
- Water meter ("Voda") uses 5-digit display; electricity uses 6-digit.

---

## Design Conventions

### Tables (bills and readings tabs)
Do **not** use the shadcn `<Table>` component. Use the custom flex-row pattern:

```tsx
<Card className="shadow-none border-2 overflow-hidden">
  {/* Header bar */}
  <div className="flex items-center gap-4 px-4 py-2 bg-gray-50 border-b border-gray-100">
    <div className="w-XX flex-shrink-0 text-xs font-medium text-gray-400 uppercase tracking-wide">Col</div>
    <div className="flex-1 ...">Col</div>
    <div className="w-7 flex-shrink-0" /> {/* action column spacer */}
  </div>
  {/* Rows */}
  <div className="divide-y divide-gray-100">
    {rows.map(row => (
      <div className="flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 group transition-colors">
        {/* ... cells ... */}
        {/* Actions — hidden until hover */}
        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>...</DropdownMenu>
        </div>
      </div>
    ))}
  </div>
</Card>
```

### Action buttons
- Dropdown trigger: `h-7 w-7`, `variant="ghost"`, `text-gray-400 hover:text-gray-700`
- Primary action buttons: colored (`bg-blue-500`, `bg-emerald-500`, `bg-rose-500`)
- Destructive menu items: `text-destructive focus:text-destructive`

### Status colors
- `upcoming` → blue (`border-blue-100`)
- `current` → green (`border-green-200 bg-green-50/30`)
- `past` → gray (`border-gray-100 opacity-75`)
- Unpaid bills → amber (`AlertCircle`)
- Paid bills → green (`CheckCircle2`)

### Year tabs (bills)
Bills are filtered by year. Tabs rendered as `<button>` pills with `bg-blue-500 text-white` active state.

---

## Realtime
`useRealtimeRefresh(["table_name", ...])` in hooks/use-realtime-refresh.ts subscribes to Supabase realtime and calls `router.refresh()` on changes.

---

## Save Indicator
`trackSave(promise)` wraps any server action to show a save indicator. Import from `@/lib/save-events`.

---

## Auth Flow
- Google OAuth only. Users must have a valid invite code to sign up.
- Middleware (`middleware.ts`) protects all routes except `/auth/*`.
- Roles: `superadmin` (full access + admin management) and `admin`.
- Superadmin is set via `scripts/005_create_superadmin.sql`.

---

## Currency
All amounts in **EUR**. `formatMoney(amount)` from `@/lib/currency` formats as `€X.XX`.

---

## Common Tasks

**Add a new bill type to the dropdown** → `components/bill-dialog.tsx`

**Add a migration** → create `scripts/0NN_description.sql`, run in Supabase SQL editor

**Seed bills from PDF receipts** → extract with `python3 + pypdf`, insert into `public.bills`. See `scripts/026_seed_betina_bills.sql` for format.

**Change split logic** → `app/utilities/utilities-client.tsx`, search for `guestDaysMap`

**Change who counts as "Mama"** → filter: `!s.guest_name.toLowerCase().includes("vesna")` in utilities-client.tsx

**Deploy** → `npx vercel --prod` (not git push)
