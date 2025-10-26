"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

interface TableItem {
  id: string
  name: string
  capacity: number
  location: string
  status: "available" | "occupied" | "reserved"
  notes: string
  updated_at: string
}

interface TableDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  table?: TableItem | null
  onSave: (table: Omit<TableItem, "id" | "updated_at">) => void
}

export function TableDialog({ open, onOpenChange, table, onSave }: TableDialogProps) {
  const [name, setName] = useState("")
  const [capacity, setCapacity] = useState(4)
  const [location, setLocation] = useState("")
  const [status, setStatus] = useState<"available" | "occupied" | "reserved">("available")
  const [notes, setNotes] = useState("")

  useEffect(() => {
    if (table) {
      setName(table.name)
      setCapacity(table.capacity)
      setLocation(table.location)
      setStatus(table.status)
      setNotes(table.notes)
    } else {
      setName("")
      setCapacity(4)
      setLocation("")
      setStatus("available")
      setNotes("")
    }
  }, [table, open])

  const handleSave = () => {
    if (!name.trim()) return

    onSave({
      name: name.trim(),
      capacity,
      location: location.trim(),
      status,
      notes: notes.trim(),
    })

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {table ? "Edit Table" : "Add New Table"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Table Name</Label>
            <Input
              id="name"
              placeholder="Enter table name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="capacity">Capacity</Label>
            <Input
              id="capacity"
              type="number"
              min="1"
              max="20"
              value={capacity}
              onChange={(e) => setCapacity(parseInt(e.target.value) || 4)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="Enter location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(value: "available" | "occupied" | "reserved") => setStatus(value)}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="occupied">Occupied</SelectItem>
                <SelectItem value="reserved">Reserved</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Enter any additional notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            {table ? "Update" : "Add"} Table
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
