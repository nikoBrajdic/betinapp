"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Home, Calendar, User, Pencil, Trash2 } from "lucide-react"
import { GuestDialog } from "@/components/guest-dialog"
import { cn } from "@/lib/utils"

interface Guest {
  id: string
  name: string
  email: string
  phone: string
  checkIn: Date
  checkOut: Date
  room: string
  status: "upcoming" | "current" | "past"
  notes: string
}

export default function GuestStaysPage() {
  const [guests, setGuests] = useState<Guest[]>([
    {
      id: "1",
      name: "Sarah Johnson",
      email: "sarah.j@email.com",
      phone: "(555) 123-4567",
      checkIn: new Date("2025-11-15"),
      checkOut: new Date("2025-11-18"),
      room: "Guest Room 1",
      status: "upcoming",
      notes: "Vegetarian, arriving late evening",
    },
    {
      id: "2",
      name: "Michael Chen",
      email: "m.chen@email.com",
      phone: "(555) 987-6543",
      checkIn: new Date("2025-10-20"),
      checkOut: new Date("2025-10-23"),
      room: "Guest Room 2",
      status: "past",
      notes: "Business trip, early checkout needed",
    },
  ])

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null)

  const handleAddGuest = (
    name: string,
    email: string,
    phone: string,
    checkIn: Date,
    checkOut: Date,
    room: string,
    notes: string,
  ) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const checkInDate = new Date(checkIn)
    checkInDate.setHours(0, 0, 0, 0)
    const checkOutDate = new Date(checkOut)
    checkOutDate.setHours(0, 0, 0, 0)

    let status: Guest["status"] = "upcoming"
    if (checkOutDate < today) {
      status = "past"
    } else if (checkInDate <= today && checkOutDate >= today) {
      status = "current"
    }

    const newGuest: Guest = {
      id: Date.now().toString(),
      name,
      email,
      phone,
      checkIn,
      checkOut,
      room,
      status,
      notes,
    }
    setGuests([newGuest, ...guests])
  }

  const handleEditGuest = (
    id: string,
    name: string,
    email: string,
    phone: string,
    checkIn: Date,
    checkOut: Date,
    room: string,
    notes: string,
  ) => {
    setGuests(
      guests.map((guest) =>
        guest.id === id ? { ...guest, name, email, phone, checkIn, checkOut, room, notes } : guest,
      ),
    )
  }

  const handleDeleteGuest = (id: string) => {
    setGuests(guests.filter((guest) => guest.id !== id))
  }

  const openEditDialog = (guest: Guest) => {
    setEditingGuest(guest)
    setIsDialogOpen(true)
  }

  const closeDialog = () => {
    setIsDialogOpen(false)
    setEditingGuest(null)
  }

  const getStatusColor = (status: Guest["status"]) => {
    switch (status) {
      case "upcoming":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400"
      case "current":
        return "bg-green-500/10 text-green-700 dark:text-green-400"
      case "past":
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400"
    }
  }

  const upcomingGuests = guests.filter((g) => g.status === "upcoming")
  const currentGuests = guests.filter((g) => g.status === "current")
  const pastGuests = guests.filter((g) => g.status === "past")

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Guest Stays</h1>
          <p className="text-muted-foreground">Manage guest bookings and information</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Guest
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-sm font-medium text-muted-foreground">Upcoming</h3>
          </div>
          <p className="text-2xl font-bold text-foreground">{upcomingGuests.length}</p>
          <p className="text-sm text-muted-foreground mt-1">Future bookings</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Home className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-sm font-medium text-muted-foreground">Current</h3>
          </div>
          <p className="text-2xl font-bold text-foreground">{currentGuests.length}</p>
          <p className="text-sm text-muted-foreground mt-1">Guests staying now</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gray-500/10 rounded-lg">
              <User className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </div>
            <h3 className="text-sm font-medium text-muted-foreground">Past</h3>
          </div>
          <p className="text-2xl font-bold text-foreground">{pastGuests.length}</p>
          <p className="text-sm text-muted-foreground mt-1">Previous guests</p>
        </Card>
      </div>

      {/* Guest List */}
      {guests.length === 0 ? (
        <Card className="p-12 text-center">
          <Home className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No guests yet</h3>
          <p className="text-muted-foreground mb-4">Add your first guest to start tracking stays</p>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Guest
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Upcoming Guests */}
          {upcomingGuests.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-4">Upcoming Guests</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingGuests.map((guest) => (
                  <Card key={guest.id} className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground mb-1">{guest.name}</h3>
                        <Badge className={cn("text-xs", getStatusColor(guest.status))}>{guest.status}</Badge>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(guest)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteGuest(guest.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {guest.checkIn.toLocaleDateString("en-US", { month: "short", day: "numeric" })} -{" "}
                          {guest.checkOut.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Home className="h-4 w-4" />
                        <span>{guest.room}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>{guest.email}</span>
                      </div>
                      {guest.notes && (
                        <p className="text-muted-foreground mt-3 pt-3 border-t border-border">{guest.notes}</p>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Current Guests */}
          {currentGuests.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-4">Current Guests</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentGuests.map((guest) => (
                  <Card key={guest.id} className="p-6 border-primary/50">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground mb-1">{guest.name}</h3>
                        <Badge className={cn("text-xs", getStatusColor(guest.status))}>{guest.status}</Badge>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(guest)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteGuest(guest.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {guest.checkIn.toLocaleDateString("en-US", { month: "short", day: "numeric" })} -{" "}
                          {guest.checkOut.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Home className="h-4 w-4" />
                        <span>{guest.room}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>{guest.email}</span>
                      </div>
                      {guest.notes && (
                        <p className="text-muted-foreground mt-3 pt-3 border-t border-border">{guest.notes}</p>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Past Guests */}
          {pastGuests.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-4">Past Guests</h2>
              <Card className="p-6">
                <div className="space-y-3">
                  {pastGuests.map((guest) => (
                    <div
                      key={guest.id}
                      className="flex items-center justify-between p-4 border border-border rounded-lg opacity-75"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium text-foreground">{guest.name}</h3>
                          <Badge className={cn("text-xs", getStatusColor(guest.status))}>{guest.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {guest.checkIn.toLocaleDateString("en-US", { month: "short", day: "numeric" })} -{" "}
                          {guest.checkOut.toLocaleDateString("en-US", { month: "short", day: "numeric" })} •{" "}
                          {guest.room}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteGuest(guest.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      <GuestDialog
        open={isDialogOpen}
        onOpenChange={closeDialog}
        onSave={
          editingGuest
            ? (name, email, phone, checkIn, checkOut, room, notes) =>
                handleEditGuest(editingGuest.id, name, email, phone, checkIn, checkOut, room, notes)
            : handleAddGuest
        }
        initialName={editingGuest?.name}
        initialEmail={editingGuest?.email}
        initialPhone={editingGuest?.phone}
        initialCheckIn={editingGuest?.checkIn}
        initialCheckOut={editingGuest?.checkOut}
        initialRoom={editingGuest?.room}
        initialNotes={editingGuest?.notes}
        mode={editingGuest ? "edit" : "create"}
      />
    </div>
  )
}
