"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface GuestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (
    name: string,
    email: string,
    phone: string,
    checkIn: Date,
    checkOut: Date,
    room: string,
    notes: string,
  ) => void
  initialName?: string
  initialEmail?: string
  initialPhone?: string
  initialCheckIn?: Date
  initialCheckOut?: Date
  initialRoom?: string
  initialNotes?: string
  mode: "create" | "edit"
}

export function GuestDialog({
  open,
  onOpenChange,
  onSave,
  initialName = "",
  initialEmail = "",
  initialPhone = "",
  initialCheckIn = null,
  initialCheckOut = null,
  initialRoom = "",
  initialNotes = "",
  mode,
}: GuestDialogProps) {
  const [name, setName] = useState(initialName)
  const [email, setEmail] = useState(initialEmail)
  const [phone, setPhone] = useState(initialPhone)
  const [checkIn, setCheckIn] = useState(initialCheckIn ? initialCheckIn.toISOString().split("T")[0] : "")
  const [checkOut, setCheckOut] = useState(initialCheckOut ? initialCheckOut.toISOString().split("T")[0] : "")
  const [room, setRoom] = useState(initialRoom)
  const [notes, setNotes] = useState(initialNotes)

  useEffect(() => {
    if (open) {
      setName(initialName)
      setEmail(initialEmail)
      setPhone(initialPhone)
      setCheckIn(initialCheckIn ? initialCheckIn.toISOString().split("T")[0] : "")
      setCheckOut(initialCheckOut ? initialCheckOut.toISOString().split("T")[0] : "")
      setRoom(initialRoom)
      setNotes(initialNotes)
    }
  }, [open, initialName, initialEmail, initialPhone, initialCheckIn, initialCheckOut, initialRoom, initialNotes])

  const handleSave = () => {
    if (name.trim() && checkIn && checkOut && room.trim()) {
      onSave(name, email, phone, new Date(checkIn), new Date(checkOut), room, notes)
      setName("")
      setEmail("")
      setPhone("")
      setCheckIn("")
      setCheckOut("")
      setRoom("")
      setNotes("")
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add New Guest" : "Edit Guest"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Guest Name</Label>
            <Input id="name" placeholder="Enter guest name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="guest@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(555) 123-4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="checkIn">Check-in Date</Label>
              <Input id="checkIn" type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="checkOut">Check-out Date</Label>
              <Input id="checkOut" type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="room">Room</Label>
            <Input id="room" placeholder="Guest Room 1" value={room} onChange={(e) => setRoom(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any special requirements or notes"
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
          <Button onClick={handleSave} disabled={!name.trim() || !checkIn || !checkOut || !room.trim()}>
            {mode === "create" ? "Add Guest" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
