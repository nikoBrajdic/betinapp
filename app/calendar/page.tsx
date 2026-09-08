import { getEvents } from "@/lib/actions/events"
import { getFamilyMembers } from "@/lib/actions/guest-stays"
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
  const [events, familyMembers] = await Promise.all([getEvents(), getFamilyMembers()])

  return <CalendarClient events={events} familyMembers={familyMembers} />
}