"use client"

import { useState, useEffect, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CURRENCY_SYMBOL } from "@/lib/currency"
import { cn } from "@/lib/utils"

const BILL_NAMES = ["Voda", "Struja", "Internet", "Jezinac", "HRT", "Komunalna naknada"]

type PeriodMode = "month" | "range"

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
  ) => void
  stays: Array<{ guest_name: string; from_date: string; to_date: string }>
  initialName?: string
  initialAmount?: number
  initialPeriod?: string
  initialPeriodEnd?: string | null
  initialSettled?: boolean
  initialPaidBy?: string
  initialSplitBetween?: string[]
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
  initialName = "",
  initialAmount = 0,
  initialPeriod,
  initialPeriodEnd,
  initialSettled = false,
  initialPaidBy = "Mama",
  initialSplitBetween = [],
  mode,
}: BillDialogProps) {
  const [name, setName] = useState(initialName || BILL_NAMES[0])
  const [amount, setAmount] = useState(initialAmount > 0 ? initialAmount.toString() : "")
  const [periodMode, setPeriodMode] = useState<PeriodMode>(initialPeriodEnd ? "range" : "month")
  const [period, setPeriod] = useState(initialPeriod ?? currentPeriod())
  const [settled, setSettled] = useState(initialSettled)
  const [paidBy, setPaidBy] = useState(initialPaidBy || "Mama")
  const [splitBetween, setSplitBetween] = useState<string[]>(initialSplitBetween)
  const [periodEnd, setPeriodEnd] = useState(initialPeriodEnd ?? initialPeriod ?? currentPeriod())

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

  const payerOptions = Array.from(new Set(["Mama", ...occupantsForPeriod, paidBy]))

  useEffect(() => {
    if (open) {
      setName(initialName || BILL_NAMES[0])
      setAmount(initialAmount > 0 ? initialAmount.toString() : "")
      setPeriodMode(initialPeriodEnd ? "range" : "month")
      setPeriod(initialPeriod ?? currentPeriod())
      setPeriodEnd(initialPeriodEnd ?? initialPeriod ?? currentPeriod())
      setSettled(initialSettled)
      setPaidBy(initialPaidBy || "Mama")
      setSplitBetween(current => sameList(current, initialSplitBetween) ? current : initialSplitBetween)
    }
  }, [open, initialName, initialAmount, initialPeriod, initialPeriodEnd, initialSettled, initialPaidBy, initialSplitKey])

  useEffect(() => {
    if (!open) return
    if (mode === "create") {
      const defaults = occupantsForPeriod.filter(name => name !== paidBy)
      setSplitBetween(current => sameList(current, defaults) ? current : defaults)
      return
    }
    setSplitBetween(current => {
      const next = current.filter(name => name !== paidBy)
      return sameList(current, next) ? current : next
    })
  }, [period, paidBy, occupantsForPeriod, open, mode])

  // Range is valid only when end is on/after start
  const rangeValid = periodMode === "month" || periodEnd >= period
  const canSave = !!name && !!amount && !!period && rangeValid

  const handleSave = () => {
    if (!canSave) return
    const end = periodMode === "range" && periodEnd !== period ? periodEnd : null
    onSave(name, Number.parseFloat(amount), period, end, settled, paidBy, splitBetween)
    setName(BILL_NAMES[0])
    setAmount("")
    setPeriodMode("month")
    setPeriod(currentPeriod())
    setPeriodEnd(currentPeriod())
    setSettled(false)
    setPaidBy("Mama")
    setSplitBetween([])
    onOpenChange(false)
  }

  const toggleSplitter = (guestName: string) => {
    setSplitBetween(current =>
      current.includes(guestName)
        ? current.filter(name => name !== guestName)
        : [...current, guestName],
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Bill" : "Edit Bill"}</DialogTitle>
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
              {payerOptions.map(option => (
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
                  {option}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Split between</Label>
            <div className="flex flex-wrap items-center gap-2">
              {occupantsForPeriod.length === 0 ? (
                <span className="text-sm text-gray-400">No occupants found for this period.</span>
              ) : (
                occupantsForPeriod
                  .filter(option => option !== paidBy)
                  .map(option => {
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
                        {option}
                      </button>
                    )
                  })
              )}
            </div>
          </div>
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
