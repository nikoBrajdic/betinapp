/**
 * Season-closing types and constants.
 *
 * Kept out of `lib/actions/season.ts` because a "use server" module may only
 * export async functions.
 */

export type SeasonUnit = "apartman" | "kuca" | "garsonjera" | "sok_soba"

export const SEASON_UNITS: { key: SeasonUnit; label: string }[] = [
  { key: "apartman", label: "Apartman" },
  { key: "kuca", label: "Kuća" },
  { key: "garsonjera", label: "Garsonjera" },
  { key: "sok_soba", label: "Šok soba" },
]

export interface SeasonTask {
  id: string
  closing_id: string
  area: string
  title: string
  done: boolean
  done_at: string | null
  done_by_name: string | null
  photo_url: string | null
  notes: string | null
  sort_order: number
}

export interface SeasonClosing {
  id: string
  year: number
  unit: SeasonUnit
  closed_at: string | null
  tasks: SeasonTask[]
}

/**
 * The starter list, in the order you physically move through the house.
 * Used for a unit's first closing; after that each year clones the previous
 * one, so edits carry forward instead of being retyped.
 */
export const SEASON_TEMPLATE: { area: string; title: string }[] = [
  { area: "Voda", title: "Zatvoriti glavni ventil" },
  { area: "Voda", title: "Isprazniti bojler" },
  { area: "Voda", title: "Ispustiti vodu iz cijevi" },
  { area: "Voda", title: "Zatvoriti vanjske slavine" },
  { area: "Voda", title: "Očitati vodomjer" },

  { area: "Struja", title: "Očitati brojilo struje" },
  { area: "Struja", title: "Isključiti bojler" },
  { area: "Struja", title: "Isključiti klimu" },
  { area: "Struja", title: "Isključiti osigurače" },

  { area: "Kuhinja", title: "Isprazniti frižider" },
  { area: "Kuhinja", title: "Očistiti i ostaviti frižider otvoren" },
  { area: "Kuhinja", title: "Baciti otvorenu hranu" },
  { area: "Kuhinja", title: "Zatvoriti plin" },

  { area: "Vani", title: "Spremiti jastuke i ležaljke" },
  { area: "Vani", title: "Složiti suncobran" },
  { area: "Vani", title: "Očistiti oluke" },
  { area: "Vani", title: "Spremiti vrtni namještaj" },

  { area: "Sigurnost", title: "Zatvoriti grilje" },
  { area: "Sigurnost", title: "Zaključati sve prozore" },
  { area: "Sigurnost", title: "Provjeriti alarm" },
  { area: "Sigurnost", title: "Ostaviti ključ kod susjede" },
]
