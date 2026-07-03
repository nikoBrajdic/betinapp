"use client"

import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { CalendarIcon, Clock } from "lucide-react"

interface Event {
  id: string
  title: string
  description: string
  start_date: string
  end_date: string | null
  time: string | null
  category: "family" | "maintenance" | "appointment" | "other"
}

interface EventsPanelProps {
  events: Event[]
}

const categoryColor: Record<string, string> = {
  family:      "bg-blue-100 text-blue-700",
  maintenance: "bg-orange-100 text-orange-700",
  appointment: "bg-green-100 text-green-700",
  other:       "bg-gray-100 text-gray-600",
}

function cleanTitle(title: string): string {
  // Strip leading non-ASCII characters (emoji) from old data
  let i = 0
  while (i < title.length) {
    const code = title.codePointAt(i) ?? 0
    if (code <= 127) break
    i += code > 0xFFFF ? 2 : 1
  }
  return title.slice(i).trim() || title.trim()
}

function relativeDays(dateStr: string): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(dateStr + "T00:00:00")
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
  if (diff === 0) return "Today"
  if (diff === 1) return "Tomorrow"
  if (diff === -1) return "Yesterday"
  if (diff > 0) return `in ${diff} days`
  return `${Math.abs(diff)} days ago`
}

function formatDay(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00")
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  if (d.toDateString() === today.toDateString()) return "Today"
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow"
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
}

export function EventsPanel({ events }: EventsPanelProps) {
  const pathname = usePathname()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  useEffect(() => {
    const handler = (e: Event) => setSelectedDate((e as CustomEvent).detail)
    window.addEventListener("calendar:date", handler as EventListener)
    return () => window.removeEventListener("calendar:date", handler as EventListener)
  }, [])

  if (!pathname.startsWith("/calendar")) return null

  const today = new Date()
  const todayStr = today.toISOString().split("T")[0]

  let eventsToShow: Event[]

  if (selectedDate) {
    // Show events for the selected date
    eventsToShow = events.filter(e => {
      const end = e.end_date || e.start_date
      return selectedDate >= e.start_date && selectedDate <= end
    })
  } else {
    // Show next 7 days
    const cutoff = new Date(today)
    cutoff.setDate(today.getDate() + 7)
    const cutoffStr = cutoff.toISOString().split("T")[0]
    eventsToShow = events.filter(e => {
      const end = e.end_date || e.start_date
      return e.start_date <= cutoffStr && end >= todayStr
    }).sort((a, b) => a.start_date.localeCompare(b.start_date))
  }

  // Group by start_date
  const grouped = eventsToShow.reduce((acc, e) => {
    const key = selectedDate || e.start_date
    if (!acc[key]) acc[key] = []
    acc[key].push(e)
    return acc
  }, {} as Record<string, Event[]>)

  const dates = Object.keys(grouped).sort()

  return (
    <div className="w-full md:w-60 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden flex-shrink-0">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 border-b border-gray-100">
        {selectedDate ? (
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-xs font-semibold text-gray-600">
              {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }).toUpperCase()}
            </p>
            <span className="text-[10px] text-gray-400 whitespace-nowrap">{relativeDays(selectedDate)}</span>
          </div>
        ) : (
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Next 7 days</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {dates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-10">
            <CalendarIcon className="h-7 w-7 text-gray-200 mb-2" />
            <p className="text-xs text-gray-400">
              {selectedDate ? "No events on this date" : "No events in the next 7 days"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {dates.map(date => (
              <div key={date}>
                {!selectedDate && (
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                    {formatDay(date)}
                  </p>
                )}
                <div className="space-y-1.5">
                  {grouped[date].map(event => (
                    <div key={event.id} className="rounded-lg bg-gray-50 p-2.5 hover:bg-gray-100 transition-colors">
                      <div className="flex items-start justify-between gap-1 mb-0.5">
                        <p className="text-xs text-gray-700 leading-snug flex-1">{cleanTitle(event.title)}</p>
                        {event.time && (
                          <span className="flex items-center gap-0.5 text-[10px] text-gray-400 flex-shrink-0">
                            <Clock className="h-2.5 w-2.5" />{event.time}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        {event.end_date && event.end_date !== event.start_date ? (
                          <p className="text-[10px] text-gray-400">
                            Until {new Date(event.end_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </p>
                        ) : <span />}
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", categoryColor[event.category])}>
                          {event.category}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
