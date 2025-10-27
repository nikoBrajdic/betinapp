"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarIcon, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { getLocalDateString, formatDateString, formatDateShort } from "@/lib/utils/date"
import { EventViewModal } from "@/components/event-view-modal"

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
  isEventDialogOpen?: boolean
}

export function CalendarSidebar({ 
  isOpen, 
  onClose, 
  selectedDate, 
  events, 
  onAddEvent, 
  onEditEvent, 
  onDeleteEvent,
  isEventDialogOpen = false
}: CalendarSidebarProps) {
  const [upcomingDays, setUpcomingDays] = useState("7")
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [viewingEvent, setViewingEvent] = useState<Event | null>(null)
  const modalJustClosedRef = useRef(false)

  // Handle ESC key to clear date selection (only when no modals are open)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selectedDate && !isViewModalOpen && !isEventDialogOpen && !modalJustClosedRef.current) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [selectedDate, onClose, isViewModalOpen, isEventDialogOpen])

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
    const today = new Date()
    const daysAhead = parseInt(upcomingDays)
    const endDate = new Date(today)
    endDate.setDate(today.getDate() + daysAhead)
    
    return events.filter(event => {
      const eventStartDate = new Date(event.start_date)
      const eventEndDate = event.end_date ? new Date(event.end_date) : eventStartDate
      
      // Include event if:
      // 1. Event starts within the upcoming period, OR
      // 2. Event ends within the upcoming period, OR  
      // 3. Event spans across the upcoming period
      return (eventStartDate <= endDate && eventEndDate >= today)
    }).sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
  }

  const getEventsForDate = (date: Date) => {
    const dateStr = getLocalDateString(date)
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
    modalJustClosedRef.current = true
    // Clear the flag after a short delay to prevent ESC from clearing date immediately
    setTimeout(() => {
      modalJustClosedRef.current = false
    }, 100)
  }

  const upcomingEvents = getUpcomingEvents()
  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : []
  
  // Use selected date events if a date is selected, otherwise use upcoming events
  const eventsToShow = selectedDate ? selectedDateEvents : upcomingEvents
  
  // Group events by date for better display
  const groupedEvents = eventsToShow.reduce((groups, event) => {
    const eventDate = event.start_date
    if (!groups[eventDate]) {
      groups[eventDate] = []
    }
    groups[eventDate].push(event)
    return groups
  }, {} as Record<string, Event[]>)

  const sortedEventDates = Object.keys(groupedEvents).sort()

  return (
    <>
      {/* Sidebar */}
      <div className="w-96 bg-background border-l border-border h-full overflow-y-auto">
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
            {selectedDate && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onClose()}
                className="text-xs font-medium"
              >
                Clear
              </Button>
            )}
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
            <div className="space-y-4">
              {sortedEventDates.map((dateStr) => {
                const eventsForDate = groupedEvents[dateStr]
                const isSelectedDate = selectedDate && dateStr === getLocalDateString(selectedDate)
                
                return (
                  <div key={dateStr} className={cn(
                    "space-y-2",
                    isSelectedDate && "bg-primary/5 p-3 rounded-lg border border-primary/20"
                  )}>
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-foreground">
                        {formatDateString(dateStr)}
                      </h3>
                      {isSelectedDate && (
                        <span className="text-xs text-primary font-medium">Selected</span>
                      )}
                    </div>
                    <div className="space-y-2">
                      {eventsForDate.map((event) => (
                        <Card key={event.id} className="p-3 cursor-pointer hover:bg-muted/50" onClick={() => openViewModal(event)}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
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
                              {event.end_date && event.end_date !== event.start_date && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Until {formatDateShort(event.end_date)}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-1 ml-2">
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
                  </div>
                )
              })}
            </div>

            {/* Empty State */}
            {eventsToShow.length === 0 && (
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

      {/* Modals */}
      <EventViewModal
        open={isViewModalOpen}
        onOpenChange={closeViewModal}
        event={viewingEvent}
        onEdit={() => {
          if (viewingEvent) {
            closeViewModal()
            // Edit functionality removed from sidebar
          }
        }}
        onDelete={() => {
          if (viewingEvent) {
            onDeleteEvent(viewingEvent.id)
            closeViewModal()
          }
        }}
        onEditSave={async (id: string, title: string, description: string, startDate: Date | string | null, endDate: Date | string | null, time: string, category: Event["category"], created_at?: string) => {
          try {
            if (!startDate) {
              console.error("Start date is required")
              return
            }
            
            // Find the original event to get created_at if not provided
            const originalEvent = events.find(e => e.id === id)
            const createdAt = created_at || originalEvent?.created_at || new Date().toISOString()
            
            const updatedEvent: Event = {
              id,
              title,
              description,
              start_date: startDate instanceof Date ? startDate.toISOString().split('T')[0] : startDate,
              end_date: endDate ? (endDate instanceof Date ? endDate.toISOString().split('T')[0] : endDate) : null,
              time,
              category,
              created_at: createdAt,
              updated_at: new Date().toISOString(),
            }
            await onEditEvent(updatedEvent)
          } catch (error) {
            console.error("Failed to update event:", error)
          }
        }}
      />

    </>
  )
}
