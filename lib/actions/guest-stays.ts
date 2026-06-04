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
