# Betinapp — conventions and design system

Read this before changing UI. It records decisions that are already made, so
you don't have to re-derive them (or accidentally undo them).

If you are an LLM working in this repo: these rules override your defaults.
When something here conflicts with a habit you have, follow this file.

---

## 0. Keeping this file current

**This file is part of the change, not documentation written afterwards.**

A convention that lives only in someone's head — or only in a conversation that
has scrolled away — is how this app ended up with nine versions of the same
button. If you change how something is done, update this file *in the same
change*, before you call the work finished.

Concretely, these edits require a matching edit here:

| If you change… | Update |
|---|---|
| `lib/design.ts` — accents, spacing, radius, dialog or icon scales | §2 Design tokens |
| A component in `components/ui/` (added, removed, or its API changed) | §3 Components table |
| A colour pairing, or any `-500`/`-600` shade decision | §5 Contrast — record the ratio you measured |
| Animation curve or duration | §7 Animation |
| Mobile nav, drawer, safe-area or PWA metadata behaviour | §8 Mobile and PWA |
| Editor block model, slash commands, image layout | §9 Editors |
| A stored-vs-derived decision, or a date/splitting rule | §10 Data conventions |
| How Matea wants work done | §12 Working preferences |

Also:

- **Delete rules that stopped being true.** A stale rule is worse than none —
  someone will follow it. Don't leave "we used to…" notes.
- **Record the reasoning, briefly.** "`diary` is `amber-600` because `amber-500`
  on white measured 2.15:1" stops the next person from helpfully reverting it.
- **When a new convention is decided in conversation, write it down here before
  moving on.** If it was worth deciding, it's worth one line.
- **If you notice this file is already wrong, fix it** — even when that wasn't
  the task. Say what you corrected.

Same rule applies to [PUBLISHING.md](PUBLISHING.md) when the deploy process,
env vars, or auth redirects change.

---

## 1. The one rule that matters most

**Don't invent a new pattern when one exists.** Almost every visual decision in
this app has already been made once and put in a component. Reach for the
component. If you find yourself writing `bg-blue-500 hover:bg-blue-600` or
`px-2 py-0.5 rounded-full` by hand, stop — there is a component for that.

This app was cleaned up specifically because those patterns had been
copy-pasted into nine slightly different versions.

---

## 2. Design tokens

Everything colour- and spacing-related lives in
[`lib/design.ts`](lib/design.ts). Never hardcode an accent colour.

### Section accents

Each section owns a colour. Components take `accent="notes"`, not a class.

| Accent | Colour | Used by |
|---|---|---|
| `brand` / `bills` | blue | app default, utilities bills, calendar |
| `readings` | emerald | meter readings |
| `notes` | indigo | notes and documents |
| `tasks` | violet | household checklist |
| `stays` | rose | guest stays |
| `diary` | amber | photo diary |
| `season` | teal | end-of-season closing lists |
| `neutral` | gray | anything unsectioned |

Each accent provides four roles:

- `solid` — filled surfaces (primary buttons, active tabs, selected chips)
- `soft` — tinted surfaces (badges, status pills)
- `text` — foreground only (icons, emphasised numbers)
- `ring` — matching focus ring

### Scales

| Scale | Values |
|---|---|
| Page padding | `p-3 md:p-6`, via `<PageShell>` — never set page padding by hand |
| Radius | controls `rounded-lg` · containers `rounded-xl` · chips `rounded-full` |
| Border | **1px everywhere** — `border`, never `border-2`, on any card, panel or table. Heavier weights are reserved for things that are not surfaces: a checkbox, the ring cutting the online dot out of the navy, a spinner stroke, a drag-and-drop overlay. |
| Dialog width | `size="sm"` 380 · `"md"` 460 · `"lg"` 560 · `"xl"` 780 |
| Icon buttons | `icon-xs` 28 · `icon-sm` 32 · `icon` 36 |

---

## 3. Components — use these, don't rebuild them

| Component | For |
|---|---|
| [`PageShell`](components/ui/page-shell.tsx) | Every page body. Owns padding and rhythm. |
| [`Segmented`](components/ui/segmented.tsx) | Pick-one switches: Readings/Bills, Cards/Table, grid/list, tabs inside a dialog. |
| [`Pill`](components/ui/pill.tsx) | Filters and labels. States: `on`, `off`, `fixed`, `count`. `PersonPill` is the named wrapper for people. |
| [`EmptyState`](components/ui/empty-state.tsx) | "Nothing here yet", with an accent CTA. |
| [`FileTypePill`](components/ui/file-type-pill.tsx) | Document type badges, and `fileType="note"` for notes. |
| [`EditorHeader`](components/editor-header.tsx) | Sticky back bar for full-page editors. |
| [`SlashMenu`](components/editor-slash-menu.tsx) | The `/` command palette. |
| [`Button`](components/ui/button.tsx) | All buttons. `accent` for the one primary action; `variant="subtle" size="icon-xs"` for row `⋯` menus. |

### Segmented vs Pill — they mean different things

- **Segmented** = "pick exactly one of these views". It is a *switch*.
- **Pill** = "filter" or "label". Multiple can be on; none can be on.
- **Neither is navigation.** Going somewhere is a link or the sidebar. Never
  style navigation as pills.

---

## 4. Tables

Do **not** use the shadcn `<Table>` component for bills, readings, stays or
documents. Use the custom flex-row pattern — header bar, `divide-y` rows,
hover-revealed actions:

```tsx
<Card className="shadow-none border-2 overflow-hidden">
  <div className="flex items-center gap-4 px-4 py-2 bg-gray-50 border-b border-gray-100">
    <div className="w-XX flex-shrink-0 text-xs font-medium text-gray-400 uppercase tracking-wide">Col</div>
    <div className="flex-1 …">Col</div>
    <div className="w-7 flex-shrink-0" />   {/* action column spacer */}
  </div>
  <div className="divide-y divide-gray-100">
    {rows.map(row => (
      <div className="flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 group transition-colors">
        {/* cells */}
        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>…</DropdownMenu>
        </div>
      </div>
    ))}
  </div>
</Card>
```

Rows that represent an editable record should open the edit dialog on click.
The `⋯` trigger and its menu must `stopPropagation` so they don't also fire it.

---

## 5. Contrast — non-negotiable

Solid accents carry `text-white`; soft accents carry their own dark
`text-<c>-700`. **Because both colours come from the same token, white-on-pale
is impossible.** Never split them by hand.

Two accents were deliberately darkened because `-500` with white text failed:
`diary` uses `amber-600` and `readings` uses `emerald-600`. Don't "restore"
them to 500.

Deselected pills are `text-gray-500`, not `gray-400` — a filter you can't read
is a broken control.

If you introduce a new colour pairing, compute its contrast ratio first.
Filled controls should clear ~3:1; text on tinted grounds should clear 4.5:1.

Known outstanding: general muted text is `gray-400` on white (2.54:1). It's a
deliberate de-emphasis used app-wide; changing it is a whole-app decision, not
a drive-by.

---

## 5b. The build is the gate

`next.config.mjs` no longer sets `typescript.ignoreBuildErrors`, so
**type errors fail the build** — and since a push to `main` deploys straight to
production, that build is the only thing standing between a mistake and the
live app. Don't re-add the escape hatch to get a change out; fix the type.

`npm run lint` is not wired up (no `eslint.config.*`, and `next lint` is gone in
Next 16). If you want linting, that is a real setup task, not a one-liner.

---

## 6. Things that are already handled — don't re-add them

- **`cursor-pointer`** — `globals.css` sets it for `button`, `a` and
  `[role="button"]`. Only add it on a clickable `div`.
- **`transition-all`** — never. Name the properties
  (`transition-colors`, `transition-[width]`). `transition-all` animates
  padding and layout and causes jank.
- **Class ordering** — `cn()` uses `tailwind-merge`, so a later class beats an
  earlier one deterministically. Put overrides last.
- **Specificity in hand-written CSS** — a rule like `.seg button { background: transparent }`
  (0,1,1) silently beats a utility class (0,1,0). This exact bug once produced
  white text on a pale track. Prefer utilities; if you must write CSS, check
  what it outranks.

---

## 7. Animation

One curve for navigation motion: `cubic-bezier(.32,.72,0,1)` (the iOS sheet
curve). Sidebar collapse and the mobile drawer both use it, so they feel
related.

- Animate transforms and single properties, not `all`.
- Don't conditionally unmount things that should animate away — keep them
  mounted and fade/collapse, or they pop.
- Everything respects `motion-reduce:`.

---

## 8. Mobile and PWA

- The mobile nav is a **drawer**: `fixed` + `translate-x`, sliding *over* the
  page with a scrim. It must never push content sideways.
- One icon, one meaning: ☰ `Menu` toggles the nav (desktop collapse and mobile
  open); ✕ closes the mobile overlay.
- Top-level sections are siblings reached from the drawer, so they have **no
  back button**. Detail pages (a note, a diary entry) are a stack and use
  `EditorHeader`.
- The shell pads itself with `env(safe-area-inset-*)` — required in standalone
  mode where there is no browser chrome.
- iOS standalone needs `apple-mobile-web-app-capable` explicitly; Next only
  emits `mobile-web-app-capable`, which iOS ignores. Don't remove it.

---

## 9. Editors (notes and diary)

- **Always editable.** There is no read/edit mode toggle — that's how current
  editors work.
- **`/` opens the command palette** on an empty text block. Croatian keywords
  work too (`/naslov`, `/tekst`, `/slika`).
- **One image = one block.** Consecutive image blocks lay out as a row that
  wraps at three; `breakBefore` forces a new row. The logic is in
  [`lib/image-rows.ts`](lib/image-rows.ts) — use `normalizeBlocks` on load,
  `layoutBlocks` to render.
- Dragging an image's grip reorders it; clicking the image opens the lightbox.
  Keep those two gestures separate.
- **The dashboard mirrors the sidebar.** Every nav item except Dashboard and
  Settings has a card, using the same icon. Add a nav item, add a card.
- **The End of season list is read-only until unlocked** (the padlock beside the
  progress ring). Locked is the working state — you tick things while closing
  the house; unlocking is for reworking the list itself. Once unlocked, Enter
  splits a row at the caret, which makes "add a row" and "break this line in
  two" the same gesture, and Backspace at position 0 merges upward.
- **Typing never waits on the network.** While the list is unlocked it lives
  in local state; Done writes the whole shape back through `saveSeasonTasks`.
  An earlier version awaited a server round trip per keystroke and the new row
  appeared seconds later, which read as broken. If an interaction happens while
  a caret is in a field, do it locally and reconcile afterwards.

---

## 10. Data conventions

- **`to_date` is exclusive.** The last night of a stay is `to_date - 1`.
  `nights(from, to) = to - from`.
- **Derive time-dependent state, don't store it.** Stay `status` is computed on
  read in `getGuestStays`, because a stored value goes stale the moment the
  date passes. Same reasoning applies to anything else that depends on "today".
- **Bill splitting**: Mama/Vesna is present for the full billing month and is
  excluded from the guest chips. Other guests contribute their night overlap.
  `share = (person_days / total_person_days) × amount`.
- **Season closings clone forward.** One list per unit per year
  (`apartman`, `kuca`, `garsonjera`, `sok_soba`). Starting a year copies the
  previous year's items for that unit, unchecked, so edits accumulate instead
  of being retyped. `SEASON_TEMPLATE` in `lib/season.ts` is keyed by unit —
  closing the house is nothing like closing the šok soba — and is only used
  for a unit's very first list.
- **`"use server"` modules may only export async functions.** Constants, types
  and templates live in a plain module next to the actions
  (`lib/season.ts` beside `lib/actions/season.ts`). Exporting an array from an
  actions file fails the build at page-data collection, not at typecheck.
- All money is EUR via `formatMoney` from `@/lib/currency`.
- Wrap server actions in `trackSave()` to drive the save indicator.
- `useRealtimeRefresh([...tables])` subscribes to Supabase realtime.

---

## 11. Language

The app is being translated incrementally. Use `useT()` and add keys to
[`lib/translations.ts`](lib/translations.ts) in **both** `en` and `hr`. Don't
add new hardcoded English strings to already-translated areas (sidebar, diary,
settings).

---

## 12. Working preferences

- **Nothing deploys without being asked.** Pushing to `main` publishes
  immediately, so "don't deploy" also means "don't push to `main`".
- **Always remind Matea of the branch → preview → merge flow**, unprompted,
  whenever work wraps up or shipping comes up. She has said she will forget it.
  Don't assume it's obvious because it was mentioned earlier in the session.
- Prefer fixing the model over patching the symptom. The image workflow got
  simpler by changing the data shape, not by adding controls.
- When a design decision has a real trade-off, say so and give a
  recommendation — don't silently pick and don't present five options.
- Migrations are applied by hand before the code that needs them ships.
