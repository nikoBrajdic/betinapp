import { GuestStaysClient } from "./guest-stays-client"
import { getGuestStays } from "@/lib/actions/guest-stays"

export default async function GuestStaysPage() {
  const guests = await getGuestStays()
  return <GuestStaysClient guests={guests} />
}
