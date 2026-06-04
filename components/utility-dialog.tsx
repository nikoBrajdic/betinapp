"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface UtilityDialogProps {
  [key: string]: any
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (...args: any[]) => void
  utilityName?: string
  unit?: string
  meters?: Array<{ name: string; unit: string }>
  initialReadingDate?: string
  initialUsage?: number
  initialSecondaryUsage?: number
  stays?: Array<{
    id: string
    guest_name: string
    from_date: string
    to_date: string
  }>
}

function todayString() {
  return new Date().toISOString().split("T")[0]
}

function namesForDate(stays: NonNullable<UtilityDialogProps["stays"]>, date: string) {
  return stays
    .filter(stay => stay.from_date <= date && stay.to_date >= date)
    .map(stay => stay.guest_name)
}

function occupancyText(names: string[]) {
  if (names.length === 0) return "No stays recorded"
  if (names.length === 1) return names[0]
  if (names.length === 2) return names.join(" and ")
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`
}

function isWaterMeter(name: string) {
  const key = name.toLowerCase()
  return key.includes("water") || key.includes("voda")
}

function isCounterMeter(name: string) {
  return isWaterMeter(name) || name.toLowerCase().includes("struja")
}

function counterDigits(name: string) {
  return isWaterMeter(name) ? 5 : 6
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, "")
}

function formatInitialCounter(name: string, value?: number) {
  if (typeof value !== "number") return ""
  const normalized = String(Math.trunc(value))
  return isCounterMeter(name) ? normalized.padStart(counterDigits(name), "0") : normalized
}

export function UtilityDialog({ open, onOpenChange, onSave, utilityName, unit, meters = [], initialReadingDate, initialUsage, initialSecondaryUsage, stays = [] }: UtilityDialogProps) {
  const [usage, setUsage] = useState("")
  const [secondaryUsage, setSecondaryUsage] = useState("")
  const [readingDate, setReadingDate] = useState(initialReadingDate ?? todayString())
  const [selectedMeter, setSelectedMeter] = useState(utilityName ?? meters[0]?.name ?? "")
  const activeMeter = meters.find(meter => meter.name === selectedMeter)
  const activeUnit = activeMeter?.unit ?? unit ?? ""
  const isElectricity = selectedMeter.toLowerCase().includes("struja")
  const isWater = isWaterMeter(selectedMeter)
  const isCounter = isCounterMeter(selectedMeter)
  const digitCount = counterDigits(selectedMeter)
  const presentNames = namesForDate(stays, readingDate)

  useEffect(() => {
    if (open) {
      setReadingDate(initialReadingDate ?? todayString())
      setSelectedMeter(utilityName ?? meters[0]?.name ?? "")
      const nextMeter = utilityName ?? meters[0]?.name ?? ""
      setUsage(formatInitialCounter(nextMeter, initialUsage))
      setSecondaryUsage(formatInitialCounter(nextMeter, initialSecondaryUsage))
    }
  }, [open, initialReadingDate, initialUsage, initialSecondaryUsage, utilityName, meters])

  const handleSave = () => {
    if (usage && (!isElectricity || secondaryUsage) && readingDate && selectedMeter) {
      onSave(
        Number.parseFloat(usage),
        readingDate,
        selectedMeter,
        isElectricity ? { secondaryUsage: Number.parseFloat(secondaryUsage) } : undefined,
      )
      setUsage("")
      setSecondaryUsage("")
      setReadingDate(todayString())
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{utilityName ? `Update ${utilityName} Reading` : "New Reading"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Meter</Label>
            <Select value={selectedMeter} onValueChange={setSelectedMeter} disabled={!!utilityName}>
              <SelectTrigger>
                <SelectValue placeholder="Choose meter" />
              </SelectTrigger>
              <SelectContent>
                {meters.map(meter => (
                  <SelectItem key={meter.name} value={meter.name}>{meter.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="readingDate">Date</Label>
            <Input
              id="readingDate"
              type="date"
              value={readingDate}
              onChange={(e) => setReadingDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="usage">{isElectricity ? "Struja 1" : "Reading"}{activeUnit ? ` (${activeUnit})` : ""}</Label>
            <Input
              id="usage"
              type={isCounter ? "text" : "number"}
              inputMode={isCounter ? "numeric" : undefined}
              placeholder={isCounter ? "48".padStart(digitCount, "0") : activeUnit ? `Enter reading in ${activeUnit}` : "Enter reading"}
              value={usage}
              onChange={(e) => setUsage(isCounter ? digitsOnly(e.target.value) : e.target.value)}
              onBlur={() => {
                if (isCounter && usage) setUsage(usage.padStart(digitCount, "0"))
              }}
            />
          </div>
          {isElectricity && (
            <div className="space-y-2">
              <Label htmlFor="secondaryUsage">Struja 2{activeUnit ? ` (${activeUnit})` : ""}</Label>
              <Input
                id="secondaryUsage"
                type="text"
                inputMode="numeric"
                placeholder="000006"
                value={secondaryUsage}
                onChange={(e) => setSecondaryUsage(digitsOnly(e.target.value))}
                onBlur={() => {
                  if (secondaryUsage) setSecondaryUsage(secondaryUsage.padStart(6, "0"))
                }}
              />
            </div>
          )}
          <div className="rounded-xl bg-gray-50 px-3 py-2 text-sm">
            <div className="text-gray-400">House on this date</div>
            <div className="font-medium text-gray-700">{occupancyText(presentNames)}</div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!usage || (isElectricity && !secondaryUsage) || !readingDate || !selectedMeter}>
            {utilityName ? "Update" : "Add Reading"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
