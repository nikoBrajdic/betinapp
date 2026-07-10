"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Droplets,
  Edit,
  Filter,
  MoreHorizontal,
  Plus,
  Trash2,
  Wifi,
  X,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

import { Tabs, TabsContent } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog"
import { BillDialog } from "@/components/bill-dialog"
import { UtilityDialog } from "@/components/utility-dialog"
import { deleteBill, createBill, updateBill } from "@/lib/actions/bills"
import { createDefaultReadingUtilities, createUtilityReading, deleteUtilityReading, updateUtilityReading } from "@/lib/actions/utilities"
import { trackSave } from "@/lib/save-events"
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh"
import { cn } from "@/lib/utils"
import { formatMoney } from "@/lib/currency"

interface Utility {
  id: string
  name: string
  current_usage: number
  max_usage: number
  cost: number
  unit: string
  trend: "up" | "down" | "stable"
  updated_at?: string
}

interface UtilityReading {
  id: string
  type: string
  value: number
  max_value: number
  date: string
}

interface Bill {
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

interface Stay {
  id: string
  guest_name: string
  from_date: string
  to_date: string
}

interface UtilitiesClientProps {
  utilities: Utility[]
  readings: UtilityReading[]
  bills: Bill[]
  stays: Stay[]
}

interface ReadingRow {
  id: string
  name: string
  value: number
  displayValue: string
  unit: string
  date: string
  utility: Utility | null
  readingIds: string[]
  parts?: Array<{ id: string; label: string; value: number }>
  previousDate?: string
  currentDate?: string
}

interface GuestSummary {
  name: string
  days: number
}

type OwedView = "by" | "to"

function utilityIcon(name: string) {
  const key = name.toLowerCase()
  if (key.includes("water") || key.includes("voda")) return Droplets
  if (key.includes("internet")) return Wifi
  return Zap
}

function meterGroupName(name: string) {
  return name.toLowerCase().startsWith("struja ") ? "Struja" : name
}

function electricityPart(name: string) {
  const match = name.match(/struja\s*(\d+)/i)
  return match?.[1]
}

function isWaterMeter(name: string) {
  const key = name.toLowerCase()
  return key.includes("water") || key.includes("voda")
}

function isCounterMeter(name: string) {
  const key = name.toLowerCase()
  return isWaterMeter(name) || key.includes("struja")
}

function counterDigits(name: string) {
  return isWaterMeter(name) ? 5 : 6
}

function formatReadingValue(name: string, value: number) {
  const normalized = String(Math.trunc(value))
  return isCounterMeter(name) ? normalized.padStart(counterDigits(name), "0") : normalized
}

function shortDate(value: string | Date) {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function dateOnly(value: string) {
  return new Date(value).toISOString().split("T")[0]
}

function dayIndex(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return Date.UTC(year, month - 1, day) / 86400000
}

function periodText(startDate?: string, endDate?: string) {
  if (!startDate || !endDate) return "First reading"
  return `${shortDate(`${startDate}T12:00:00`)} - ${shortDate(`${endDate}T12:00:00`)}`
}

function billPeriodLabel(startDate: Date, endDate: Date, includeYear: boolean) {
  const sameMonth = startDate.getFullYear() === endDate.getFullYear() && startDate.getMonth() === endDate.getMonth()
  if (sameMonth) {
    return startDate.toLocaleDateString("en-US", { month: "long", ...(includeYear ? { year: "numeric" } : {}) })
  }
  if (includeYear) {
    return `${startDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })} - ${endDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`
  }
  return `${startDate.toLocaleDateString("en-US", { month: "short" })} - ${endDate.toLocaleDateString("en-US", { month: "short" })}`
}

function personNightsForPeriod(stays: Stay[], startDate?: string, endDate?: string) {
  if (!startDate || !endDate) {
    return { total: null as number | null, people: "Need previous reading" }
  }

  const start = dayIndex(startDate)
  const end = dayIndex(endDate)
  // Combine multiple stays by the same person within this period into one entry
  const byName = new Map<string, { name: string; nights: number }>()
  for (const stay of stays) {
    const overlapStart = Math.max(start, dayIndex(stay.from_date))
    const overlapEnd = Math.min(end, dayIndex(stay.to_date))
    const nights = Math.max(0, overlapEnd - overlapStart)
    if (nights === 0) continue
    const key = stay.guest_name.trim().toLowerCase()
    const entry = byName.get(key) ?? { name: stay.guest_name.trim(), nights: 0 }
    entry.nights += nights
    byName.set(key, entry)
  }
  const entries = Array.from(byName.values())

  return {
    total: entries.reduce((sum, entry) => sum + entry.nights, 0),
    people: entries.length === 0
      ? "No stays recorded"
      : entries.map(entry => `${entry.name} ${entry.nights}`).join(", "),
  }
}

function monthTone(monthIndex: number) {
  const tones = [
    // Winter (Dec-Feb) shades of blue
    { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-100" }, // Jan
    { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-100" }, // Feb
    // Spring (Mar-May) shades of green
    { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100" }, // Mar
    { bg: "bg-green-50", text: "text-green-700", border: "border-green-100" }, // Apr
    { bg: "bg-lime-50", text: "text-lime-700", border: "border-lime-100" }, // May
    // Summer (Jun-Aug) shades of yellow
    { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-100" }, // Jun
    { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-100" }, // Jul
    { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-100" }, // Aug
    // Autumn (Sep-Nov) shades of red
    { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-100" }, // Sep
    { bg: "bg-red-50", text: "text-red-700", border: "border-red-100" }, // Oct
    { bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-100" }, // Nov
    // Dec
    { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-100" }, // Dec
  ]
  return tones[monthIndex] ?? { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-100" }
}

function computeBillShares(
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
    return { payerShare: equalShare, guestShares }
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

function selectedSplitGuests(
  bill: Bill,
  payer: string,
  guestSummaries: GuestSummary[],
  selectedGuestNames: Set<string>,
) {
  const guestDaysByName = new Map(guestSummaries.map(guest => [guest.name, guest.days]))
  if (bill.split_preset === "default") {
    return guestSummaries.filter(guest => guest.name !== payer && selectedGuestNames.has(guest.name))
  }
  return Array.from(selectedGuestNames)
    .filter(name => name !== payer)
    .map(name => ({ name, days: guestDaysByName.get(name) ?? 0 }))
}

export function UtilitiesClient({ utilities, readings, bills, stays }: UtilitiesClientProps) {
  const [activeTab, setActiveTab] = useState("readings")
  const [mobileReadingsView, setMobileReadingsView] = useState<"cards" | "table">("cards")
  const [mobileBillsView, setMobileBillsView] = useState<"cards" | "table">("cards")
  const [editingReading, setEditingReading] = useState<ReadingRow | null>(null)
  const [isReadingDialogOpen, setIsReadingDialogOpen] = useState(false)
  const [deleteReading, setDeleteReading] = useState<ReadingRow | null>(null)
  const [editingBill, setEditingBill] = useState<Bill | null>(null)
  const [billDialogOpen, setBillDialogOpen] = useState(false)
  const [deleteBill_, setDeleteBill_] = useState<Bill | null>(null)
  // billSplitToggles: { [billId]: Set of guest names included in split }
  const [billSplitToggles, setBillSplitToggles] = useState<Record<string, Set<string>>>({})
  const [billFiltersOpen, setBillFiltersOpen] = useState(false)
  const [billMonthFrom, setBillMonthFrom] = useState("")
  const [billMonthTo, setBillMonthTo] = useState("")
  const [owedView, setOwedView] = useState<OwedView>("by")
  const [settleUpCollapsed, setSettleUpCollapsed] = useState(true)
  const [billTypeFilter, setBillTypeFilter] = useState<string[]>([])
  const [billStatusFilter, setBillStatusFilter] = useState<Array<"paid" | "settled">>([])
  const [amountMinFilter, setAmountMinFilter] = useState(0)
  const [amountMaxFilter, setAmountMaxFilter] = useState(0)
  const [amountMinDraft, setAmountMinDraft] = useState(0)
  const [amountMaxDraft, setAmountMaxDraft] = useState(0)
  const billYears = [...new Set(bills.map(b => new Date(b.due_date + "T12:00:00").getFullYear()))].sort((a, b) => b - a)
  const [selectedBillYear, setSelectedBillYear] = useState<number | null>(null)
  const activeBillYear = selectedBillYear ?? billYears[0] ?? new Date().getFullYear()
  const yearBills = [...bills]
    .filter(b => new Date(b.due_date + "T12:00:00").getFullYear() === activeBillYear)
    .sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime())
  const billTypeOptions = [...new Set(yearBills.map(bill => bill.name))].sort((a, b) => a.localeCompare(b))
  const amountBounds = useMemo(() => {
    if (yearBills.length === 0) return { min: 0, max: 0 }
    const amounts = yearBills.map(bill => Number(bill.amount))
    return { min: Math.min(...amounts), max: Math.max(...amounts) }
  }, [yearBills])
  const filteredBills = yearBills.filter(bill => {
    const billMonth = bill.due_date.slice(0, 7)
    if (billMonthFrom && billMonth < billMonthFrom) return false
    if (billMonthTo && billMonth > billMonthTo) return false
    if (billTypeFilter.length > 0 && !billTypeFilter.includes(bill.name)) return false
    const billStatus = bill.paid ? "settled" : "paid"
    if (billStatusFilter.length > 0 && !billStatusFilter.includes(billStatus)) return false
    if (Number(bill.amount) < amountMinFilter || Number(bill.amount) > amountMaxFilter) return false
    return true
  })
  const router = useRouter()
  const hasActiveBillFilters =
    !!billMonthFrom ||
    !!billMonthTo ||
    billTypeFilter.length > 0 ||
    billStatusFilter.length > 0 ||
    amountMinFilter !== amountBounds.min ||
    amountMaxFilter !== amountBounds.max
  const amountRange = Math.max(amountBounds.max - amountBounds.min, 1)
  const amountLeftPct = ((amountMinDraft - amountBounds.min) / amountRange) * 100
  const amountRightPct = ((amountMaxDraft - amountBounds.min) / amountRange) * 100

  useEffect(() => {
    setAmountMinFilter(amountBounds.min)
    setAmountMaxFilter(amountBounds.max)
    setAmountMinDraft(amountBounds.min)
    setAmountMaxDraft(amountBounds.max)
  }, [activeBillYear, amountBounds.min, amountBounds.max])
  const filteredBillIdSet = useMemo(() => new Set(filteredBills.map(bill => bill.id)), [filteredBills])

  const summarizeGuestsForBillPeriod = (monthStart: string, monthEnd: string, monthNextStart: string): GuestSummary[] => {
    const guestDays = new Map<string, number>()
    stays.forEach(stay => {
      if (stay.guest_name.toLowerCase().includes("vesna")) return
      if (!(stay.from_date <= monthEnd && stay.to_date >= monthStart)) return
      const overlapStart = Math.max(dayIndex(monthStart), dayIndex(stay.from_date))
      const overlapEnd = Math.min(dayIndex(monthNextStart), dayIndex(stay.to_date))
      const days = Math.max(0, overlapEnd - overlapStart)
      if (days <= 0) return
      guestDays.set(stay.guest_name, (guestDays.get(stay.guest_name) ?? 0) + days)
    })
    return Array.from(guestDays.entries())
      .map(([name, days]) => ({ name, days }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  const toggleStayInBill = async (
    bill: Bill,
    guestName: string,
    defaultSelectedNames: string[],
  ) => {
    let nextSelectedNames = new Set<string>()
    setBillSplitToggles(prev => {
      const current = new Set(prev[bill.id] ?? defaultSelectedNames)
      if (current.has(guestName)) current.delete(guestName)
      else current.add(guestName)
      nextSelectedNames = new Set(current)
      return { ...prev, [bill.id]: current }
    })

    try {
      const splitBetween = Array.from(nextSelectedNames)
      await trackSave(updateBill(bill.id, {
        name: bill.name,
        amount: bill.amount,
        dueDate: bill.due_date,
        paid: bill.paid,
        paidBy: bill.paid_by || "Mama",
        splitBetween,
        splitPreset: bill.split_preset ?? "default",
        splitWeights: bill.split_weights ?? {},
        category: bill.category,
        recurring: bill.recurring,
      }))
      refresh()
    } catch (error) {
      console.error("Failed to update split between:", error)
    }
  }

  const toggleBillType = (name: string) => {
    setBillTypeFilter(current =>
      current.includes(name)
        ? current.filter(item => item !== name)
        : [...current, name],
    )
  }

  const toggleBillStatus = (status: "paid" | "settled") => {
    setBillStatusFilter(current =>
      current.includes(status)
        ? current.filter(item => item !== status)
        : [...current, status],
    )
  }

  const clearBillFilters = () => {
    setBillMonthFrom("")
    setBillMonthTo("")
    setBillTypeFilter([])
    setBillStatusFilter([])
    setAmountMinFilter(amountBounds.min)
    setAmountMaxFilter(amountBounds.max)
    setAmountMinDraft(amountBounds.min)
    setAmountMaxDraft(amountBounds.max)
  }

  const applyAmountDraft = () => {
    setAmountMinFilter(amountMinDraft)
    setAmountMaxFilter(amountMaxDraft)
  }

  const readingUtilities = useMemo(
    () => utilities.filter(utility => {
      const key = utility.name.toLowerCase()
      if (/^struja\s+\d+$/.test(key)) return false
      return key.includes("water") || key.includes("voda") || key.includes("electric") || key.includes("struja")
    }),
    [utilities],
  )

  const meterOptions = useMemo(
    () => readingUtilities.map(utility => ({ name: utility.name, unit: utility.unit })),
    [readingUtilities],
  )
  const payerSuggestions = useMemo(
    () => Array.from(new Set([
      ...stays.map(stay => stay.guest_name),
      ...bills.map(bill => bill.paid_by).filter(Boolean) as string[],
    ])).sort((a, b) => a.localeCompare(b)),
    [stays, bills],
  )

  const readingRows = useMemo(() => {
    const rows = readings.length > 0
      ? Object.values(readings.reduce<Record<string, {
        id: string
        name: string
        value: number
        unit: string
        date: string
        utility: Utility | null
        readingIds: string[]
        parts: Array<{ id: string; label: string; value: number }>
      }>>((groups, reading) => {
        const name = meterGroupName(reading.type)
        const date = dateOnly(reading.date)
        const key = `${name}-${date}`
        const meter = utilities.find(utility => utility.name === name)
        const part = electricityPart(reading.type)

        if (!groups[key]) {
          groups[key] = {
            id: key,
            name,
            value: 0,
            unit: meter?.unit ?? "",
            date: reading.date,
            utility: meter ?? null,
            readingIds: [],
            parts: [],
          }
        }

        groups[key].value += Number(reading.value)
        groups[key].readingIds.push(reading.id)
        if (part) {
          groups[key].parts.push({ id: reading.id, label: part, value: Number(reading.value) })
        }

        return groups
      }, {})).map(row => ({
        ...row,
        displayValue: row.parts.length > 0
          ? row.parts
            .sort((a, b) => a.label.localeCompare(b.label))
            .map(part => `${part.label}: ${formatReadingValue(row.name, part.value)}`)
            .join(" / ")
          : formatReadingValue(row.name, row.value),
      }))
      : readingUtilities.map(utility => {
        const name = meterGroupName(utility.name)
        return {
          id: utility.id,
          name,
          value: Number(utility.current_usage),
          displayValue: formatReadingValue(name, Number(utility.current_usage)),
          unit: utility.unit,
          date: utility.updated_at ?? "",
          utility,
          readingIds: [],
          parts: [],
        }
      })

    const previousByMeter = new Map<string, string>()
    return [...rows]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(row => {
        const currentDate = row.date ? dateOnly(row.date) : ""
        const previousDate = previousByMeter.get(row.name)
        if (currentDate) previousByMeter.set(row.name, currentDate)
        return { ...row, previousDate, currentDate }
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [readings, readingUtilities, utilities])

  const renderReadingValue = (row: ReadingRow) => {
    if (row.parts && row.parts.length > 0) {
      return (
        <div className="leading-tight space-y-0.5 font-mono tracking-[0.02em] tabular-nums">
          {[...row.parts]
            .sort((a, b) => a.label.localeCompare(b.label))
            .map(part => (
              <div key={part.id} className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                <span className="text-gray-400 font-medium">{part.label}</span>
                <span className="text-gray-300">|</span>
                {formatReadingValue(row.name, part.value)}
                {row.unit && <span className="text-gray-400 font-medium"> {row.unit}</span>}
              </div>
            ))}
        </div>
      )
    }

    return (
      <span className="text-sm font-semibold text-gray-900 font-mono tracking-[0.02em] tabular-nums">
        {row.displayValue}
        {row.unit && <span className="text-gray-400 font-medium"> {row.unit}</span>}
      </span>
    )
  }

  const settlementRows = useMemo(() => {
    const owedPairs = new Map<string, number>()

    for (const bill of filteredBills) {
      // Settled bills are closed and should not contribute to pending settlements.
      if (bill.paid) continue
      // Billing period — a single month, or a range of whole months (period_end)
      const pad = (n: number) => String(n).padStart(2, "0")
      const startDate = new Date(bill.due_date + "T12:00:00")
      const endDate = bill.period_end ? new Date(bill.period_end + "T12:00:00") : startDate
      const afterEnd = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 1)
      const monthStart = `${startDate.getFullYear()}-${pad(startDate.getMonth() + 1)}-01`
      const monthEnd = `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0).getDate())}`
      const monthNextStart = `${afterEnd.getFullYear()}-${pad(afterEnd.getMonth() + 1)}-01`
      const daysInMonth = dayIndex(monthNextStart) - dayIndex(monthStart)

      const guestSummaries = summarizeGuestsForBillPeriod(monthStart, monthEnd, monthNextStart)
      const defaultSelectedNames = bill.split_between ?? []
      const selectedGuestNames = billSplitToggles[bill.id] ?? new Set(defaultSelectedNames)
      const payer = bill.paid_by || "Mama"
      const payerIncluded = selectedGuestNames.has(payer)
      const includedGuests = selectedSplitGuests(bill, payer, guestSummaries, selectedGuestNames)
      if (includedGuests.length === 0) continue
      const { guestShares } = computeBillShares(bill, payer, payerIncluded, daysInMonth, includedGuests)

      for (const guest of includedGuests) {
        const share = guestShares.get(guest.name) ?? 0
        if (share <= 0) continue
        const pairKey = `${guest.name}::${payer}`
        owedPairs.set(pairKey, (owedPairs.get(pairKey) ?? 0) + share)
      }
    }

    return Array.from(owedPairs.entries())
      .map(([pairKey, amount]) => {
        const [debtor, creditor] = pairKey.split("::")
        return { debtor, creditor, amount }
      })
      .sort((a, b) => b.amount - a.amount)
  }, [filteredBills, stays, billSplitToggles])
  const totalSettlements = settlementRows.reduce((sum, row) => sum + row.amount, 0)
  const settlementGroups = useMemo(() => {
    const grouped = new Map<string, { total: number; items: Array<{ name: string; amount: number }> }>()
    for (const row of settlementRows) {
      const heading = owedView === "by" ? row.debtor : row.creditor
      const counterpart = owedView === "by" ? row.creditor : row.debtor
      const current = grouped.get(heading) ?? { total: 0, items: [] }
      current.total += row.amount
      current.items.push({ name: counterpart, amount: row.amount })
      grouped.set(heading, current)
    }
    return Array.from(grouped.entries())
      .map(([name, data]) => ({
        name,
        total: data.total,
        items: data.items.sort((a, b) => b.amount - a.amount),
      }))
      .sort((a, b) => b.total - a.total)
  }, [settlementRows, owedView])

  const refresh = () => router.refresh()
  useRealtimeRefresh(["utility_readings", "bills"])

  const handleUpdateReading = async (row: ReadingRow, usage: number, readingDate: string, _meterName?: string, details?: { secondaryUsage?: number }) => {
    const utility = row.utility
    if (!utility || row.readingIds.length === 0) return

    try {
      await trackSave(updateUtilityReading({
        type: row.name,
        readingIds: row.readingIds,
        value: usage,
        maxValue: utility.max_usage,
        readingDate,
        secondaryValue: details?.secondaryUsage,
      }))
      refresh()
    } catch (error) {
      console.error("Failed to update reading:", error)
    }
  }

  const handleSetupReadings = async () => {
    try {
      await trackSave(createDefaultReadingUtilities())
      refresh()
    } catch (error) {
      console.error("Failed to set up readings:", error)
    }
  }

  const handleAddReading = async (usage: number, readingDate: string, utilityName: string, details?: { secondaryUsage?: number }) => {
    const utility = utilities.find(item => item.name === utilityName)
    if (!utility) return

    try {
      await trackSave(createUtilityReading({
        type: utility.name,
        value: usage,
        maxValue: utility.max_usage,
        unit: utility.unit,
        readingDate,
        secondaryValue: details?.secondaryUsage,
      }))
      refresh()
    } catch (error) {
      console.error("Failed to create utility reading:", error)
    }
  }

  const handleAddBill = async (
    name: string,
    amount: number,
    period: string,
    periodEnd: string | null,
    settled: boolean,
    paidBy: string,
    splitBetween: string[],
    splitPreset: "default" | "equal" | "weighted",
    splitWeights: Record<string, number>,
  ) => {
    try {
      await trackSave(createBill({
        name, amount,
        dueDate: `${period}-01`,
        periodEnd: periodEnd ? `${periodEnd}-01` : null,
        paid: settled,
        paidBy,
        splitBetween,
        splitPreset,
        splitWeights,
        category: "utilities",
        recurring: true,
      }))
      refresh()
    } catch (error) {
      console.error("Failed to create bill:", error)
    }
  }

  const handleEditBill = async (
    id: string,
    name: string,
    amount: number,
    period: string,
    periodEnd: string | null,
    settled: boolean,
    paidBy: string,
    splitBetween: string[],
    splitPreset: "default" | "equal" | "weighted",
    splitWeights: Record<string, number>,
  ) => {
    const existing = bills.find(bill => bill.id === id)
    try {
      await trackSave(updateBill(id, {
        name, amount,
        dueDate: `${period}-01`,
        periodEnd: periodEnd ? `${periodEnd}-01` : null,
        paid: existing ? settled : false,
        paidBy,
        splitBetween,
        splitPreset,
        splitWeights,
        category: "utilities",
        recurring: true,
      }))
      // Reflect split changes immediately in UI without waiting for server refresh.
      setBillSplitToggles(current => ({ ...current, [id]: new Set(splitBetween) }))
      refresh()
    } catch (error) {
      console.error("Failed to update bill:", error)
    }
  }

  const handleToggleBill = async (bill: Bill) => {
    try {
      await trackSave(updateBill(bill.id, {
        name: bill.name,
        amount: bill.amount,
        dueDate: bill.due_date,
        paid: !bill.paid,
        paidBy: bill.paid_by || "Mama",
        splitBetween: bill.split_between ?? [],
        splitPreset: bill.split_preset ?? "default",
        splitWeights: bill.split_weights ?? {},
        category: bill.category,
        recurring: bill.recurring,
      }))
      refresh()
    } catch (error) {
      console.error("Failed to update bill:", error)
    }
  }

  const handleDeleteBill = async () => {
    if (!deleteBill_) return
    try {
      await trackSave(deleteBill(deleteBill_.id))
      refresh()
    } catch (error) {
      console.error("Failed to delete bill:", error)
    }
  }

  const handleDeleteReading = async () => {
    if (!deleteReading) return
    try {
      await trackSave(deleteUtilityReading({
        type: deleteReading.name,
        readingIds: deleteReading.readingIds,
      }))
      refresh()
    } catch (error) {
      console.error("Failed to delete reading:", error)
    }
  }

  return (
    <div className="p-6">
      <Card className={cn("shadow-none border-2 border-blue-100 mb-5 px-5", settleUpCollapsed ? "py-4 gap-0" : "py-5 gap-2")}>
        <div className="flex items-center justify-between gap-4 min-h-6">
          <button
            type="button"
            onClick={() => setSettleUpCollapsed(collapsed => !collapsed)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 cursor-pointer"
          >
            <span>Settle up</span>
            <span className="font-semibold text-blue-600">{formatMoney(totalSettlements)}</span>
          </button>
          <button
            type="button"
            onClick={() => setSettleUpCollapsed(collapsed => !collapsed)}
            className="inline-flex items-center justify-center h-6 w-6 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            title={settleUpCollapsed ? "Expand settle up" : "Collapse settle up"}
          >
            {settleUpCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </div>
        <div className={cn("relative transition-all duration-200 ease-out overflow-hidden", settleUpCollapsed ? "max-h-0 opacity-0 mt-0" : "max-h-[420px] opacity-100 mt-2")}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-gray-400">Owed:</span>
            <button
              type="button"
              onClick={() => setOwedView("by")}
              className={cn(
                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border cursor-pointer transition-all",
                owedView === "by"
                  ? "bg-blue-500 text-white border-blue-500"
                  : "bg-white text-gray-400 border-gray-200 hover:border-blue-300 hover:text-blue-500",
              )}
            >
              By
            </button>
            <button
              type="button"
              onClick={() => setOwedView("to")}
              className={cn(
                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border cursor-pointer transition-all",
                owedView === "to"
                  ? "bg-blue-500 text-white border-blue-500"
                  : "bg-white text-gray-400 border-gray-200 hover:border-blue-300 hover:text-blue-500",
              )}
            >
              To
            </button>
          </div>
          {settlementRows.length === 0 ? (
            <p className="text-sm text-gray-400">No outstanding settlements.</p>
          ) : (
            <div className="space-y-1.5">
              {settlementGroups.map(group => (
                <div key={group.name} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-800">{group.name}</p>
                    <p className="text-sm font-semibold text-gray-900">{formatMoney(group.total)}</p>
                  </div>
                  <div className="mt-1.5 pl-3 space-y-1">
                    {group.items.map(item => (
                      <div key={`${group.name}-${item.name}`} className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">
                          {owedView === "by" ? `to ${item.name}` : `from ${item.name}`}
                        </p>
                        <p className="text-sm font-medium text-gray-800">{formatMoney(item.amount)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit">
            {([
              { value: "readings", label: "Readings", active: "bg-emerald-500 text-white shadow-sm" },
              { value: "bills", label: "Bills", active: "bg-blue-500 text-white shadow-sm" },
            ] as const).map(tab => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer",
                  activeTab === tab.value ? tab.active : "text-gray-500 hover:text-gray-700"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {activeTab === "readings" && readingUtilities.length > 0 && (
            <Button onClick={() => setIsReadingDialogOpen(true)} className="cursor-pointer bg-emerald-500 hover:bg-emerald-600">
              <Plus className="h-4 w-4 mr-2" /> New Reading
            </Button>
          )}
          {activeTab === "bills" && bills.length > 0 && (
            <Button onClick={() => { setEditingBill(null); setBillDialogOpen(true) }} className="cursor-pointer bg-blue-500 hover:bg-blue-600">
              <Plus className="h-4 w-4 mr-2" /> New Bill
            </Button>
          )}
        </div>

        <TabsContent value="readings">
          {utilities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <p className="text-gray-400 text-base">No utilities yet</p>
              <button
                onClick={handleSetupReadings}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-xl cursor-pointer transition-colors"
              >
                <Plus className="h-4 w-4" /> Set Up Readings
              </button>
            </div>
          ) : readingUtilities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <p className="text-gray-400 text-base">No readings yet</p>
              <button
                onClick={handleSetupReadings}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-xl cursor-pointer transition-colors"
              >
                <Plus className="h-4 w-4" /> Set Up Readings
              </button>
            </div>
          ) : (
            <>
              <div className="md:hidden mb-2">
                <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit">
                  <button
                    type="button"
                    onClick={() => setMobileReadingsView("cards")}
                    className={cn(
                      "px-3 py-1 rounded-lg text-sm font-medium transition-all cursor-pointer",
                      mobileReadingsView === "cards" ? "bg-emerald-500 text-white shadow-sm" : "text-gray-500 hover:text-gray-700",
                    )}
                  >
                    Cards
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileReadingsView("table")}
                    className={cn(
                      "px-3 py-1 rounded-lg text-sm font-medium transition-all cursor-pointer",
                      mobileReadingsView === "table" ? "bg-emerald-500 text-white shadow-sm" : "text-gray-500 hover:text-gray-700",
                    )}
                  >
                    Table
                  </button>
                </div>
              </div>
              {mobileReadingsView === "cards" && (
                <div className="md:hidden space-y-2">
                  {readingRows.map(row => {
                    const Icon = utilityIcon(row.name)
                    const nightSummary = personNightsForPeriod(stays, row.previousDate, row.currentDate)
                    return (
                      <Card key={row.id} className="shadow-none border-2 px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                              <p className="text-sm font-semibold text-gray-800">{row.name}</p>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">{row.date ? shortDate(row.date) : "No date"}</p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 cursor-pointer text-gray-400 hover:text-gray-700">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => setEditingReading(row)}
                                disabled={!row.utility || row.readingIds.length === 0}
                              >
                                <Edit className="h-3.5 w-3.5 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer text-destructive focus:text-destructive"
                                onClick={() => setDeleteReading(row)}
                                disabled={row.readingIds.length === 0}
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wide">Reading</p>
                            {renderReadingValue(row)}
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wide">Nights</p>
                            <p className="font-semibold text-gray-900">{nightSummary.total === null ? "-" : `${nightSummary.total}n`}</p>
                          </div>
                        </div>
                        <div className="mt-2">
                          <p className="text-xs text-gray-400 uppercase tracking-wide">Period</p>
                          <p className="text-sm text-gray-600">{periodText(row.previousDate, row.currentDate)}</p>
                        </div>
                        <div className="mt-2 min-w-0">
                          <p className="text-xs text-gray-400 uppercase tracking-wide">People</p>
                          <p className="text-sm text-gray-600 truncate">{nightSummary.people}</p>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              )}
              <div className={cn("md:hidden", mobileReadingsView === "cards" ? "hidden" : "block")}>
                <div className="overflow-x-auto">
                  <Card className="shadow-none border-2 overflow-hidden min-w-[760px]">
                    <div className="flex items-center gap-4 px-4 py-2 bg-gray-50 border-b border-gray-100">
                      <div className="w-20 flex-shrink-0 text-xs font-medium text-gray-400 uppercase tracking-wide">Date</div>
                      <div className="w-32 flex-shrink-0 text-xs font-medium text-gray-400 uppercase tracking-wide">Meter</div>
                      <div className="w-28 flex-shrink-0 text-xs font-medium text-gray-400 uppercase tracking-wide">Reading</div>
                      <div className="w-36 flex-shrink-0 text-xs font-medium text-gray-400 uppercase tracking-wide">Period</div>
                      <div className="w-20 flex-shrink-0 text-xs font-medium text-gray-400 uppercase tracking-wide">Nights</div>
                      <div className="flex-1 text-xs font-medium text-gray-400 uppercase tracking-wide">People</div>
                      <div className="w-7 flex-shrink-0" />
                    </div>
                    <div className="divide-y divide-gray-100">
                      {readingRows.map(row => {
                        const Icon = utilityIcon(row.name)
                        const nightSummary = personNightsForPeriod(stays, row.previousDate, row.currentDate)
                        return (
                          <div key={row.id} className="flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 group transition-colors">
                            <div className="w-20 flex-shrink-0 text-sm font-medium text-gray-800">{row.date ? shortDate(row.date) : "No date"}</div>
                            <div className="w-32 flex-shrink-0 flex items-center gap-2">
                              <Icon className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                              <span className="font-medium text-gray-800">{row.name}</span>
                            </div>
                            <div className="w-28 flex-shrink-0">
                              {renderReadingValue(row)}
                            </div>
                            <div className="w-36 flex-shrink-0 text-sm text-gray-500">{periodText(row.previousDate, row.currentDate)}</div>
                            <div className="w-20 flex-shrink-0">
                              <span className="font-semibold text-gray-900">{nightSummary.total === null ? "-" : nightSummary.total}</span>
                              {nightSummary.total !== null && <span className="text-gray-400 ml-1">n</span>}
                            </div>
                            <div className="flex-1 text-sm text-gray-600 min-w-0">{nightSummary.people}</div>
                            <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 cursor-pointer text-gray-400 hover:text-gray-700">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    className="cursor-pointer"
                                    onClick={() => setEditingReading(row)}
                                    disabled={!row.utility || row.readingIds.length === 0}
                                  >
                                    <Edit className="h-3.5 w-3.5 mr-2" /> Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="cursor-pointer text-destructive focus:text-destructive"
                                    onClick={() => setDeleteReading(row)}
                                    disabled={row.readingIds.length === 0}
                                  >
                                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </Card>
                </div>
              </div>
              <Card className="hidden md:block shadow-none border-2 overflow-hidden">
                {/* Column headers */}
                <div className="flex items-center gap-4 px-4 py-2 bg-gray-50 border-b border-gray-100">
                  <div className="w-20 flex-shrink-0 text-xs font-medium text-gray-400 uppercase tracking-wide">Date</div>
                  <div className="w-32 flex-shrink-0 text-xs font-medium text-gray-400 uppercase tracking-wide">Meter</div>
                  <div className="w-28 flex-shrink-0 text-xs font-medium text-gray-400 uppercase tracking-wide">Reading</div>
                  <div className="w-36 flex-shrink-0 text-xs font-medium text-gray-400 uppercase tracking-wide">Period</div>
                  <div className="w-20 flex-shrink-0 text-xs font-medium text-gray-400 uppercase tracking-wide">Nights</div>
                  <div className="flex-1 text-xs font-medium text-gray-400 uppercase tracking-wide">People</div>
                  <div className="w-7 flex-shrink-0" />
                </div>
                <div className="divide-y divide-gray-100">
                  {readingRows.map(row => {
                    const Icon = utilityIcon(row.name)
                    const nightSummary = personNightsForPeriod(stays, row.previousDate, row.currentDate)

                    return (
                      <div key={row.id} className="flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 group transition-colors">
                        {/* Date */}
                        <div className="w-20 flex-shrink-0 text-sm font-medium text-gray-800">
                          {row.date ? shortDate(row.date) : "No date"}
                        </div>

                        {/* Meter */}
                        <div className="w-32 flex-shrink-0 flex items-center gap-2">
                          <Icon className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                          <span className="font-medium text-gray-800">{row.name}</span>
                        </div>

                        {/* Reading */}
                        <div className="w-28 flex-shrink-0">
                          {renderReadingValue(row)}
                        </div>

                        {/* Period */}
                        <div className="w-36 flex-shrink-0 text-sm text-gray-500">
                          {periodText(row.previousDate, row.currentDate)}
                        </div>

                        {/* Stay nights */}
                        <div className="w-20 flex-shrink-0">
                          <span className="font-semibold text-gray-900">
                            {nightSummary.total === null ? "-" : nightSummary.total}
                          </span>
                          {nightSummary.total !== null && <span className="text-gray-400 ml-1">n</span>}
                        </div>

                        {/* People */}
                        <div className="flex-1 text-sm text-gray-600 min-w-0">
                          {nightSummary.people}
                        </div>

                        {/* Actions */}
                        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 cursor-pointer text-gray-400 hover:text-gray-700"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => setEditingReading(row)}
                                disabled={!row.utility || row.readingIds.length === 0}
                              >
                                <Edit className="h-3.5 w-3.5 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer text-destructive focus:text-destructive"
                                onClick={() => setDeleteReading(row)}
                                disabled={row.readingIds.length === 0}
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="bills" className="mt-0">
          {bills.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <p className="text-gray-400 text-base">No bills yet</p>
              <button onClick={() => setBillDialogOpen(true)} className="flex items-center gap-2 px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-xl cursor-pointer transition-colors">
                <Plus className="h-4 w-4" /> New Bill
              </button>
            </div>
          ) : (
            <>
              <div className="md:hidden mb-2">
                <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit">
                  <button
                    type="button"
                    onClick={() => setMobileBillsView("cards")}
                    className={cn(
                      "px-3 py-1 rounded-lg text-sm font-medium transition-all cursor-pointer",
                      mobileBillsView === "cards" ? "bg-blue-500 text-white shadow-sm" : "text-gray-500 hover:text-gray-700",
                    )}
                  >
                    Cards
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileBillsView("table")}
                    className={cn(
                      "px-3 py-1 rounded-lg text-sm font-medium transition-all cursor-pointer",
                      mobileBillsView === "table" ? "bg-blue-500 text-white shadow-sm" : "text-gray-500 hover:text-gray-700",
                    )}
                  >
                    Table
                  </button>
                </div>
              </div>
              <Card className="shadow-none border-2 overflow-hidden">
              {/* Year tabs */}
              <div className="flex items-center justify-between px-4 pt-3 pb-2">
                <div className="flex items-center gap-1">
                  {billYears.map(year => (
                    <button
                      key={year}
                      onClick={() => setSelectedBillYear(year)}
                      className={cn(
                        "px-3 py-1 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                        activeBillYear === year
                          ? "bg-blue-500 text-white"
                          : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                      )}
                    >
                      {year}
                    </button>
                  ))}
                </div>
                <div className="relative h-7 w-16">
                  <button
                    onClick={() => setBillFiltersOpen(open => !open)}
                    className={cn(
                      "absolute right-0 inline-flex items-center justify-center h-7 w-7 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200 ease-out cursor-pointer",
                      hasActiveBillFilters ? "-translate-x-8" : "translate-x-0",
                    )}
                    title="Toggle filters"
                  >
                    <Filter className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={clearBillFilters}
                    className={cn(
                      "absolute right-0 inline-flex items-center justify-center h-7 w-7 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200 ease-out cursor-pointer",
                      hasActiveBillFilters ? "opacity-100 scale-100" : "opacity-0 scale-75 pointer-events-none",
                    )}
                    title="Clear filters"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div
                className={cn(
                  "border-t border-gray-100 bg-gray-50/60 overflow-hidden transition-all duration-200 ease-out",
                  billFiltersOpen ? "max-h-80 opacity-100 px-4 py-3" : "max-h-0 opacity-0 px-4 py-0",
                )}
              >
                <div className={cn("transition-opacity duration-200 ease-out", billFiltersOpen ? "opacity-100" : "opacity-0")}>
                  <div className="grid grid-cols-1 md:grid-cols-[1.1fr_auto_1.1fr_auto_0.8fr_auto_1.2fr] gap-3 items-start">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <input
                          type="month"
                          value={billMonthFrom}
                          onChange={e => setBillMonthFrom(e.target.value)}
                          className={cn(
                            "h-8 w-full rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-700",
                            !billMonthFrom && "[&::-webkit-datetime-edit]:text-transparent focus:[&::-webkit-datetime-edit]:text-gray-700",
                          )}
                        />
                        <input
                          type="month"
                          value={billMonthTo}
                          onChange={e => setBillMonthTo(e.target.value)}
                          className={cn(
                            "h-8 w-full rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-700",
                            !billMonthTo && "[&::-webkit-datetime-edit]:text-transparent focus:[&::-webkit-datetime-edit]:text-gray-700",
                          )}
                        />
                      </div>
                    </div>
                    <div className="hidden md:block h-8 w-px bg-gray-200 mx-auto" />
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {billTypeOptions.map(type => {
                          const selected = billTypeFilter.includes(type)
                          return (
                            <button
                              key={type}
                              onClick={() => toggleBillType(type)}
                              className={cn(
                                "inline-flex items-center px-2 py-0.5 rounded-full text-xs border cursor-pointer transition-all",
                                selected
                                  ? "bg-blue-500 text-white border-blue-500"
                                  : "bg-white text-gray-400 border-gray-200 hover:border-blue-300 hover:text-blue-500"
                              )}
                            >
                              {type}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <div className="hidden md:block h-8 w-px bg-gray-200 mx-auto" />
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          onClick={() => toggleBillStatus("paid")}
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-xs border cursor-pointer transition-all",
                            billStatusFilter.includes("paid")
                              ? "bg-blue-500 text-white border-blue-500"
                              : "bg-white text-gray-400 border-gray-200 hover:border-blue-300 hover:text-blue-500"
                          )}
                        >
                          Paid
                        </button>
                        <button
                          onClick={() => toggleBillStatus("settled")}
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-xs border cursor-pointer transition-all",
                            billStatusFilter.includes("settled")
                              ? "bg-green-500 text-white border-green-500"
                              : "bg-white text-gray-400 border-gray-200 hover:border-green-300 hover:text-green-600"
                          )}
                        >
                          Settled
                        </button>
                      </div>
                    </div>
                    <div className="hidden md:block h-8 w-px bg-gray-200 mx-auto" />
                    <div className="space-y-2">
                      <div className="relative h-6">
                        <div className="absolute top-2.5 left-0 right-0 h-1.5 rounded-full bg-gray-200" />
                        <div
                          className="absolute top-2.5 h-1.5 rounded-full bg-blue-500"
                          style={{ left: `${amountLeftPct}%`, width: `${Math.max(amountRightPct - amountLeftPct, 0)}%` }}
                        />
                        <input
                          type="range"
                          min={amountBounds.min}
                          max={amountBounds.max}
                          step="0.01"
                          value={amountMinDraft}
                          onChange={e => {
                            const next = Number(e.target.value)
                            setAmountMinDraft(next > amountMaxDraft ? amountMaxDraft : next)
                          }}
                          onMouseUp={applyAmountDraft}
                          onTouchEnd={applyAmountDraft}
                          onKeyUp={applyAmountDraft}
                          className="pointer-events-none absolute left-0 top-0 h-6 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500"
                        />
                        <input
                          type="range"
                          min={amountBounds.min}
                          max={amountBounds.max}
                          step="0.01"
                          value={amountMaxDraft}
                          onChange={e => {
                            const next = Number(e.target.value)
                            setAmountMaxDraft(next < amountMinDraft ? amountMinDraft : next)
                          }}
                          onMouseUp={applyAmountDraft}
                          onTouchEnd={applyAmountDraft}
                          onKeyUp={applyAmountDraft}
                          className="pointer-events-none absolute left-0 top-0 h-6 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={amountBounds.min}
                            max={amountMaxDraft}
                            step="0.01"
                            value={Number.isFinite(amountMinDraft) ? Number(amountMinDraft.toFixed(2)) : amountBounds.min}
                            onChange={e => {
                              const next = Number(e.target.value)
                              if (Number.isNaN(next)) return
                              const clamped = Math.max(amountBounds.min, Math.min(next, amountMaxDraft))
                              setAmountMinDraft(clamped)
                              setAmountMinFilter(clamped)
                            }}
                            className="h-8 w-full rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-700"
                          />
                          <span className="text-gray-300">-</span>
                          <input
                            type="number"
                            min={amountMinDraft}
                            max={amountBounds.max}
                            step="0.01"
                            value={Number.isFinite(amountMaxDraft) ? Number(amountMaxDraft.toFixed(2)) : amountBounds.max}
                            onChange={e => {
                              const next = Number(e.target.value)
                              if (Number.isNaN(next)) return
                              const clamped = Math.min(amountBounds.max, Math.max(next, amountMinDraft))
                              setAmountMaxDraft(clamped)
                              setAmountMaxFilter(clamped)
                            }}
                            className="h-8 w-full rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-700"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Column headers */}
              <div
                className={cn(
                  "items-center gap-4 px-4 py-2 bg-gray-50 border-b border-gray-100",
                  mobileBillsView === "cards" ? "hidden md:flex" : "flex",
                )}
              >
                <div className="w-36 flex-shrink-0 text-xs font-medium text-gray-400 uppercase tracking-wide">Bill</div>
                <div className="flex-1 text-xs font-medium text-gray-400 uppercase tracking-wide">Split between</div>
                <div className="w-24 flex-shrink-0 text-xs font-medium text-gray-400 uppercase tracking-wide text-right">Amount</div>
                <div className="w-7 flex-shrink-0" />
              </div>
              <div
                className={cn(
                  "divide-y divide-gray-100",
                  mobileBillsView === "cards" ? "hidden md:block" : "block",
                  mobileBillsView === "table" ? "overflow-x-auto" : "",
                )}
              >
                {yearBills.map(bill => {
                  // This bill's billing period — a single month, or a range of whole months (period_end)
                  const pad = (n: number) => String(n).padStart(2, "0")
                  const startDate = new Date(bill.due_date + "T12:00:00")
                  const endDate = bill.period_end ? new Date(bill.period_end + "T12:00:00") : startDate
                  const sY = startDate.getFullYear(), sM = startDate.getMonth()
                  const eY = endDate.getFullYear(), eM = endDate.getMonth()
                  const afterEnd = new Date(eY, eM + 1, 1)
                  const periodStart = `${sY}-${pad(sM + 1)}-01`                                   // first day of range
                  const periodEndIncl = `${eY}-${pad(eM + 1)}-${pad(new Date(eY, eM + 1, 0).getDate())}` // last day of range
                  // Exclusive end used for night-overlap calculation (same convention as personNightsForPeriod)
                  const periodNextStart = `${afterEnd.getFullYear()}-${pad(afterEnd.getMonth() + 1)}-01`
                  const daysInPeriod = dayIndex(periodNextStart) - dayIndex(periodStart)

                  const period = billPeriodLabel(startDate, endDate, hasActiveBillFilters)

                  // Guests in this period, combined by name; Mama (Vesna) is always counted separately
                  const guestSummaries = summarizeGuestsForBillPeriod(periodStart, periodEndIncl, periodNextStart)
                  const defaultSelectedNames = bill.split_between ?? []
                  const selectedGuestNames = billSplitToggles[bill.id] ?? new Set(defaultSelectedNames)
                  const payer = bill.paid_by || "Mama"
                  const payerIncluded = selectedGuestNames.has(payer)
                  const includedGuests = selectedSplitGuests(bill, payer, guestSummaries, selectedGuestNames)
                  const hasSplit = includedGuests.length > 0
                  const { payerShare, guestShares } = computeBillShares(bill, payer, payerIncluded, daysInPeriod, includedGuests)
                  const shareFor = (guestName: string) => guestShares.get(guestName) ?? 0
                  const guestDaysByName = new Map(guestSummaries.map(guest => [guest.name, guest.days]))
                  const guestChipNames = Array.from(new Set([...guestSummaries.map(guest => guest.name), ...Array.from(selectedGuestNames)]))
                    .filter(name => name !== payer)

                  const isVisible = filteredBillIdSet.has(bill.id)
                  const monthStyle = monthTone(startDate.getMonth())

                  return (
                    <div
                      key={bill.id}
                      className={cn(
                        "flex items-center gap-4 px-4 overflow-hidden group transition-all duration-200 ease-out",
                        mobileBillsView === "table" ? "min-w-[760px]" : "",
                        isVisible ? "max-h-32 py-3.5 opacity-100 hover:bg-gray-50" : "max-h-0 py-0 opacity-0 pointer-events-none",
                      )}
                    >
                      {/* Status icon */}
                      <div className="flex-shrink-0">
                        {bill.paid
                          ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                          : <AlertCircle className="h-4 w-4 text-amber-500" />
                        }
                      </div>

                      {/* Name + period */}
                      <div className="w-36 flex-shrink-0">
                        <p className="text-sm font-semibold text-gray-800">{bill.name}</p>
                        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border mt-0.5", monthStyle.bg, monthStyle.text, monthStyle.border)}>
                          {period}
                        </span>
                      </div>

                      {/* People — Mama always + toggleable guests with day counts */}
                      <div className="flex-1 flex flex-wrap items-center gap-1.5 min-w-0">
                        {/* Payer — always present, not toggleable */}
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 border border-blue-200 font-medium">
                          {payer}{bill.split_preset === "default" ? ` · ${daysInPeriod}d` : ""}{payerIncluded && hasSplit && ` · ${formatMoney(payerShare)}`}
                        </span>
                        {guestChipNames.map(guestName => {
                          const included = selectedGuestNames.has(guestName)
                          const guestDays = guestDaysByName.get(guestName) ?? 0
                          return (
                            <button
                              key={`${bill.id}-${guestName}`}
                              onClick={() => toggleStayInBill(bill, guestName, defaultSelectedNames)}
                              title={included ? "Click to exclude from split" : "Click to include in split"}
                              className={cn(
                                "inline-flex items-center px-2 py-0.5 rounded-full text-xs border cursor-pointer transition-all",
                                included
                                  ? "bg-blue-500 text-white border-blue-500"
                                  : "bg-white text-gray-400 border-gray-200 hover:border-blue-300 hover:text-blue-500"
                              )}
                            >
                              {guestName}{bill.split_preset === "default" ? ` · ${guestDays}d` : ""}{included && ` · ${formatMoney(shareFor(guestName))}`}
                            </button>
                          )
                        })}
                      </div>

                      {/* Total amount + status (per-person split shown on the chips) */}
                      <div className="flex-shrink-0 text-right">
                        <p className="text-base font-bold text-gray-900">{formatMoney(bill.amount)}</p>
                        <p className={cn("text-xs", bill.paid ? "text-green-600" : "text-blue-600")}>
                          {bill.paid ? "Settled" : "Paid"}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 cursor-pointer text-gray-400 hover:text-gray-700">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="cursor-pointer" onClick={() => handleToggleBill(bill)}>
                              <CheckCircle2 className="h-3.5 w-3.5 mr-2" /> {bill.paid ? "Mark Paid" : "Mark Settled"}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer" onClick={() => { setEditingBill(bill); setBillDialogOpen(true) }}>
                              <Edit className="h-3.5 w-3.5 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={() => setDeleteBill_(bill)}>
                              <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  )
                })}
              </div>
              {mobileBillsView === "cards" && (
                <div className="md:hidden divide-y divide-gray-100">
                  {yearBills.map(bill => {
                    const pad = (n: number) => String(n).padStart(2, "0")
                    const startDate = new Date(bill.due_date + "T12:00:00")
                    const endDate = bill.period_end ? new Date(bill.period_end + "T12:00:00") : startDate
                    const sY = startDate.getFullYear(), sM = startDate.getMonth()
                    const eY = endDate.getFullYear(), eM = endDate.getMonth()
                    const afterEnd = new Date(eY, eM + 1, 1)
                    const periodStart = `${sY}-${pad(sM + 1)}-01`
                    const periodEndIncl = `${eY}-${pad(eM + 1)}-${pad(new Date(eY, eM + 1, 0).getDate())}`
                    const periodNextStart = `${afterEnd.getFullYear()}-${pad(afterEnd.getMonth() + 1)}-01`
                    const daysInPeriod = dayIndex(periodNextStart) - dayIndex(periodStart)
                    const period = billPeriodLabel(startDate, endDate, hasActiveBillFilters)
                    const guestSummaries = summarizeGuestsForBillPeriod(periodStart, periodEndIncl, periodNextStart)
                    const defaultSelectedNames = bill.split_between ?? []
                    const selectedGuestNames = billSplitToggles[bill.id] ?? new Set(defaultSelectedNames)
                    const payer = bill.paid_by || "Mama"
                    const payerIncluded = selectedGuestNames.has(payer)
                    const includedGuests = selectedSplitGuests(bill, payer, guestSummaries, selectedGuestNames)
                    const hasSplit = includedGuests.length > 0
                    const { payerShare, guestShares } = computeBillShares(bill, payer, payerIncluded, daysInPeriod, includedGuests)
                    const shareFor = (guestName: string) => guestShares.get(guestName) ?? 0
                    const guestDaysByName = new Map(guestSummaries.map(guest => [guest.name, guest.days]))
                    const guestChipNames = Array.from(new Set([...guestSummaries.map(guest => guest.name), ...Array.from(selectedGuestNames)]))
                      .filter(name => name !== payer)
                    const isVisible = filteredBillIdSet.has(bill.id)
                    const monthStyle = monthTone(startDate.getMonth())

                    return (
                      <div
                        key={`${bill.id}-card`}
                        className={cn(
                          "px-4 py-3 transition-all duration-200 ease-out",
                          isVisible ? "max-h-[420px] opacity-100" : "max-h-0 py-0 opacity-0 pointer-events-none overflow-hidden",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              {bill.paid
                                ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                                : <AlertCircle className="h-4 w-4 text-amber-500" />
                              }
                              <p className="text-sm font-semibold text-gray-800">{bill.name}</p>
                            </div>
                            <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border mt-1", monthStyle.bg, monthStyle.text, monthStyle.border)}>
                              {period}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="text-base font-bold text-gray-900">{formatMoney(bill.amount)}</p>
                            <p className={cn("text-xs", bill.paid ? "text-green-600" : "text-blue-600")}>{bill.paid ? "Settled" : "Paid"}</p>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 border border-blue-200 font-medium">
                            {payer}{bill.split_preset === "default" ? ` · ${daysInPeriod}d` : ""}{payerIncluded && hasSplit && ` · ${formatMoney(payerShare)}`}
                          </span>
                          {guestChipNames.map(guestName => {
                            const included = selectedGuestNames.has(guestName)
                            const guestDays = guestDaysByName.get(guestName) ?? 0
                            return (
                              <button
                                key={`${bill.id}-${guestName}-card`}
                                onClick={() => toggleStayInBill(bill, guestName, defaultSelectedNames)}
                                className={cn(
                                  "inline-flex items-center px-2 py-0.5 rounded-full text-xs border cursor-pointer transition-all",
                                  included
                                    ? "bg-blue-500 text-white border-blue-500"
                                    : "bg-white text-gray-400 border-gray-200 hover:border-blue-300 hover:text-blue-500",
                                )}
                              >
                                {guestName}{bill.split_preset === "default" ? ` · ${guestDays}d` : ""}{included && ` · ${formatMoney(shareFor(guestName))}`}
                              </button>
                            )
                          })}
                        </div>
                        <div className="mt-2 flex justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 cursor-pointer text-gray-400 hover:text-gray-700">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem className="cursor-pointer" onClick={() => handleToggleBill(bill)}>
                                <CheckCircle2 className="h-3.5 w-3.5 mr-2" /> {bill.paid ? "Mark Paid" : "Mark Settled"}
                              </DropdownMenuItem>
                              <DropdownMenuItem className="cursor-pointer" onClick={() => { setEditingBill(bill); setBillDialogOpen(true) }}>
                                <Edit className="h-3.5 w-3.5 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={() => setDeleteBill_(bill)}>
                                <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {editingReading && (
        <UtilityDialog
          open={!!editingReading}
          onOpenChange={open => { if (!open) setEditingReading(null) }}
          onSave={(usage, readingDate, meterName, details) => handleUpdateReading(editingReading, usage, readingDate, meterName, details)}
          utilityName={editingReading.name}
          unit={editingReading.unit}
          meters={meterOptions}
          initialReadingDate={editingReading.date ? new Date(editingReading.date).toISOString().split("T")[0] : undefined}
          initialUsage={editingReading.parts?.find(part => part.label === "1")?.value ?? editingReading.value}
          initialSecondaryUsage={editingReading.parts?.find(part => part.label === "2")?.value}
          stays={stays}
        />
      )}

      <UtilityDialog
        open={isReadingDialogOpen}
        onOpenChange={setIsReadingDialogOpen}
        onSave={handleAddReading}
        meters={meterOptions}
        stays={stays}
      />

      <BillDialog
        open={billDialogOpen}
        onOpenChange={open => { if (!open) { setBillDialogOpen(false); setEditingBill(null) } }}
        onSave={
          editingBill
            ? (name, amount, period, periodEnd, settled, paidBy, splitBetween, splitPreset, splitWeights) =>
              handleEditBill(editingBill.id, name, amount, period, periodEnd, settled, paidBy, splitBetween, splitPreset, splitWeights)
            : handleAddBill
        }
        stays={stays}
        payerSuggestions={payerSuggestions}
        initialName={editingBill?.name}
        initialAmount={editingBill?.amount}
        initialPeriod={editingBill?.due_date ? editingBill.due_date.slice(0, 7) : undefined}
        initialPeriodEnd={editingBill?.period_end ? editingBill.period_end.slice(0, 7) : undefined}
        initialSettled={editingBill?.paid ?? false}
        initialPaidBy={editingBill?.paid_by || "Mama"}
        initialSplitBetween={editingBill?.split_between}
        initialSplitPreset={editingBill?.split_preset ?? "default"}
        initialSplitWeights={editingBill?.split_weights ?? {}}
        mode={editingBill ? "edit" : "create"}
      />

      <ConfirmDeleteDialog
        open={!!deleteBill_}
        onOpenChange={open => { if (!open) setDeleteBill_(null) }}
        onConfirm={handleDeleteBill}
        itemName={deleteBill_?.name}
      />

      <ConfirmDeleteDialog
        open={!!deleteReading}
        onOpenChange={open => { if (!open) setDeleteReading(null) }}
        onConfirm={handleDeleteReading}
        itemName={deleteReading ? `${deleteReading.name} ${shortDate(deleteReading.date)}` : undefined}
      />
    </div>
  )
}
