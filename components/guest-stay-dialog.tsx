"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type StayType = "family" | "friend"

interface Stay {
  id?: string
  guest_name: string
  room: string
  from_date: string
  to_date: string
  status: string
  notes: string
  type: StayType
}

interface GuestStayDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  stay?: Stay | null
  familyMembers: { name: string; email: string }[]
  onSave: (data: {
    guestName: string
    room: string
    checkIn: string
    checkOut: string
    notes: string
    type: StayType
  }) => void
}

export function GuestStayDialog({ open, onOpenChange, stay, familyMembers, onSave }: GuestStayDialogProps) {
  const [name, setName] = useState("")
  const [room, setRoom] = useState("")
  const [checkIn, setCheckIn] = useState("")
  const [checkOut, setCheckOut] = useState("")
  const [notes, setNotes] = useState("")
  const [type, setType] = useState<StayType>("friend")

  useEffect(() => {
    if (open) {
      setName(stay?.id ? stay.guest_name : "")
      setRoom(stay?.room ?? "")
      setCheckIn(stay?.from_date ?? "")
      setCheckOut(stay?.to_date ?? "")
      setNotes(stay?.notes ?? "")
      setType((stay?.type as StayType) ?? "friend")
    }
  }, [open, stay])

  const canSave = name.trim() && checkIn && checkOut && checkIn <= checkOut

  const handleSave = () => {
    if (!canSave) return
    onSave({ guestName: name.trim(), room: room.trim(), checkIn, checkOut, notes: notes.trim(), type })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{stay?.id ? "Edit Stay" : stay ? "Duplicate Stay" : "New Stay"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Type toggle */}
          <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit">
            {(["family", "friend"] as StayType[]).map(t => (
              <button
                key={t}
                onClick={() => {
                  setType(t)
                  // Switching to family: keep the name only if it matches a member
                  if (t === "family" && !familyMembers.some(m => m.name.split(" ")[0] === name)) setName("")
                }}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer",
                  type === t
                    ? t === "family"
                      ? "bg-blue-500 text-white shadow-sm"
                      : "bg-violet-500 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                {t === "family" ? "👨‍👩‍👧 Family" : "👫 Friend"}
              </button>
            ))}
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label>Name</Label>
            {type === "family" ? (
              familyMembers.length === 0 ? (
                <p className="text-sm text-gray-400">
                  No approved family members yet. Add emails in Admin → Manage.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {familyMembers.map(m => {
                    const firstName = m.name.split(" ")[0]
                    const selected = name === firstName
                    return (
                      <button
                        key={m.email}
                        type="button"
                        onClick={() => setName(firstName)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors cursor-pointer",
                          selected
                            ? "bg-blue-500 text-white border-blue-500"
                            : "bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-500"
                        )}
                      >
                        {firstName}
                      </button>
                    )
                  })}
                </div>
              )
            ) : (
              <Input
                placeholder="e.g. Marko"
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
              />
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Arrival</Label>
              <Input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Departure</Label>
              <Input type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} min={checkIn} />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes <span className="text-gray-400 font-normal">(optional)</span></Label>
            <Textarea
              placeholder="Anything to remember…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">Cancel</Button>
          <Button onClick={handleSave} disabled={!canSave} className="cursor-pointer">
            {stay?.id ? "Save" : "Add Stay"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
