import { GuestStaysClient } from "./guest-stays-client"
import { getGuestStays } from "@/lib/actions/guest-stays"
import { getEvents } from "@/lib/actions/events"

export default async function GuestStaysPage() {
  const [guests, events] = await Promise.all([
    getGuestStays(),
    getEvents()
  ])

  return <GuestStaysClient guests={guests} events={events} />
}