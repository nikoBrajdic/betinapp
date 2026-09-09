/**
 * Betinapp design tokens.
 *
 * Single source of truth for the two things that were previously copy-pasted
 * across every page: the per-section accent colour and the spacing rhythm.
 *
 * Tailwind v4 scans source files for literal class strings, so every class here
 * is written out in full rather than composed at runtime.
 */

/** Sections that own an accent colour. `brand` is the app navy/blue. */
export type Accent =
  | "brand"
  | "notes"
  | "tasks"
  | "stays"
  | "diary"
  | "readings"
  | "bills"
  | "season"
  | "inventory"
  | "neutral"

interface AccentTokens {
  /** Filled surface — primary buttons, active segmented items, selected chips. */
  solid: string
  /** Tinted surface — badges, status pills, subtle highlights. */
  soft: string
  /** Foreground only — icons, links, emphasised numbers. */
  text: string
  /** Border applied on hover, for cards that lift towards their section colour. */
  hoverBorder: string
  /** Focus ring, matched to the solid surface. */
  ring: string
}

export const accents: Record<Accent, AccentTokens> = {
  brand: {
    solid: "bg-blue-500 text-white hover:bg-blue-600",
    soft: "bg-blue-50 text-blue-700 border-blue-200",
    text: "text-blue-600",
    hoverBorder: "hover:border-blue-200",
    ring: "focus-visible:ring-blue-500/40",
  },
  notes: {
    solid: "bg-indigo-500 text-white hover:bg-indigo-600",
    soft: "bg-indigo-50 text-indigo-700 border-indigo-200",
    text: "text-indigo-600",
    hoverBorder: "hover:border-indigo-200",
    ring: "focus-visible:ring-indigo-500/40",
  },
  tasks: {
    solid: "bg-violet-500 text-white hover:bg-violet-600",
    soft: "bg-violet-50 text-violet-700 border-violet-200",
    text: "text-violet-600",
    hoverBorder: "hover:border-violet-200",
    ring: "focus-visible:ring-violet-500/40",
  },
  stays: {
    solid: "bg-rose-500 text-white hover:bg-rose-600",
    soft: "bg-rose-50 text-rose-700 border-rose-200",
    text: "text-rose-600",
    hoverBorder: "hover:border-rose-200",
    ring: "focus-visible:ring-rose-500/40",
  },
  diary: {
    solid: "bg-amber-600 text-white hover:bg-amber-700",
    soft: "bg-amber-50 text-amber-700 border-amber-200",
    text: "text-amber-600",
    hoverBorder: "hover:border-amber-200",
    ring: "focus-visible:ring-amber-500/40",
  },
  readings: {
    solid: "bg-emerald-600 text-white hover:bg-emerald-700",
    soft: "bg-emerald-50 text-emerald-700 border-emerald-200",
    text: "text-emerald-600",
    hoverBorder: "hover:border-emerald-200",
    ring: "focus-visible:ring-emerald-500/40",
  },
  bills: {
    solid: "bg-blue-500 text-white hover:bg-blue-600",
    soft: "bg-blue-50 text-blue-700 border-blue-200",
    text: "text-blue-600",
    hoverBorder: "hover:border-blue-200",
    ring: "focus-visible:ring-blue-500/40",
  },
  season: {
    solid: "bg-teal-600 text-white hover:bg-teal-700",
    soft: "bg-teal-50 text-teal-700 border-teal-200",
    text: "text-teal-700",
    hoverBorder: "hover:border-teal-200",
    ring: "focus-visible:ring-teal-600/40",
  },
  inventory: {
    solid: "bg-lime-700 text-white hover:bg-lime-800",
    soft: "bg-lime-50 text-lime-700 border-lime-200",
    text: "text-lime-700",
    hoverBorder: "hover:border-lime-200",
    ring: "focus-visible:ring-lime-700/40",
  },
  neutral: {
    solid: "bg-gray-800 text-white hover:bg-gray-900",
    soft: "bg-gray-100 text-gray-700 border-gray-200",
    text: "text-gray-600",
    hoverBorder: "hover:border-gray-300",
    ring: "focus-visible:ring-gray-500/40",
  },
}

export function accent(name: Accent = "brand") {
  return accents[name]
}

/** Route prefix → owning section accent, so shared chrome can colour itself. */
export const accentByRoute: { prefix: string; accent: Accent }[] = [
  { prefix: "/notes", accent: "notes" },
  { prefix: "/tasks", accent: "tasks" },
  { prefix: "/guest-stays", accent: "stays" },
  { prefix: "/diary", accent: "diary" },
  { prefix: "/utilities", accent: "bills" },
  { prefix: "/bills", accent: "bills" },
  { prefix: "/calendar", accent: "brand" },
  { prefix: "/season", accent: "season" },
]

export function accentForPath(pathname: string): Accent {
  return accentByRoute.find(entry => pathname.startsWith(entry.prefix))?.accent ?? "brand"
}

/**
 * Spacing rhythm. Every page body uses `page`; blocks inside a page are
 * separated by `section`; related rows inside a block by `stack`.
 */
export const spacing = {
  // Phones get a tighter gutter: the shell already contributes its own 8px
  // outside the white inset, so p-6 here read as ~32px from the screen edge.
  page: "p-3 md:p-6",
  section: "space-y-4 md:space-y-5",
  stack: "space-y-2",
} as const

/** Radius rhythm — controls are `lg`, containers `xl`, chips `full`. */
export const radius = {
  control: "rounded-lg",
  container: "rounded-xl",
  chip: "rounded-full",
} as const
