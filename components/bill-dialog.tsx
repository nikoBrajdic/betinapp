"use client"

import { useState, useEffect, useMemo } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, X } from "lucide-react"
import { CURRENCY_SYMBOL } from "@/lib/currency"
import { cn } from "@/lib/utils"

const BILL_NAMES = ["Voda", "Struja", "Internet", "Ježinac", "HRT", "Komunalna naknada"]

type PeriodMode = "month" | "range"
type SplitPreset = "default" | "equal" | "weighted"

interface BillDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (
    name: string,
    amount: number,
    period: string,
    periodEnd: string | null,
    settled: boolean,
    paidBy: string,
    splitBetween: string[],
    splitPreset: SplitPreset,
    splitWeights: Record<string, number>,
  ) => void
  stays: Array<{ guest_name: string; from_date: string; to_date: string }>
  payerSuggestions?: string[]
  initialName?: string
  initialAmount?: number
  initialPeriod?: string
  initialPeriodEnd?: string | null
  initialSettled?: boolean
  initialPaidBy?: string
  initialSplitBetween?: string[]
  initialSplitPreset?: SplitPreset
  initialSplitWeights?: Record<string, number>
  mode: "create" | "edit"
}

function currentPeriod() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function sameList(a: string[], b: string[]) {
  if (a.length !== b.length) return false
  return a.every((item, i) => item === b[i])
}

export function BillDialog({
  open, onOpenChange, onSave,
  stays,
  payerSuggestions = [],
  initialName = "",
  initialAmount = 0,
  initialPeriod,
  initialPeriodEnd,
  initialSettled = false,
  initialPaidBy = "Mama",
  initialSplitBetween = [],
  initialSplitPreset = "default",
  initialSplitWeights = {},
  mode,
}: BillDialogProps) {
  const [name, setName] = useState(initialName || BILL_NAMES[0])
  const [amount, setAmount] = useState(initialAmount > 0 ? initialAmount.toString() : "")
  const [periodMode, setPeriodMode] = useState<PeriodMode>(initialPeriodEnd ? "range" : "month")
  const [period, setPeriod] = useState(initialPeriod ?? currentPeriod())
  const [settled, setSettled] = useState(initialSettled)
  const [paidBy, setPaidBy] = useState(initialPaidBy || "Mama")
  const [splitBetween, setSplitBetween] = useState<string[]>(initialSplitBetween)
  const [splitPreset, setSplitPreset] = useState<SplitPreset>(initialSplitPreset)
  const [splitWeights, setSplitWeights] = useState<Record<string, number>>(initialSplitWeights)
  const [periodEnd, setPeriodEnd] = useState(initialPeriodEnd ?? initialPeriod ?? currentPeriod())
  const [customPayers, setCustomPayers] = useState<string[]>([])
  const [addingPayer, setAddingPayer] = useState(false)
  const [newPayer, setNewPayer] = useState("")
  const [customSplitters, setCustomSplitters] = useState<string[]>([])
  const [addingSplitter, setAddingSplitter] = useState(false)
  const [newSplitter, setNewSplitter] = useState("")

  const occupantsForPeriod = useMemo(() => {
    const [year, month] = period.split("-").map(Number)
    if (!year || !month) return [] as string[]
    const monthStart = new Date(year, month - 1, 1).toISOString().split("T")[0]
    const monthEnd = new Date(year, month, 0).toISOString().split("T")[0]
    const names = new Set(
      stays
        .filter(stay =>
          stay.from_date <= monthEnd &&
          stay.to_date >= monthStart &&
          !stay.guest_name.toLowerCase().includes("vesna")
        )
        .map(stay => stay.guest_name),
    )
    return Array.from(names).sort((a, b) => a.localeCompare(b))
  }, [period, stays])
  const initialSplitKey = (initialSplitBetween ?? []).join("|")
  const initialSplitWeightsKey = JSON.stringify(initialSplitWeights ?? {})

  const residentPayerOptions = useMemo(
    () => Array.from(new Set(occupantsForPeriod)),
    [occupantsForPeriod],
  )
  const allKnownPayerOptions = useMemo(
    () => Array.from(new Set(["Mama", ...payerSuggestions, ...occupantsForPeriod, ...customPayers, paidBy])),
    [payerSuggestions, occupantsForPeriod, customPayers, paidBy],
  )
  const nonResidentSuggestions = useMemo(
    () => allKnownPayerOptions.filter(option => !residentPayerOptions.includes(option)),
    [allKnownPayerOptions, residentPayerOptions],
  )
  const payerPills = Array.from(new Set([
    ...residentPayerOptions,
    ...(customPayers.includes(paidBy) ? [paidBy] : []),
    ...(!residentPayerOptions.includes(paidBy) && !nonResidentSuggestions.includes(paidBy) ? [paidBy] : []),
  ]))
  const allKnownSplitterOptions = useMemo(
    () => Array.from(new Set([
      ...payerSuggestions,
      ...stays.map(stay => stay.guest_name),
      ...occupantsForPeriod,
      ...splitBetween,
      ...customSplitters,
    ])),
    [payerSuggestions, stays, occupantsForPeriod, splitBetween, customSplitters],
  )
  const nonOccupantSplitterSuggestions = useMemo(
    () => allKnownSplitterOptions.filter(option => !occupantsForPeriod.includes(option)),
    [allKnownSplitterOptions, occupantsForPeriod],
  )
  const splitterPills = Array.from(new Set([
    ...occupantsForPeriod,
    ...customSplitters,
    ...splitBetween,
  ]))
  const weightedParticipants = useMemo(
    () => Array.from(new Set([paidBy, ...splitBetween])).filter(Boolean),
    [paidBy, splitBetween],
  )

  const canonicalize = (value: string, options: string[]) => {
    const trimmed = value.trim()
    if (!trimmed) return ""
    const exact = options.find(option => option.trim().toLowerCase() === trimmed.toLowerCase())
    return exact ?? trimmed
  }
  const canonicalizePayer = (value: string) => canonicalize(value, allKnownPayerOptions)
  const canonicalizeSplitter = (value: string) => canonicalize(value, allKnownSplitterOptions)

  useEffect(() => {
    if (!open) return
    const initialPayer = (initialPaidBy || "Mama").trim() || "Mama"
    setName(initialName || BILL_NAMES[0])
    setAmount(initialAmount > 0 ? initialAmount.toString() : "")
    setPeriodMode(initialPeriodEnd ? "range" : "month")
    setPeriod(initialPeriod ?? currentPeriod())
    setPeriodEnd(initialPeriodEnd ?? initialPeriod ?? currentPeriod())
    setSettled(initialSettled)
    setPaidBy(initialPayer)
    setSplitBetween(current => sameList(current, initialSplitBetween) ? current : initialSplitBetween)
    setSplitPreset(initialSplitPreset)
    setSplitWeights(initialSplitWeights ?? {})
    setCustomSplitters(current => {
      const next = initialSplitBetween.filter(name => !occupantsForPeriod.includes(name) && name !== initialPayer)
      return sameList(current, next) ? current : next
    })
    setCustomPayers(current => {
      const shouldBeCustom = initialPayer !== "Mama"
      const next = shouldBeCustom ? [initialPayer] : []
      return sameList(current, next) ? current : next
    })
    setAddingPayer(false)
    setNewPayer("")
    setAddingSplitter(false)
    setNewSplitter("")
  }, [open, initialName, initialAmount, initialPeriod, initialPeriodEnd, initialSettled, initialPaidBy, initialSplitKey, initialSplitPreset, initialSplitWeightsKey])

  useEffect(() => {
    if (!open) return
    if (mode === "create") {
      const defaults = Array.from(new Set([paidBy, ...occupantsForPeriod]))
      setSplitBetween(current => {
        const preservedCustom = current.filter(name => !occupantsForPeriod.includes(name))
        const next = Array.from(new Set([...defaults, ...preservedCustom]))
        return sameList(current, next) ? current : next
      })
      return
    }
  }, [period, paidBy, occupantsForPeriod, open, mode])

  useEffect(() => {
    if (!open || splitPreset !== "weighted") return
    setSplitWeights(current => {
      const next: Record<string, number> = {}
      for (const participant of weightedParticipants) {
        const existing = current[participant]
        next[participant] = typeof existing === "number" && existing > 0 ? existing : 1
      }
      return next
    })
  }, [open, splitPreset, weightedParticipants])

  // Range is valid only when end is on/after start
  const rangeValid = periodMode === "month" || periodEnd >= period
  const canSave = !!name && !!amount && !!period && rangeValid

  const handleSave = () => {
    if (!canSave) return
    const end = periodMode === "range" && periodEnd !== period ? periodEnd : null
    const canonicalPaidBy = canonicalizePayer(paidBy)
    const canonicalSplitBetween = splitBetween.map(name => canonicalizeSplitter(name)).filter(name => name)
    const weightsForSave: Record<string, number> = {}
    if (splitPreset === "weighted") {
      for (const participant of Array.from(new Set([canonicalPaidBy, ...canonicalSplitBetween]))) {
        const value = splitWeights[participant]
        weightsForSave[participant] = typeof value === "number" && value > 0 ? value : 1
      }
    }
    onSave(name, Number.parseFloat(amount), period, end, settled, canonicalPaidBy, canonicalSplitBetween, splitPreset, weightsForSave)
    setName(BILL_NAMES[0])
    setAmount("")
    setPeriodMode("month")
    setPeriod(currentPeriod())
    setPeriodEnd(currentPeriod())
    setSettled(false)
    setPaidBy("Mama")
    setSplitBetween([])
    setSplitPreset("default")
    setSplitWeights({})
    setCustomSplitters([])
    setAddingSplitter(false)
    setNewSplitter("")
    onOpenChange(false)
  }

  const toggleSplitter = (guestName: string) => {
    setSplitBetween(current =>
      current.includes(guestName)
        ? current.filter(name => name !== guestName)
        : [...current, guestName],
    )
  }

  const addCustomPayer = () => {
    const candidate = canonicalizePayer(newPayer)
    if (!candidate) return
    if (!residentPayerOptions.includes(candidate)) {
      setCustomPayers(current => current.includes(candidate) ? current : [...current, candidate])
    }
    setPaidBy(candidate)
    setAddingPayer(false)
    setNewPayer("")
  }

  const addCustomSplitter = () => {
    const candidate = canonicalizeSplitter(newSplitter)
    if (!candidate) return
    setSplitBetween(current => current.includes(candidate) ? current : [...current, candidate])
    if (!occupantsForPeriod.includes(candidate)) {
      setCustomSplitters(current => current.includes(candidate) ? current : [...current, candidate])
    }
    setAddingSplitter(false)
    setNewSplitter("")
  }

  const removePayerOption = (option: string) => {
    setCustomPayers(current => current.filter(name => name !== option))
    if (paidBy === option) {
      const fallback = residentPayerOptions.includes("Mama")
        ? "Mama"
        : residentPayerOptions[0] || "Mama"
      setPaidBy(fallback)
    }
  }

  const removeSplitterOption = (option: string) => {
    setCustomSplitters(current => current.filter(name => name !== option))
    setSplitBetween(current => current.filter(name => name !== option))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Bill" : "Edit Bill"}</DialogTitle>
          <DialogDescription className="sr-only">
            Configure bill amount, period, status, participants, and split preset.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Bill</Label>
            <Select value={name} onValueChange={setName}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BILL_NAMES.map(n => (
                  <SelectItem key={n} value={n}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount ({CURRENCY_SYMBOL})</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Period</Label>
            {/* Month vs range toggle */}
            <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit">
              {(["month", "range"] as PeriodMode[]).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPeriodMode(m)}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer",
                    periodMode === m ? "bg-blue-500 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  {m === "month" ? "Month" : "Range"}
                </button>
              ))}
            </div>

            {periodMode === "month" ? (
              <Input
                type="month"
                value={period}
                onChange={e => setPeriod(e.target.value)}
              />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-400 font-normal">From</Label>
                  <Input type="month" value={period} onChange={e => setPeriod(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-400 font-normal">To</Label>
                  <Input type="month" value={periodEnd} min={period} onChange={e => setPeriodEnd(e.target.value)} />
                </div>
              </div>
            )}
            {!rangeValid && (
              <p className="text-xs text-rose-500">End month must be on or after the start month.</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSettled(false)}
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm border cursor-pointer transition-all ${
                  !settled
                    ? "bg-blue-500 text-white border-blue-500"
                    : "bg-white text-gray-400 border-gray-200 hover:border-blue-300 hover:text-blue-500"
                }`}
              >
                Paid
              </button>
              <button
                type="button"
                onClick={() => setSettled(true)}
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm border cursor-pointer transition-all ${
                  settled
                    ? "bg-green-500 text-white border-green-500"
                    : "bg-white text-gray-400 border-gray-200 hover:border-green-300 hover:text-green-600"
                }`}
              >
                Settled
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Paid by</Label>
            <div className="flex flex-wrap items-center gap-2">
              {payerPills.map(option => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setPaidBy(option)}
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm border cursor-pointer transition-all ${
                    paidBy === option
                      ? "bg-blue-500 text-white border-blue-500"
                      : "bg-white text-gray-400 border-gray-200 hover:border-blue-300 hover:text-blue-500"
                  }`}
                >
                  <span>{option}</span>
                  {(customPayers.includes(option) || !residentPayerOptions.includes(option)) && (
                    <span
                      role="button"
                      aria-label={`Remove ${option}`}
                      onClick={e => {
                        e.preventDefault()
                        e.stopPropagation()
                        removePayerOption(option)
                      }}
                      className="ml-1 inline-flex items-center justify-center rounded-full hover:bg-black/10 p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </span>
                  )}
                </button>
              ))}
              {!addingPayer ? (
                <button
                  type="button"
                  onClick={() => setAddingPayer(true)}
                  className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-gray-200 text-gray-400 hover:border-blue-300 hover:text-blue-500 cursor-pointer transition-all"
                  title="Add payer"
                >
                  <Plus className="h-4 w-4" />
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  <Input
                    value={newPayer}
                    onChange={e => setNewPayer(e.target.value)}
                    placeholder="Name"
                    className="h-8 w-28"
                    list="bill-payer-suggestions"
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addCustomPayer()
                      }
                      if (e.key === "Escape") {
                        setAddingPayer(false)
                        setNewPayer("")
                      }
                    }}
                    autoFocus
                  />
                  <datalist id="bill-payer-suggestions">
                    {nonResidentSuggestions.map(option => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                  <button
                    type="button"
                    onClick={addCustomPayer}
                    className="px-2 py-1 text-xs rounded-md border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600 cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Split between</Label>
            <div className="flex flex-wrap items-center gap-2">
              {splitterPills.length === 0 ? (
                <span className="text-sm text-gray-400">No occupants found for this period.</span>
              ) : (
                splitterPills.map(option => {
                    const selected = splitBetween.includes(option)
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => toggleSplitter(option)}
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm border cursor-pointer transition-all ${
                          selected
                            ? "bg-blue-500 text-white border-blue-500"
                            : "bg-white text-gray-400 border-gray-200 hover:border-blue-300 hover:text-blue-500"
                        }`}
                      >
                        <span>{option}</span>
                        {(customSplitters.includes(option) || !occupantsForPeriod.includes(option)) && (
                          <span
                            role="button"
                            aria-label={`Remove ${option}`}
                            onClick={e => {
                              e.preventDefault()
                              e.stopPropagation()
                              removeSplitterOption(option)
                            }}
                            className="ml-1 inline-flex items-center justify-center rounded-full hover:bg-black/10 p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </span>
                        )}
                      </button>
                    )
                  })
              )}
              {!addingSplitter ? (
                <button
                  type="button"
                  onClick={() => setAddingSplitter(true)}
                  className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-gray-200 text-gray-400 hover:border-blue-300 hover:text-blue-500 cursor-pointer transition-all"
                  title="Add splitter"
                >
                  <Plus className="h-4 w-4" />
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  <Input
                    value={newSplitter}
                    onChange={e => setNewSplitter(e.target.value)}
                    placeholder="Name"
                    className="h-8 w-28"
                    list="bill-splitter-suggestions"
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addCustomSplitter()
                      }
                      if (e.key === "Escape") {
                        setAddingSplitter(false)
                        setNewSplitter("")
                      }
                    }}
                    autoFocus
                  />
                  <datalist id="bill-splitter-suggestions">
                    {nonOccupantSplitterSuggestions.map(option => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                  <button
                    type="button"
                    onClick={addCustomSplitter}
                    className="px-2 py-1 text-xs rounded-md border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600 cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Split preset</Label>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSplitPreset("default")}
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm border cursor-pointer transition-all ${
                  splitPreset === "default"
                    ? "bg-blue-500 text-white border-blue-500"
                    : "bg-white text-gray-400 border-gray-200 hover:border-blue-300 hover:text-blue-500"
                }`}
              >
                Default
              </button>
              <button
                type="button"
                onClick={() => setSplitPreset("equal")}
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm border cursor-pointer transition-all ${
                  splitPreset === "equal"
                    ? "bg-blue-500 text-white border-blue-500"
                    : "bg-white text-gray-400 border-gray-200 hover:border-blue-300 hover:text-blue-500"
                }`}
              >
                Equal split
              </button>
              <button
                type="button"
                onClick={() => setSplitPreset("weighted")}
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm border cursor-pointer transition-all ${
                  splitPreset === "weighted"
                    ? "bg-blue-500 text-white border-blue-500"
                    : "bg-white text-gray-400 border-gray-200 hover:border-blue-300 hover:text-blue-500"
                }`}
              >
                Weighted ratios
              </button>
            </div>
          </div>
          {splitPreset === "weighted" && (
            <div className="space-y-2">
              <Label>Custom ratios</Label>
              <div className="space-y-2">
                {weightedParticipants.map(participant => (
                  <div key={participant} className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 min-w-0 flex-1 truncate">{participant}</span>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={splitWeights[participant] ?? 1}
                      onChange={e => {
                        const raw = Number(e.target.value)
                        const next = Number.isFinite(raw) && raw > 0 ? raw : 1
                        setSplitWeights(current => ({ ...current, [participant]: next }))
                      }}
                      className="h-8 w-24 text-right"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {mode === "create" ? "Add Bill" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
