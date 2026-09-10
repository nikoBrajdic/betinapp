export interface Bill {
  id: string
  name: string
  amount: number
  due_date: string
  period_end: string | null
  paid: boolean
  paid_by?: string
  split_between?: string[]
  split_preset?: "default" | "equal" | "weighted"
  split_weights?: Record<string, number>
  category: "utilities" | "rent" | "insurance" | "subscription" | "other"
  recurring: boolean
}

export interface Stay {
  id: string
  guest_name: string
  from_date: string
  to_date: string
}

export interface GuestSummary {
  name: string
  days: number
}

export function dayIndex(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return Date.UTC(year, month - 1, day) / 86400000
}

export function computeBillShares(
  bill: Bill,
  payerName: string,
  payerIncluded: boolean,
  daysInPeriod: number,
  includedGuests: GuestSummary[],
) {
  const guestShares = new Map<string, number>()
  const participantNames = Array.from(new Set([
    ...(payerIncluded ? ["__payer__"] : []),
    ...includedGuests.map(guest => guest.name),
  ]))

  if (participantNames.length === 0) {
    return { payerShare: 0, guestShares }
  }

  if (bill.split_preset === "equal") {
    const equalShare = bill.amount / participantNames.length
    for (const guest of includedGuests) guestShares.set(guest.name, equalShare)
    return { payerShare: payerIncluded ? equalShare : 0, guestShares }
  }

  if (bill.split_preset === "weighted") {
    const weights = bill.split_weights ?? {}
    const participantWeights = participantNames.map(name => {
      const weightKey = name === "__payer__" ? payerName : name
      return {
        name,
        weight: typeof weights[weightKey] === "number" && weights[weightKey] > 0 ? weights[weightKey] : 1,
      }
    })
    const totalWeight = participantWeights.reduce((sum, item) => sum + item.weight, 0)
    if (totalWeight <= 0) {
      return { payerShare: 0, guestShares }
    }
    const payerWeight = participantWeights.find(item => item.name === "__payer__")?.weight ?? 0
    const payerShare = bill.amount * (payerWeight / totalWeight)
    for (const guest of includedGuests) {
      const weight = participantWeights.find(item => item.name === guest.name)?.weight ?? 1
      guestShares.set(guest.name, bill.amount * (weight / totalWeight))
    }
    return { payerShare, guestShares }
  }

  // Default behavior: payer covers full period days, guests cover overlap days.
  const includedGuestDays = includedGuests.reduce((sum, guest) => sum + guest.days, 0)
  const totalPersonDays = (payerIncluded ? daysInPeriod : 0) + includedGuestDays
  if (totalPersonDays <= 0) {
    return { payerShare: 0, guestShares }
  }
  const payerShare = payerIncluded ? bill.amount * (daysInPeriod / totalPersonDays) : 0
  for (const guest of includedGuests) {
    guestShares.set(guest.name, bill.amount * (guest.days / totalPersonDays))
  }
  return { payerShare, guestShares }
}

/** The household name for Vesna on bills — she pays, and is always present. */
export const VESNA = "Vesna"

/**
 * Who appears on a bill, which depends on how it is split.
 *
 * By nights (`default`) — the household utilities Vesna pays: the people are
 * whoever's stay overlapped the month. That is a fact about the month, so it
 * is derived and cannot be typed in. Deselecting greys a chip; it never
 * removes anyone from the row.
 *
 * Fixed shares (`equal` / `weighted`) — the Internet, split three ways between
 * Niko, Matea and Vesna whoever happened to be at the house: the people are
 * chosen, so stays must not add or remove anyone. Anyone who did stay is still
 * listed, so they can be toggled in.
 */
export function billGuests(
  bill: Bill,
  payer: string,
  guestSummaries: GuestSummary[],
  selectedGuestNames: Set<string>,
) {
  const stayed = guestSummaries.filter(guest => guest.name !== payer && guest.days > 0)
  if (bill.split_preset === "default") return stayed

  const daysByName = new Map(guestSummaries.map(guest => [guest.name, guest.days]))
  const names = new Set([
    ...stayed.map(guest => guest.name),
    ...Array.from(selectedGuestNames).filter(name => name !== payer),
  ])
  return Array.from(names)
    .map(name => ({ name, days: daysByName.get(name) ?? 0 }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Who the bill is actually divided between: those present, minus anyone
 * deselected. Membership always comes from the stays, so a name left over in
 * `split_between` from an earlier edit cannot reappear with 0 nights.
 */
export function selectedSplitGuests(
  bill: Bill,
  payer: string,
  guestSummaries: GuestSummary[],
  selectedGuestNames: Set<string>,
) {
  return billGuests(bill, payer, guestSummaries, selectedGuestNames)
    .filter(guest => selectedGuestNames.has(guest.name))
}

/**
 * A bill that has never had its split touched includes everyone who was there.
 * Previously this defaulted to nobody, so untouched bills were split to the
 * payer alone.
 */
export function defaultSplitNames(bill: Bill, payer: string, guestSummaries: GuestSummary[]) {
  return [
    payer,
    ...billGuests(bill, payer, guestSummaries, new Set<string>()).map(guest => guest.name),
  ]
}

/** Count unique nights per named guest; overlapping stay rows aren't extra people. */
export function summarizeGuestsForBillPeriod(stays: Stay[], monthStart: string, _monthEnd: string, monthNextStart: string): GuestSummary[] {
  const intervals = new Map<string, Array<[number, number]>>()
  for (const stay of stays) {
    if (stay.guest_name.toLowerCase().includes("vesna")) continue
    const start = Math.max(dayIndex(monthStart), dayIndex(stay.from_date))
    const end = Math.min(dayIndex(monthNextStart), dayIndex(stay.to_date))
    if (end <= start) continue
    const ranges = intervals.get(stay.guest_name) ?? []
    ranges.push([start, end])
    intervals.set(stay.guest_name, ranges)
  }
  const summaries = Array.from(intervals, ([name, ranges]) => {
    let days = 0
    let previousEnd = -Infinity
    for (const [start, end] of ranges.sort((a, b) => a[0] - b[0])) {
      days += Math.max(0, end - Math.max(start, previousEnd))
      previousEnd = Math.max(previousEnd, end)
    }
    return { name, days }
  })
  summaries.push({ name: VESNA, days: dayIndex(monthNextStart) - dayIndex(monthStart) })
  return summaries.sort((a, b) => a.name.localeCompare(b.name))
}

export function netSettlements(owedPairs: Map<string, number>) {
    // Net each pair off against each other. Vesna pays the utilities and Niko
    // pays the Internet, so without this they show as owing each other at the
    // same time and neither figure is what anyone should actually transfer.
    const netted = new Map<string, number>()
    for (const [pairKey, amount] of owedPairs) {
      const [debtor, creditor] = pairKey.split("::")
      const reverseKey = `${creditor}::${debtor}`
      if (netted.has(reverseKey)) {
        netted.set(reverseKey, (netted.get(reverseKey) ?? 0) - amount)
      } else {
        netted.set(pairKey, (netted.get(pairKey) ?? 0) + amount)
      }
    }

    return Array.from(netted.entries())
      .map(([pairKey, amount]) => {
        const [debtor, creditor] = pairKey.split("::")
        // A negative net means the debt runs the other way.
        return amount >= 0
          ? { debtor, creditor, amount }
          : { debtor: creditor, creditor: debtor, amount: -amount }
      })
      // Under a cent is settled as far as anyone is concerned.
      .filter(row => row.amount >= 0.005)
      .sort((a, b) => b.amount - a.amount)
}
