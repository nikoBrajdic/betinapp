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
| `inventory` | lime | stock left at the end of a season |
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
| Overflow | Anything wider than a phone — a table, a long tab strip — scrolls **inside its own `overflow-x-auto` container**. The page body must never move sideways. Don't reach for `overflow-x-hidden` on a page wrapper: it forces `overflow-y` to compute as `auto`, making every page a scroll container. |
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
| [`compressImage`](lib/image-upload.ts) | **Every** image upload. Never hand-roll a canvas resize. |
| [`useNavigate`](lib/navigation.ts) | **Every** tap that opens a page. Never call `router.push` directly for a user action. |
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

Three accents were deliberately darkened because the light shade with white
text failed: `diary` uses `amber-600`, `readings` uses `emerald-600`, and
`inventory` uses `lime-**700**` — `lime-600` measures only 3.09:1 on white,
which technically clears the 3:1 bar for a filled control and is far too thin
to trust. Don't "restore" any of them to a lighter shade.

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

## 6b. Images — one pipeline, and it is WebP

Every upload goes through [`compressImage`](lib/image-upload.ts). It was
copy-pasted into four files, each hardcoding JPEG and a `.jpg` path, while
season uploaded phone originals untouched.

- **Never assume the output format.** `canvas.toBlob` is specified to silently
  substitute **PNG** when it cannot encode the type you asked for — and a PNG
  of a photo is *larger* than the JPEG it replaced. The helper encodes WebP,
  checks `blob.type`, and re-encodes JPEG if it did not get WebP.
- **Take the extension and `contentType` from the returned blob**, via
  `extensionFor(blob)` and `blob.type`. The browser decides the format, not you.
- **Size to the job.** Notes and diary keep 1000x760 — those are photos you
  look at. Inventory shelf shots are 1600px because you have to *read* a label
  off them, plus a 400px thumbnail so a category strip does not pull a dozen
  full-size images.
- EXIF rotation is applied at decode via `createImageBitmap(file,
  { imageOrientation: "from-image" })`. Phone photos arrive rotated by metadata.
- Existing stored images are still JPEG. Their URLs are baked into note and
  diary blocks, so a backfill means rewriting those URLs — not a drive-by.

---

## 6c. Navigation — a tap must visibly do something

The only `loading.tsx` is at the root, and a navigation that keeps a shared
parent (`/diary` → `/diary/[id]`) never reaches it: the old page just sat there
until the new one was ready, which read as a dead tap.

- **Taps go through `useNavigate().navigate(href)`**, not `router.push`. It
  wraps the push in a transition, so "pending" lasts until the new page has
  rendered, and reports it to one app-wide flag.
- **Every `<Link>` contains `<LinkPendingReporter />`** (sidebar, dashboard
  cards), which does the same for Link taps via `useLinkStatus`.
- **The top bar shows a spinner beside the title** while anything is pending,
  held back 150ms so an instant (prefetched) page doesn't flash it.
- **Lists prefetch what they show.** `usePrefetch(hrefs)` warms the first 12
  on render, and cards call `prefetch(href)` on pointer-enter. It must be a
  *full* prefetch: Next 16's `router.prefetch()` defaults to `"auto"`, which for
  a dynamic page without its own `loading.tsx` fetches almost nothing.
  Prefetching does nothing in `next dev`, so judge speed on a preview.
- `router.push` is still fine for non-user redirects (auth flows) and
  `router.refresh()` is unaffected.

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
- **The shell is `fixed inset-0`, not `h-dvh`.** In iOS standalone with the
  `black-translucent` status bar, `100dvh` comes out shorter than the physical
  screen, and the white body showed as a strip along the bottom. Pinning all
  four edges covers the whole screen; the safe-area padding keeps content off
  the home indicator.
- **`html` and `body` are navy (`#1a1464`), never white.** They show through
  wherever the shell doesn't reach — rubber-band overscroll included. White
  surfaces (the content inset, dialogs) paint their own background.
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
- **The primary action lives in the top bar**, on the blue frame, not inside
  the white panel. A page whose action depends on internal state relabels it by
  dispatching `topbar:action` with the label (Utilities does this for Readings
  vs Bills); the button reports back with `topbar:new`, which the page listens
  for. The override resets on navigation so a label cannot leak between pages.
- **The dashboard mirrors the sidebar.** Every nav item except Dashboard and
  Settings has a card, using the same icon. Add a nav item, add a card. A card
  may also deep-link to a *tab* that has no nav entry of its own — Calendar
  does, pointing at `/guest-stays?view=calendar` — because the glanceable
  number is still worth a card even when the view is not worth a sidebar row.
- **Stays and Calendar are one section, two tabs.** A stay already creates a
  linked event, so the calendar was largely a second rendering of data Stays
  owns. `StaysShell` holds the tab strip and the `PageShell` — the calendar
  grid needs `fill` and the list does not, and leaving one in each client
  nested them and doubled the padding. Only the active tab is mounted, because
  both register a `topbar:new` listener and two would race. The tab lives in
  the URL (`?view=calendar`) so it can be linked to; `/calendar` is a redirect
  kept for old bookmarks.
- **Chrome that keys off the route must key off the tab too.** `EventsPanel`
  checks `searchParams.get("view")`, not just the pathname, and server actions
  touching events `revalidatePath("/guest-stays")` — the path the calendar
  actually renders on now.
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
- **Inventory is grouped by what a thing *is*, never by where it sits.**
  The question it answers — "do we already have shower gel?" — gets asked in a
  shop, where "bathroom shelf" is not a useful heading. An item's `location` is
  still stored, because finding it matters once you arrive; it just is not the
  browsing axis. Categories live in `lib/inventory.ts`.
- **Stock level is a coarse enum, not a count** (`full`/`half`/`low`/`out`/
  `unknown`). You eyeball a bottle, you do not measure it, and a count nobody
  takes accurately is worse than a coarse one they will. `unknown` is the state
  after a year is cloned forward but before anyone has looked.
- **Inventory clones forward like season closings** — item names carry over
  with levels reset to `unknown`. Photos deliberately do *not*: last year's
  shelf is not this year's shelf, and a stale photo shown as current is worse
  than no photo.
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
