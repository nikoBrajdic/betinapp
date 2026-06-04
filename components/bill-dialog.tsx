"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CURRENCY_SYMBOL } from "@/lib/currency"

const BILL_NAMES = ["Voda", "Struja", "Internet", "Jezinac"]

interface BillDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (name: string, amount: number, period: string) => void
  initialName?: string
  initialAmount?: number
  initialPeriod?: string
  mode: "create" | "edit"
}

function currentPeriod() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

export function BillDialog({
  open, onOpenChange, onSave,
  initialName = "", initialAmount = 0, initialPeriod, mode,
}: BillDialogProps) {
  const [name, setName] = useState(initialName || BILL_NAMES[0])
  const [amount, setAmount] = useState(initialAmount > 0 ? initialAmount.toString() : "")
  const [period, setPeriod] = useState(initialPeriod ?? currentPeriod())

  useEffect(() => {
    if (open) {
      setName(initialName || BILL_NAMES[0])
      setAmount(initialAmount > 0 ? initialAmount.toString() : "")
      setPeriod(initialPeriod ?? currentPeriod())
    }
  }, [open, initialName, initialAmount, initialPeriod])

  const handleSave = () => {
    if (name && amount && period) {
      onSave(name, Number.parseFloat(amount), period)
      setName(BILL_NAMES[0])
      setAmount("")
      setPeriod(currentPeriod())
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[380px]">
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
          <div className="grid grid-cols-2 gap-4">
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
              <Label htmlFor="period">Period</Label>
              <Input
                id="period"
                type="month"
                value={period}
                onChange={e => setPeriod(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!name || !amount || !period}>
            {mode === "create" ? "Add Bill" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
