"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface EventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (
    id: string,
    title: string,
    description: string,
    startDate: Date | string | null,
    endDate: Date | string | null,
    time: string,
    category: "family" | "maintenance" | "appointment" | "other",
    created_at?: string,
  ) => void
  initialDate?: Date | null
  initialTitle?: string
  initialDescription?: string
  initialStartDate?: Date
  initialEndDate?: Date | null
  initialTime?: string
  initialCategory?: "family" | "maintenance" | "appointment" | "other"
  initialId?: string
  initialCreatedAt?: string
  mode: "create" | "edit"
}

export function EventDialog({ 
  open, 
  onOpenChange, 
  onSave, 
  initialDate = null,
  initialTitle = "",
  initialDescription = "",
  initialStartDate,
  initialEndDate = null,
  initialTime = "",
  initialCategory = "other",
  initialId = "",
  initialCreatedAt,
  mode
}: EventDialogProps) {
  const [title, setTitle] = useState(initialTitle)
  const [description, setDescription] = useState(initialDescription)
  const [startDate, setStartDate] = useState(initialStartDate ? initialStartDate.toISOString().split("T")[0] : initialDate ? initialDate.toISOString().split("T")[0] : "")
  const [endDate, setEndDate] = useState(initialEndDate ? initialEndDate.toISOString().split("T")[0] : "")
  const [time, setTime] = useState(initialTime || "12:00")
  const [category, setCategory] = useState<"family" | "maintenance" | "appointment" | "other">(initialCategory)
  const [isMultiDay, setIsMultiDay] = useState(!!initialEndDate)

  useEffect(() => {
    if (open) {
      setTitle(initialTitle)
      setDescription(initialDescription)
      setStartDate(initialStartDate ? initialStartDate.toISOString().split("T")[0] : initialDate ? initialDate.toISOString().split("T")[0] : "")
      setEndDate(initialEndDate ? initialEndDate.toISOString().split("T")[0] : "")
      setTime(initialTime || "12:00")
      setCategory(initialCategory)
      setIsMultiDay(!!initialEndDate)
    }
  }, [open, initialTitle, initialDescription, initialStartDate, initialEndDate, initialTime, initialCategory, initialDate])

  const handleSave = () => {
    if (title.trim() && startDate) {
      onSave(initialId, title, description, new Date(startDate), isMultiDay && endDate ? new Date(endDate) : null, time, category, initialCreatedAt || undefined)
      setTitle("")
      setDescription("")
      setStartDate("")
      setEndDate("")
      setTime("12:00")
      setCategory("other")
      setIsMultiDay(false)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create New Event" : "Edit Event"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Enter event title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Enter event description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="bg-background"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="bg-background"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="multiDay"
                checked={isMultiDay}
                onChange={(e) => setIsMultiDay(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="multiDay">Multi-day event</Label>
            </div>
            {isMultiDay && (
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-background"
                />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={category}
              onValueChange={(value: "family" | "maintenance" | "appointment" | "other") => setCategory(value)}
            >
              <SelectTrigger id="category" className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="family">Family</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="appointment">Appointment</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!title.trim() || !startDate}>
            {mode === "create" ? "Create Event" : "Save Event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
