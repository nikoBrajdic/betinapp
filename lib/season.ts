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
 * The starter list per unit, in the order you physically move through the
 * place. Used for a unit's first closing only; after that each year clones the
 * previous one, so edits carry forward instead of being retyped.
 */
export const SEASON_TEMPLATE: Record<SeasonUnit, { area: string; title: string }[]> = {
  kuca: [
    { area: "Tuš kabina", title: "Sve šampone i bočice prebaciti u kupaonu (i gumice za kosu, četke, sapune)" },
    { area: "Tuš kabina", title: "Ogledalo prebaciti u kupaonu" },
    { area: "Tuš kabina", title: "Crni škaf staviti na bok iza kuće" },
    { area: "Tuš kabina", title: "Isto tako i sve kante i škafove" },
    { area: "Tuš kabina", title: "Vrata od tuš kabine učvrstiti u otvorenom položaju" },
    { area: "Tuš kabina", title: "Metle staviti na ulaz u šok sobu" },

    { area: "Iza kuće", title: "Električne roštilje u špajzu" },
    { area: "Iza kuće", title: "Crna kutija / spremište sa jastucima spremiti u garsonjeru (ili iza kuće)" },
    { area: "Iza kuće", title: "Crvene metalne stolce spremiti u špajzu (iza kuće ako se vraća uskoro)" },
    { area: "Iza kuće", title: "Stolove okrenuti na bok i ostaviti iza kuće — dva crvena i bijeli plastični" },
    { area: "Iza kuće", title: "Vazu i umjetno cvijeće unijeti u kuću" },

    { area: "Ispred kuće", title: "Crne metalne mrežaste stolce spremiti u garažu" },
    { area: "Ispred kuće", title: "Crne klupe zadnje unijeti u kuću" },
    { area: "Ispred kuće", title: "Veliki metalni stol unijeti u kuću" },

    { area: "Bočno", title: "Ležaljke prebaciti u garažu / garsonjeru" },
    { area: "Bočno", title: "Bijeli stol za pranje suđa staviti preokrenut iza kuće" },

    { area: "Kante za smeće", title: "Odnijeti u garažu ili iza kuće" },

    { area: "Kuća", title: "Frižider i frizer očistiti i ostaviti poluotvoren (na vrata staviti krpu da se ne zatvore)" },
    { area: "Kuća", title: "Zelene prozore / letvice / šalaporke zarolati da su potpuno zatvorene, isto tako i na vratima" },
    { area: "Kuća", title: "Prozore sve zatvoriti" },
    { area: "Kuća", title: "Unutarnjim prozorima premazati/našpricati gume najobičnijim silikonom za brtve i nakon toga zatvoriti" },
    { area: "Kuća", title: "Podignuti zavjesu u tušu da se sve osuši" },
    { area: "Kuća", title: "NE OSTAVITI DASKE OD WC-a SPUŠTENE! Spuštena daska se upljesnivi" },

    { area: "Struja", title: "Fotografirati ili prepisati stanje brojila, poslati na Wapp Serious Svetoivanska" },
    { area: "Struja", title: "Isključiti frižider iz struje" },
    { area: "Struja", title: "Isključiti bojler iz struje" },
    { area: "Struja", title: "Isključiti napu iz struje" },
    { area: "Struja", title: "Isključiti kuhalo za vodu iz struje" },
    { area: "Struja", title: "Isključiti produžni (mikrovalna…)" },
    { area: "Struja", title: "Isključiti internet (produžni)" },

    { area: "Voda", title: "Fotografirati ili prepisati stanje brojila, poslati na Wapp Serious Svetoivanska" },

    { area: "Plin", title: "Zatvoriti ventil na boci od plina" },

    { area: "Ulazna vrata", title: "Našpricati bravu s WD40 (imati WD40 sa sobom prilikom dolaska)" },
  ],

  apartman: [
    { area: "Apartman", title: "Zelene prozore / letvice / šalaporke zarolati da su potpuno zatvorene, isto tako i na vratima" },
    { area: "Apartman", title: "Zbog vlage eventualno ostaviti prozor u kupaonici na kip i prozor u boravku da cirkulira zrak" },
    { area: "Apartman", title: "Frižider očistiti i ostaviti poluotvoren (podložiti vrata nekom kutijom da se ne zatvore)" },

    { area: "Struja", title: "FOTKATI BROJILO, stanje poslati na Wapp Serious Svetoivanska" },
    { area: "Struja", title: "Ugasiti struju — okrenuti ručkicu za struju" },
  ],

  garsonjera: [
    { area: "Garsonjera", title: "Isključiti veš mašinu iz struje, zatvoriti dotok vode, vrata od bubnja ostaviti otvorena" },
    { area: "Garsonjera", title: "Provjeriti da ne teče voda iz kotlića" },
    { area: "Garsonjera", title: "Zatvoriti prozore; ako se zatvara za zimu, izvana staviti šarapolke" },

    { area: "Plin", title: "Zatvoriti ventil na boci od plina" },
  ],

  sok_soba: [
    { area: "Šok soba", title: "Frižider i frizer očistiti i ostaviti poluotvoren (na vrata staviti krpu da se ne zatvore)" },
    { area: "Šok soba", title: "Prozor provjeriti je li zatvoren" },
  ],
}
