"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react"
import { EventDialog } from "@/components/event-dialog"
import { cn } from "@/lib/utils"

interface Event {
  id: string
  title: string
  description: string
  date: Date
  time: string
  category: "family" | "maintenance" | "appointment" | "other"
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<Event[]>([
    {
      id: "1",
      title: "Family Dinner",
      description: "Weekly family dinner at home",
      date: new Date("2025-10-26"),
      time: "18:00",
      category: "family",
    },
    {
      id: "2",
      title: "HVAC Maintenance",
      description: "Annual HVAC system checkup",
      date: new Date("2025-11-05"),
      time: "10:00",
      category: "maintenance",
    },
    {
      id: "3",
      title: "Doctor Appointment",
      description: "Annual checkup with Dr. Smith",
      date: new Date("2025-11-08"),
      time: "14:30",
      category: "appointment",
    },
  ])

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const handleAddEvent = (
    title: string,
    description: string,
    date: Date,
    time: string,
    category: Event["category"],
  ) => {
    const newEvent: Event = {
      id: Date.now().toString(),
      title,
      description,
      date,
      time,
      category,
    }
    setEvents([...events, newEvent])
  }

  const handleDeleteEvent = (id: string) => {
    setEvents(events.filter((event) => event.id !== id))
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    return { daysInMonth, startingDayOfWeek }
  }

  const getEventsForDate = (date: Date) => {
    return events.filter(
      (event) =>
        event.date.getDate() === date.getDate() &&
        event.date.getMonth() === date.getMonth() &&
        event.date.getFullYear() === date.getFullYear(),
    )
  }

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  }

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate)
  const monthName = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })

  const getCategoryColor = (category: Event["category"]) => {
    switch (category) {
      case "family":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400"
      case "maintenance":
        return "bg-orange-500/10 text-orange-700 dark:text-orange-400"
      case "appointment":
        return "bg-purple-500/10 text-purple-700 dark:text-purple-400"
      case "other":
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400"
    }
  }

  const upcomingEvents = events
    .filter((event) => event.date >= new Date())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 5)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Calendar</h1>
          <p className="text-muted-foreground">Manage household events and appointments</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Event
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar View */}
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-foreground">{monthName}</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={previousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}

            {Array.from({ length: startingDayOfWeek }).map((_, index) => (
              <div key={`empty-${index}`} className="aspect-square" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, index) => {
              const day = index + 1
              const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
              const dayEvents = getEventsForDate(date)
              const isToday =
                date.getDate() === new Date().getDate() &&
                date.getMonth() === new Date().getMonth() &&
                date.getFullYear() === new Date().getFullYear()

              return (
                <button
                  key={day}
                  onClick={() => {
                    setSelectedDate(date)
                    setIsDialogOpen(true)
                  }}
                  className={cn(
                    "aspect-square p-2 rounded-lg border border-border hover:border-primary/50 transition-colors",
                    "flex flex-col items-start justify-start",
                    isToday && "bg-primary/10 border-primary",
                  )}
                >
                  <span className={cn("text-sm font-medium", isToday && "text-primary")}>{day}</span>
                  {dayEvents.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {dayEvents.slice(0, 2).map((event) => (
                        <div key={event.id} className="w-1.5 h-1.5 rounded-full bg-primary" />
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </Card>

        {/* Upcoming Events */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Upcoming Events</h2>
          {upcomingEvents.length === 0 ? (
            <div className="text-center py-8">
              <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No upcoming events</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  className="p-3 border border-border rounded-lg hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-foreground text-sm">{event.title}</h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 -mt-1 -mr-1"
                      onClick={() => handleDeleteEvent(event.id)}
                    >
                      <span className="text-xs">×</span>
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{event.description}</p>
                  <div className="flex items-center gap-2">
                    <Badge className={cn("text-xs", getCategoryColor(event.category))}>{event.category}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {event.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} at {event.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <EventDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) setSelectedDate(null)
        }}
        onSave={handleAddEvent}
        initialDate={selectedDate}
      />
    </div>
  )
}
