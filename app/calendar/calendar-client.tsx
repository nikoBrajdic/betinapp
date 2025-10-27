"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react"
import { EventDialog } from "@/components/event-dialog"
import { CalendarSidebar } from "@/components/calendar-sidebar"
import { cn } from "@/lib/utils"
import { getLocalDateString } from "@/lib/utils/date"
import { createEvent, updateEvent, deleteEvent } from "@/lib/actions/events"
import { useRouter } from "next/navigation"

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

interface CalendarClientProps {
  events: Event[]
}

export function CalendarClient({ events }: CalendarClientProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const router = useRouter()

  const handleAddEvent = async (
    id: string,
    title: string,
    description: string,
    startDate: Date | string | null,
    endDate: Date | string | null,
    time: string,
    category: Event["category"],
    created_at?: string,
  ) => {
    try {
      await createEvent({
        title,
        description,
        startDate: startDate instanceof Date ? startDate.toISOString().split('T')[0] : startDate!,
        endDate: endDate ? (endDate instanceof Date ? endDate.toISOString().split('T')[0] : endDate) : undefined,
        time: time || undefined,
        category,
      })
      router.refresh()
    } catch (error) {
      console.error("Failed to create event:", error)
    }
  }

  const handleEditEvent = async (event: Event) => {
    try {
      await updateEvent(event.id, {
        title: event.title,
        description: event.description,
        startDate: event.start_date,
        endDate: event.end_date || undefined,
        time: event.time || undefined,
        category: event.category,
      })
      router.refresh()
    } catch (error) {
      console.error("Failed to update event:", error)
    }
  }

  const handleDeleteEvent = async (id: string) => {
    try {
      await deleteEvent(id)
      router.refresh()
    } catch (error) {
      console.error("Failed to delete event:", error)
    }
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }
    
    return days
  }

  const getEventsForDate = (date: Date) => {
    const dateStr = getLocalDateString(date)
    
    return events.filter(event => {
      const startDate = event.start_date
      const endDate = event.end_date || event.start_date
      
      // Check if the date falls within the event's date range
      return dateStr >= startDate && dateStr <= endDate
    })
  }

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

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const openAddDialog = (date: Date) => {
    setSelectedDate(date)
    setIsDialogOpen(true)
  }

  const closeDialog = () => {
    setIsDialogOpen(false)
    setSelectedDate(null)
  }

  const days = getDaysInMonth(currentDate)
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  return (
    <div className="flex h-screen">
      {/* Main Calendar Area */}
      <div className="flex-1 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Calendar</h1>
            <p className="text-muted-foreground">Click on any date to view events or add new ones</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Event
            </Button>
          </div>
        </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-foreground">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => navigateMonth("prev")}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigateMonth("next")}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            if (!day) {
              return <div key={index} className="h-24" />
            }

            const dayEvents = getEventsForDate(day)
            const isToday = day.toDateString() === new Date().toDateString()
            const isSelected = selectedDate && day.toDateString() === selectedDate.toDateString()

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "h-24 p-1 border border-border rounded cursor-pointer hover:bg-muted/50 transition-colors",
                  isToday && "bg-primary/10 border-primary",
                  isSelected && "border-primary border-2 bg-primary/5"
                )}
                onClick={() => setSelectedDate(day)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={cn(
                    "text-sm font-medium", 
                    isToday && "text-primary font-bold",
                    isSelected && "text-primary font-bold"
                  )}>
                    {day.getDate()}
                  </span>
                </div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 2).map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between"
                    >
                      <Badge className={cn("text-xs px-1 py-0 flex-1 truncate cursor-default", getCategoryColor(event.category))}>
                        {event.time && `${event.time} `}{event.title}
                      </Badge>
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-xs text-muted-foreground">
                      +{dayEvents.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Card>
      </div>

      {/* Always Visible Sidebar */}
      <CalendarSidebar
        isOpen={true}
        onClose={() => setSelectedDate(null)}
        selectedDate={selectedDate}
        events={events}
        onAddEvent={openAddDialog}
        onEditEvent={handleEditEvent}
        onDeleteEvent={handleDeleteEvent}
        isEventDialogOpen={isDialogOpen}
      />

      <EventDialog
        open={isDialogOpen}
        onOpenChange={closeDialog}
        onSave={handleAddEvent}
        initialDate={selectedDate}
        initialId=""
        mode="create"
      />
    </div>
  )
}
