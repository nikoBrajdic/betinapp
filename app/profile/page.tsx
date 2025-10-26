import { createClient } from "@/lib/supabase/server"
import { ProfileClient } from "./profile-client"

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return <div>Not authenticated</div>
  }

  // Get user profile data
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  // Get bills data for debt calculation
  const { data: bills } = await supabase
    .from("bills")
    .select("*")
    .order("due_date", { ascending: true })

  // Get guest stays for debt calculation
  const { data: guestStays } = await supabase
    .from("guest_stays")
    .select("*")
    .order("from_date", { ascending: true })

  // Get events for family member stays
  const { data: events } = await supabase
    .from("events")
    .select("*")
    .eq("category", "family")
    .order("start_date", { ascending: true })

  return (
    <ProfileClient 
      user={user}
      profile={profile}
      bills={bills || []}
      guestStays={guestStays || []}
      events={events || []}
    />
  )
}
