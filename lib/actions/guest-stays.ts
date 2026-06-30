"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

function computeStatus(checkIn: string, checkOut: string): string {
  const today = new Date().toISOString().split("T")[0]
  if (checkIn > today) return "upcoming"
  if (checkOut >= today) return "current"
  return "past"
}

function eventTitle(name: string, _type: string) {
  return name
}

// Derive a clean first name from an email when no profile name exists,
// e.g. "nino.g.brajdic@gmail.com" -> "Nino".
function firstNameFromEmail(email: string): string {
  const token = email.split("@")[0].split(/[._-]+/)[0]
  return token ? token.charAt(0).toUpperCase() + token.slice(1).toLowerCase() : email
}

// Approved family members (allowlist emails enriched with profile names).
// Used to pick a consistent guest name for family stays so utilities can
// combine multiple stays by the same person within a billing month.
export async function getFamilyMembers(): Promise<{ name: string; email: string }[]> {
  const supabase = await createClient()
  const [{ data: allow }, { data: profiles }] = await Promise.all([
    supabase.from("allowlist").select("email"),
    supabase.from("profiles").select("email, full_name"),
  ])

  const nameByEmail = new Map(
    (profiles ?? []).map(p => [String(p.email).toLowerCase(), p.full_name as string | null]),
  )

  const seen = new Set<string>()
  const members: { name: string; email: string }[] = []
  for (const { email } of allow ?? []) {
    const key = String(email).toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    const fullName = nameByEmail.get(key)
    const name = (fullName && fullName.trim()) || firstNameFromEmail(String(email))
    members.push({ name, email })
  }

  return members.sort((a, b) => a.name.localeCompare(b.name))
}

export async function getGuestStays() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("guest_stays")
    .select("*")
    .order("from_date", { ascending: true })
  if (error) throw error
  return data
}

export async function createGuestStay(formData: {
  guestName: string
  room?: string
  checkIn: string
  checkOut: string
  notes: string
  type: "family" | "friend"
}) {
  const supabase = await createClient()
  const status = computeStatus(formData.checkIn, formData.checkOut)

  const { data: event, error: eventError } = await supabase
    .from("events")
    .insert({
      title: eventTitle(formData.guestName, formData.type),
      description: formData.notes || null,
      start_date: formData.checkIn,
      end_date: formData.checkOut,
      time: null,
      category: formData.type === "family" ? "family" : "other",
    })
    .select()
    .single()

  if (eventError) throw eventError

  const { error } = await supabase.from("guest_stays").insert({
    guest_name: formData.guestName,
    room: formData.room || "",
    from_date: formData.checkIn,
    to_date: formData.checkOut,
    status,
    notes: formData.notes,
    type: formData.type,
    event_id: event.id,
  })

  if (error) {
    await supabase.from("events").delete().eq("id", event.id)
    throw error
  }

  revalidatePath("/guest-stays")
  revalidatePath("/calendar")
}

export async function updateGuestStay(
  id: string,
  formData: {
    guestName: string
    room?: string
    checkIn: string
    checkOut: string
    notes: string
    type: "family" | "friend"
  },
) {
  const supabase = await createClient()
  const status = computeStatus(formData.checkIn, formData.checkOut)

  const { data: current, error: fetchError } = await supabase
    .from("guest_stays")
    .select("event_id")
    .eq("id", id)
    .single()
  if (fetchError) throw fetchError

  const { error } = await supabase
    .from("guest_stays")
    .update({
      guest_name: formData.guestName,
      room: formData.room || "",
      from_date: formData.checkIn,
      to_date: formData.checkOut,
      status,
      notes: formData.notes,
      type: formData.type,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
  if (error) throw error

  if (current.event_id) {
    await supabase
      .from("events")
      .update({
        title: eventTitle(formData.guestName, formData.type),
        description: formData.notes || null,
        start_date: formData.checkIn,
        end_date: formData.checkOut,
        category: formData.type === "family" ? "family" : "other",
        updated_at: new Date().toISOString(),
      })
      .eq("id", current.event_id)
  }

  revalidatePath("/guest-stays")
  revalidatePath("/calendar")
}

export async function deleteGuestStay(id: string) {
  const supabase = await createClient()

  const { data: stay } = await supabase
    .from("guest_stays")
    .select("event_id")
    .eq("id", id)
    .single()

  const { error } = await supabase.from("guest_stays").delete().eq("id", id)
  if (error) throw error

  if (stay?.event_id) {
    await supabase.from("events").delete().eq("id", stay.event_id)
  }

  revalidatePath("/guest-stays")
  revalidatePath("/calendar")
}
