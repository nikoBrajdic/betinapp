"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

interface GuestStay {
  id: string
  guest_name: string
  room: string
  from_date: string
  to_date: string
  status: "upcoming" | "current" | "past"
  notes: string
  updated_at: string
}

interface GuestStayDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  guestStay?: GuestStay | null
  onSave: (guestStay: Omit<GuestStay, "id" | "updated_at">) => void
}

export function GuestStayDialog({ open, onOpenChange, guestStay, onSave }: GuestStayDialogProps) {
  const [guestName, setGuestName] = useState("")
  const [room, setRoom] = useState("")
  const [checkIn, setCheckIn] = useState("")
  const [checkOut, setCheckOut] = useState("")
  const [status, setStatus] = useState<"upcoming" | "current" | "past">("upcoming")
  const [notes, setNotes] = useState("")

  useEffect(() => {
    if (guestStay) {
      setGuestName(guestStay.guest_name)
      setRoom(guestStay.room)
      setCheckIn(guestStay.from_date)
      setCheckOut(guestStay.to_date)
      setStatus(guestStay.status)
      setNotes(guestStay.notes)
    } else {
      setGuestName("")
      setRoom("")
      setCheckIn("")
      setCheckOut("")
      setStatus("upcoming")
      setNotes("")
    }
  }, [guestStay, open])

  const handleSave = () => {
    if (!guestName.trim() || !room.trim() || !checkIn || !checkOut) return

    onSave({
      guest_name: guestName.trim(),
      room: room.trim(),
      from_date: checkIn,
      to_date: checkOut,
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
            {guestStay ? "Edit Guest Stay" : "Add New Guest Stay"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="guestName">Guest Name</Label>
            <Input
              id="guestName"
              placeholder="Enter guest name"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="room">Room</Label>
            <Input
              id="room"
              placeholder="Enter room name/number"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="checkIn">Check-in Date</Label>
              <Input
                id="checkIn"
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="checkOut">Check-out Date</Label>
              <Input
                id="checkOut"
                type="date"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(value: "upcoming" | "current" | "past") => setStatus(value)}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="current">Current</SelectItem>
                <SelectItem value="past">Past</SelectItem>
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
          <Button onClick={handleSave} disabled={!guestName.trim() || !room.trim() || !checkIn || !checkOut}>
            {guestStay ? "Update" : "Add"} Guest Stay
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
