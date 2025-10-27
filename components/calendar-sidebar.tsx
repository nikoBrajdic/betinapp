"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, CalendarIcon, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { EventViewModal } from "@/components/event-view-modal"
import { EventDialog } from "@/components/event-dialog"

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

interface CalendarSidebarProps {
  isOpen: boolean
  onClose: () => void
  selectedDate: Date | null
  events: Event[]
  onAddEvent: (date: Date) => void
  onEditEvent: (event: Event) => void
  onDeleteEvent: (id: string) => void
}

export function CalendarSidebar({ 
  isOpen, 
  onClose, 
  selectedDate, 
  events, 
  onAddEvent, 
  onEditEvent, 
  onDeleteEvent 
}: CalendarSidebarProps) {
  const [upcomingDays, setUpcomingDays] = useState("7")
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [viewingEvent, setViewingEvent] = useState<Event | null>(null)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)

  const getCategoryColor = (category: Event["category"]) => {
    switch (category) {
      case "family":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400"
      case "maintenance":
        return "bg-orange-500/10 text-orange-700 dark:text-orange-400"
      case "appointment":
        return "bg-green-500/10 text-green-700 dark:text-green-400"
      case "other":
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400"
    }
  }

  const getUpcomingEvents = () => {
    if (!selectedDate) return []
    
    const today = new Date()
    const daysAhead = parseInt(upcomingDays)
    const endDate = new Date(today)
    endDate.setDate(today.getDate() + daysAhead)
    
    return events.filter(event => {
      const eventDate = new Date(event.start_date)
      return eventDate >= today && eventDate <= endDate
    }).sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
  }

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return events.filter(event => {
      const startDate = event.start_date
      const endDate = event.end_date || event.start_date
      return dateStr >= startDate && dateStr <= endDate
    })
  }

  const openViewModal = (event: Event) => {
    setViewingEvent(event)
    setIsViewModalOpen(true)
  }

  const closeViewModal = () => {
    setIsViewModalOpen(false)
    setViewingEvent(null)
  }

  const openEditDialog = (event: Event) => {
    setEditingEvent(event)
    setIsEditDialogOpen(true)
  }

  const closeEditDialog = () => {
    setIsEditDialogOpen(false)
    setEditingEvent(null)
  }

  const handleEditEvent = async (
    id: string,
    title: string,
    description: string,
    startDate: Date | null,
    endDate: Date | null,
    time: string,
    category: Event["category"],
  ) => {
    try {
      if (!startDate) {
        console.error("Start date is required")
        return
      }
      
      const updatedEvent: Event = {
        id,
        title,
        description,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate ? endDate.toISOString().split('T')[0] : null,
        time,
        category,
        created_at: editingEvent!.created_at,
        updated_at: new Date().toISOString(),
      }
      await onEditEvent(updatedEvent)
      closeEditDialog()
    } catch (error) {
      console.error("Failed to update event:", error)
    }
  }

  const upcomingEvents = getUpcomingEvents()
  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : []

  return (
    <>
      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 right-0 w-96 bg-background border-l border-border transform transition-transform duration-300 ease-in-out z-50",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <CalendarIcon className="h-5 w-5 text-muted-foreground" />
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {selectedDate ? "Events" : "Upcoming Events"}
                </h2>
                {selectedDate && (
                  <p className="text-sm text-muted-foreground">
                    {selectedDate.toLocaleDateString("en-US", { 
                      weekday: "long", 
                      year: "numeric", 
                      month: "long", 
                      day: "numeric" 
                    })}
                  </p>
                )}
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {!selectedDate && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-foreground">Show upcoming events</h3>
                  <Select value={upcomingDays} onValueChange={setUpcomingDays}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 day</SelectItem>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Events List */}
            <div className="space-y-3">
              {(selectedDate ? selectedDateEvents : upcomingEvents).map((event) => (
                <Card key={event.id} className="p-4 cursor-pointer hover:bg-muted/50" onClick={() => openViewModal(event)}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={cn("text-xs", getCategoryColor(event.category))}>
                          {event.category}
                        </Badge>
                        {event.time && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {event.time}
                          </div>
                        )}
                      </div>
                      <h4 className="font-medium text-foreground mb-1 truncate">{event.title}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(event.start_date).toLocaleDateString("en-US", { 
                          month: "short", 
                          day: "numeric",
                          year: event.start_date !== event.end_date ? "numeric" : undefined
                        })}
                        {event.end_date && event.end_date !== event.start_date && (
                          <span> - {new Date(event.end_date).toLocaleDateString("en-US", { 
                            month: "short", 
                            day: "numeric",
                            year: "numeric"
                          })}</span>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation()
                          openEditDialog(event)
                        }}
                      >
                        <CalendarIcon className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeleteEvent(event.id)
                        }}
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Empty State */}
            {(selectedDate ? selectedDateEvents : upcomingEvents).length === 0 && (
              <div className="text-center py-8">
                <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {selectedDate ? "No events" : "No upcoming events"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {selectedDate ? "No events scheduled for this date" : `No events in the next ${upcomingDays} days`}
                </p>
                {selectedDate && (
                  <Button onClick={() => onAddEvent(selectedDate)}>
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    Add Event
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40" 
          onClick={onClose}
        />
      )}

      {/* Modals */}
      <EventViewModal
        open={isViewModalOpen}
        onOpenChange={closeViewModal}
        event={viewingEvent}
        onEdit={() => {
          if (viewingEvent) {
            closeViewModal()
            openEditDialog(viewingEvent)
          }
        }}
        onDelete={() => {
          if (viewingEvent) {
            onDeleteEvent(viewingEvent.id)
            closeViewModal()
          }
        }}
      />

      <EventDialog
        open={isEditDialogOpen}
        onOpenChange={closeEditDialog}
        onSave={handleEditEvent}
        initialDate={editingEvent ? new Date(editingEvent.start_date) : undefined}
        initialEndDate={editingEvent?.end_date ? new Date(editingEvent.end_date) : undefined}
        initialTime={editingEvent?.time || undefined}
        initialCategory={editingEvent?.category || "other"}
        mode="edit"
      />
    </>
  )
}
