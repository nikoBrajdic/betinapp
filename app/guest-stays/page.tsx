import { StaysShell, type StaysView } from "./stays-shell"
import { getGuestStays, getFamilyMembers } from "@/lib/actions/guest-stays"
import { getEvents } from "@/lib/actions/events"

export default async function GuestStaysPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const { view } = await searchParams
  const [guests, familyMembers, events] = await Promise.all([
    getGuestStays(),
    getFamilyMembers(),
    getEvents(),
  ])

  return (
    <StaysShell
      view={(view === "calendar" ? "calendar" : "stays") as StaysView}
      guests={guests}
      familyMembers={familyMembers}
      events={events}
    />
  )
}
