import { getEvents } from "@/lib/actions/events"
import { CalendarClient } from "./calendar-client"

interface Event {
  id: string
  title: string
  description: string
  date: string
  time: string
  category: "family" | "maintenance" | "appointment" | "other"
}

export default async function CalendarPage() {
  const events = await getEvents()

  return <CalendarClient events={events} />
}