import { GuestStaysClient } from "./guest-stays-client"
import { getGuestStays, getFamilyMembers } from "@/lib/actions/guest-stays"

export default async function GuestStaysPage() {
  const [guests, familyMembers] = await Promise.all([getGuestStays(), getFamilyMembers()])
  return <GuestStaysClient guests={guests} familyMembers={familyMembers} />
}
