"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { EventDialog } from "@/components/event-dialog"
import { cn } from "@/lib/utils"
import { getLocalDateString } from "@/lib/utils/date"
import { createEvent, deleteEvent } from "@/lib/actions/events"
import { trackSave } from "@/lib/save-events"
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh"
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

function cleanTitle(title: string): string {
  let i = 0
  while (i < title.length) {
    const code = title.codePointAt(i) ?? 0
    if (code <= 127) break
    i += code > 0xFFFF ? 2 : 1
  }
  return title.slice(i).trim() || title.trim()
}

const categoryColor: Record<string, string> = {
  family:      "bg-blue-100 text-blue-700",
  maintenance: "bg-orange-100 text-orange-700",
  appointment: "bg-green-100 text-green-700",
  other:       "bg-gray-100 text-gray-600",
}

const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"]

export function CalendarClient({ events }: CalendarClientProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const router = useRouter()
  useRealtimeRefresh(["events"])

  useEffect(() => {
    const handler = () => setIsDialogOpen(true)
    window.addEventListener("topbar:new", handler)
    return () => window.removeEventListener("topbar:new", handler)
  }, [])

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("calendar:date", { detail: selectedDate ? getLocalDateString(selectedDate) : null }))
  }, [selectedDate])

  const handleAddEvent = async (
    _id: string, title: string, description: string,
    startDate: Date | string | null, endDate: Date | string | null,
    time: string, category: Event["category"],
  ) => {
    try {
      await trackSave(createEvent({
        title, description,
        startDate: startDate instanceof Date ? startDate.toISOString().split("T")[0] : startDate!,
        endDate: endDate ? (endDate instanceof Date ? endDate.toISOString().split("T")[0] : endDate) : undefined,
        time: time || undefined, category,
      }))
      router.refresh()
    } catch (e) { console.error(e) }
  }

  const getDays = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    // Monday-based weekday index (0 = Mon … 6 = Sun)
    const firstDow = (new Date(year, month, 1).getDay() + 6) % 7
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells: { date: Date; current: boolean }[] = []

    for (let i = firstDow - 1; i >= 0; i--) {
      cells.push({ date: new Date(year, month, -i), current: false })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ date: new Date(year, month, d), current: true })
    }
    const remaining = 42 - cells.length
    for (let d = 1; d <= remaining; d++) {
      cells.push({ date: new Date(year, month + 1, d), current: false })
    }
    return cells
  }

  const getEventsForDate = (date: Date) => {
    const dateStr = getLocalDateString(date)
    return events.filter(e => {
      const end = e.end_date || e.start_date
      return dateStr >= e.start_date && dateStr <= end
    })
  }

  const navigate = (dir: "prev" | "next") => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + (dir === "next" ? 1 : -1), 1))
    setSelectedDate(null)
  }

  const cells = getDays(currentDate)
  const todayStr = getLocalDateString(new Date())

  return (
    <div className="p-5 h-full flex flex-col">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-800">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7 cursor-pointer" onClick={() => navigate("prev")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 cursor-pointer" onClick={() => navigate("next")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
          <div key={d} className="py-1 text-center text-[11px] font-medium text-gray-400 uppercase tracking-wide">{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 flex-1">
        {cells.map(({ date, current }, i) => {
          const dateStr = getLocalDateString(date)
          const dayEvents = getEventsForDate(date)
          const isToday = dateStr === todayStr
          const isSelected = selectedDate && getLocalDateString(selectedDate) === dateStr

          return (
            <div
              key={i}
              onClick={() => setSelectedDate(isSelected ? null : date)}
              className={cn(
                "min-h-[100px] p-1.5 border-t border-gray-100 cursor-pointer transition-colors",
                !current && "bg-gray-50/50",
                isSelected && "bg-blue-50",
                current && !isSelected && "hover:bg-gray-50"
              )}
            >
              <div className="flex justify-end mb-0.5">
                <span className={cn(
                  "text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full",
                  isToday ? "bg-[#1a1464] text-white font-bold" : current ? "text-gray-700" : "text-gray-300"
                )}>
                  {date.getDate()}
                </span>
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map(event => (
                  <div
                    key={event.id}
                    className={cn("text-[10px] px-1 py-0.5 rounded truncate leading-tight", categoryColor[event.category])}
                  >
                    {cleanTitle(event.title)}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-gray-400 px-1">+{dayEvents.length - 3}</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <EventDialog
        open={isDialogOpen}
        onOpenChange={open => { if (!open) { setIsDialogOpen(false); setSelectedDate(null) } }}
        onSave={handleAddEvent}
        initialDate={selectedDate}
        initialId=""
        mode="create"
      />
    </div>
  )
}
