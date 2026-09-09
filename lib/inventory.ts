/**
 * Inventory types and constants.
 *
 * Plain module, not the actions file: a `"use server"` module may only export
 * async functions (CONVENTIONS §10).
 */

/**
 * Stock is grouped by *what a thing is*, not where it sits.
 *
 * Area grouping was the first instinct and it is wrong for this: the question
 * being answered is "do we need to buy shower gel", asked in a shop in Zagreb,
 * where the bathroom shelf is not a useful heading. Where an item physically
 * lives is still worth knowing when you arrive, so it stays as a free-text
 * field on the item — it just isn't the axis you browse by.
 */
export type InventoryCategory =
  | "kozmetika"
  | "hrana"
  | "pice"
  | "ciscenje"
  | "kucanstvo"
  | "ostalo"

export const INVENTORY_CATEGORIES: { key: InventoryCategory; label: string; hint: string }[] = [
  { key: "kozmetika",  label: "Kozmetika",  hint: "Šamponi, gelovi, maske, sapuni, kreme" },
  { key: "hrana",      label: "Hrana",      hint: "Tjestenina, riža, ulje, konzerve, začini" },
  { key: "pice",       label: "Piće",       hint: "Voda, sokovi, vino, kava, čaj" },
  { key: "ciscenje",   label: "Čišćenje",   hint: "Deterdženti, spužve, krpe, vreće" },
  { key: "kucanstvo",  label: "Kućanstvo",  hint: "Žarulje, baterije, svijeće, papir" },
  { key: "ostalo",     label: "Ostalo",     hint: "Sve što ne spada drugdje" },
]

/**
 * How much is left, eyeballed.
 *
 * Deliberately not a number. You do not count shower gel, you look at the
 * bottle — and a count you cannot be bothered to take accurately is worse than
 * a coarse one you can. `unknown` is the state an item is in after being
 * cloned into a new year but before anyone has looked at it.
 */
export type StockLevel = "full" | "half" | "low" | "out" | "unknown"

export const STOCK_LEVELS: { key: StockLevel; label: string; short: string }[] = [
  { key: "full",    label: "Puno",       short: "Puno" },
  { key: "half",    label: "Pola",       short: "Pola" },
  { key: "low",     label: "Pri kraju",  short: "Pri kraju" },
  { key: "out",     label: "Nema",       short: "Nema" },
  { key: "unknown", label: "Neprovjereno", short: "?" },
]

/** Levels that mean "don't buy this". Drives the shopping view. */
export const STOCKED_LEVELS: StockLevel[] = ["full", "half"]

export interface InventoryPhoto {
  id: string
  year: number
  category: InventoryCategory
  url: string
  thumb_url: string | null
  caption: string | null
  sort_order: number
  created_at: string
}

export interface InventoryItem {
  id: string
  year: number
  category: InventoryCategory
  name: string
  level: StockLevel
  location: string | null
  note: string | null
  sort_order: number
  updated_at: string
}

export interface InventoryYear {
  year: number
  photos: InventoryPhoto[]
  items: InventoryItem[]
}

export function categoryLabel(key: InventoryCategory): string {
  return INVENTORY_CATEGORIES.find(c => c.key === key)?.label ?? key
}

export function levelLabel(key: StockLevel): string {
  return STOCK_LEVELS.find(l => l.key === key)?.label ?? key
}
