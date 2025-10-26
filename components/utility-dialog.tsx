"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface UtilityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (usage: number, cost: number) => void
  utilityName: string
  unit: string
}

export function UtilityDialog({ open, onOpenChange, onSave, utilityName, unit }: UtilityDialogProps) {
  const [usage, setUsage] = useState("")
  const [cost, setCost] = useState("")

  const handleSave = () => {
    if (usage && cost) {
      onSave(Number.parseFloat(usage), Number.parseFloat(cost))
      setUsage("")
      setCost("")
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Update {utilityName} Reading</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="usage">Usage ({unit})</Label>
            <Input
              id="usage"
              type="number"
              placeholder={`Enter usage in ${unit}`}
              value={usage}
              onChange={(e) => setUsage(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cost">Cost ($)</Label>
            <Input
              id="cost"
              type="number"
              step="0.01"
              placeholder="Enter cost"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!usage || !cost}>
            Update
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
