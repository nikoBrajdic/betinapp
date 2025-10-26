import { GuestStaysClient } from "./guest-stays-client"

interface GuestStay {
  id: string
  guest_name: string
  room: string
  check_in: string
  check_out: string
  status: "upcoming" | "current" | "past"
  notes: string
  updated_at: string
}

export default async function GuestStaysPage() {
  // Mock data for now - in a real app this would come from a database
  const guests: GuestStay[] = [
    {
      id: "1",
      guest_name: "John Smith",
      room: "Guest Room 1",
      check_in: "2024-01-15",
      check_out: "2024-01-20",
      status: "past",
      notes: "Business trip",
      updated_at: new Date().toISOString()
    },
    {
      id: "2",
      guest_name: "Sarah Johnson",
      room: "Guest Room 2", 
      check_in: "2024-01-25",
      check_out: "2024-01-30",
      status: "current",
      notes: "Family visit",
      updated_at: new Date().toISOString()
    },
    {
      id: "3",
      guest_name: "Mike Davis",
      room: "Guest Room 1",
      check_in: "2024-02-05",
      check_out: "2024-02-10",
      status: "upcoming",
      notes: "Weekend stay",
      updated_at: new Date().toISOString()
    }
  ]

  return <GuestStaysClient guests={guests} />
}