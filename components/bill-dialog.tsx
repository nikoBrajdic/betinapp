"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

interface BillDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (
    name: string,
    amount: number,
    dueDate: Date,
    category: "utilities" | "rent" | "insurance" | "subscription" | "other",
    recurring: boolean,
  ) => void
  initialName?: string
  initialAmount?: number
  initialDueDate?: Date
  initialCategory?: "utilities" | "rent" | "insurance" | "subscription" | "other"
  initialRecurring?: boolean
  mode: "create" | "edit"
}

export function BillDialog({
  open,
  onOpenChange,
  onSave,
  initialName = "",
  initialAmount = 0,
  initialDueDate = null,
  initialCategory = "other",
  initialRecurring = false,
  mode,
}: BillDialogProps) {
  const [name, setName] = useState(initialName)
  const [amount, setAmount] = useState(initialAmount.toString())
  const [dueDate, setDueDate] = useState(initialDueDate ? initialDueDate.toISOString().split("T")[0] : "")
  const [category, setCategory] = useState<"utilities" | "rent" | "insurance" | "subscription" | "other">(
    initialCategory,
  )
  const [recurring, setRecurring] = useState(initialRecurring)

  useEffect(() => {
    if (open) {
      setName(initialName)
      setAmount(initialAmount.toString())
      setDueDate(initialDueDate ? initialDueDate.toISOString().split("T")[0] : "")
      setCategory(initialCategory)
      setRecurring(initialRecurring)
    }
  }, [open, initialName, initialAmount, initialDueDate, initialCategory, initialRecurring])

  const handleSave = () => {
    if (name.trim() && amount && dueDate) {
      onSave(name, Number.parseFloat(amount), new Date(dueDate), category, recurring)
      setName("")
      setAmount("")
      setDueDate("")
      setCategory("other")
      setRecurring(false)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add New Bill" : "Edit Bill"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Bill Name</Label>
            <Input id="name" placeholder="Enter bill name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={category}
              onValueChange={(value: "utilities" | "rent" | "insurance" | "subscription" | "other") =>
                setCategory(value)
              }
            >
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="utilities">Utilities</SelectItem>
                <SelectItem value="rent">Rent</SelectItem>
                <SelectItem value="insurance">Insurance</SelectItem>
                <SelectItem value="subscription">Subscription</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="recurring" checked={recurring} onCheckedChange={(checked) => setRecurring(!!checked)} />
            <Label htmlFor="recurring" className="text-sm font-normal cursor-pointer">
              This is a recurring bill
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || !amount || !dueDate}>
            {mode === "create" ? "Add Bill" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
