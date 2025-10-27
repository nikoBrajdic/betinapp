"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Search, Edit, Trash2, Users, Calendar, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"
import { GuestStayDialog } from "@/components/guest-stay-dialog"
import { createGuestStay, updateGuestStay, deleteGuestStay } from "@/lib/actions/guest-stays"
import { useRouter } from "next/navigation"
import { CalendarSidebar } from "@/components/calendar-sidebar"
import { getEvents } from "@/lib/actions/events"

interface GuestStay {
  id: string
  guest_name: string
  room: string
  from_date: string
  to_date: string
  status: "upcoming" | "current" | "past"
  notes: string
  updated_at: string
  event_id?: string
}

interface Event {
  id: string
  title: string
  description: string
  start_date: string
  end_date: string | null
  time: string | null
  category: "family" | "maintenance" | "appointment" | "other"
  created_at: string
  updated_at: string
}

interface GuestStaysClientProps {
  guests: GuestStay[]
  events: Event[]
}

export function GuestStaysClient({ guests, events }: GuestStaysClientProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingGuest, setEditingGuest] = useState<GuestStay | null>(null)
  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const router = useRouter()
  const dragStartRef = useRef<boolean>(false)

  const filteredGuests = guests.filter(
    (guest) =>
      guest.guest_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guest.room.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guest.status.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const getStatusColor = (status: GuestStay["status"]) => {
    switch (status) {
      case "upcoming":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400"
      case "current":
        return "bg-green-500/10 text-green-700 dark:text-green-400"
      case "past":
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400"
    }
  }

  const upcomingGuests = guests.filter(g => g.status === "upcoming").length
  const currentGuests = guests.filter(g => g.status === "current").length
  const pastGuests = guests.filter(g => g.status === "past").length

  const handleAddGuest = () => {
    setEditingGuest(null)
    setIsDialogOpen(true)
  }

  const handleEditGuest = (guest: GuestStay) => {
    setEditingGuest(guest)
    setIsDialogOpen(true)
  }

  const handleSaveGuest = async (guestData: Omit<GuestStay, "id" | "updated_at">) => {
    try {
      if (editingGuest) {
        // Update existing guest
        await updateGuestStay(editingGuest.id, {
          guestName: guestData.guest_name,
          room: guestData.room,
          checkIn: guestData.from_date,
          checkOut: guestData.to_date,
          status: guestData.status,
          notes: guestData.notes,
        })
      } else {
        // Add new guest
        await createGuestStay({
          guestName: guestData.guest_name,
          room: guestData.room,
          checkIn: guestData.from_date,
          checkOut: guestData.to_date,
          status: guestData.status,
          notes: guestData.notes,
        })
      }
      router.refresh()
    } catch (error) {
      console.error("Failed to save guest stay:", error)
    }
  }

  const handleDeleteGuest = async (id: string) => {
    if (confirm("Are you sure you want to delete this guest stay?")) {
      try {
        await deleteGuestStay(id)
        router.refresh()
      } catch (error) {
        console.error("Failed to delete guest stay:", error)
      }
    }
  }

  const handleGuestNameClick = (guest: GuestStay) => {
    handleEditGuest(guest)
  }

  const handleRowClick = (guest: GuestStay) => {
    if (!dragStartRef.current && guest.event_id) {
      setHighlightedEventId(guest.event_id)
      // Set the date to the start date of the guest stay
      setSelectedDate(new Date(guest.from_date))
    }
    dragStartRef.current = false
  }

  const handleRowMouseDown = () => {
    dragStartRef.current = false
  }

  const handleRowMouseMove = () => {
    dragStartRef.current = true
  }

  return (
    <div className="flex h-screen">
      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Guest Stays</h1>
            <p className="text-muted-foreground">Manage guest accommodations and visits</p>
          </div>
          <Button onClick={handleAddGuest}>
            <Plus className="h-4 w-4 mr-2" />
            Add Guest Stay
          </Button>
        </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Upcoming</p>
              <p className="text-2xl font-bold text-blue-600">{upcomingGuests}</p>
            </div>
            <Calendar className="h-8 w-8 text-blue-600" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Current</p>
              <p className="text-2xl font-bold text-green-600">{currentGuests}</p>
            </div>
            <Users className="h-8 w-8 text-green-600" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Past</p>
              <p className="text-2xl font-bold text-gray-600">{pastGuests}</p>
            </div>
            <Users className="h-8 w-8 text-gray-600" />
          </div>
        </Card>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search guests, rooms, or status..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredGuests.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {searchQuery ? "No guests found" : "No guest stays yet"}
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery ? "Try adjusting your search terms" : "Add your first guest stay to get started"}
          </p>
          {!searchQuery && (
            <Button onClick={handleAddGuest}>
              <Plus className="h-4 w-4 mr-2" />
              Add Guest Stay
            </Button>
          )}
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guest Name</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Check-out</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGuests.map((guest) => (
                <TableRow 
                  key={guest.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(guest)}
                  onMouseDown={handleRowMouseDown}
                  onMouseMove={handleRowMouseMove}
                >
                  <TableCell 
                    className="font-medium cursor-pointer hover:text-primary"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleGuestNameClick(guest)
                    }}
                  >
                    {guest.guest_name}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      {guest.room}
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(guest.from_date).toLocaleDateString("en-US", { 
                      month: "short", 
                      day: "numeric",
                      year: "numeric"
                    })}
                  </TableCell>
                  <TableCell>
                    {new Date(guest.to_date).toLocaleDateString("en-US", { 
                      month: "short", 
                      day: "numeric",
                      year: "numeric"
                    })}
                  </TableCell>
                  <TableCell>
                    <span className={cn("px-2 py-1 rounded-full text-xs font-medium", getStatusColor(guest.status))}>
                      {guest.status.charAt(0).toUpperCase() + guest.status.slice(1)}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{guest.notes || "-"}</TableCell>
                  <TableCell>
                    {new Date(guest.updated_at).toLocaleDateString("en-US", { 
                      month: "short", 
                      day: "numeric",
                      year: "numeric"
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEditGuest(guest)}
                      >
                        <Edit className="h-4 w-4" />
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
      </div>

      {/* Calendar Preview Sidebar */}
      <CalendarSidebar
        isOpen={true}
        onClose={() => setSelectedDate(null)}
        selectedDate={selectedDate}
        events={events}
        onAddEvent={() => {}}
        onEditEvent={() => {}}
        onDeleteEvent={() => {}}
        isEventDialogOpen={isDialogOpen}
      />

      <GuestStayDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        guestStay={editingGuest}
        onSave={handleSaveGuest}
      />
    </div>
  )
}