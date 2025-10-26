"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

// Helper function to create event data from guest stay
function createEventFromGuestStay(guestStay: {
  guestName: string
  room: string
  checkIn: string
  checkOut: string
  status: string
  notes: string
}) {
  const title = `${guestStay.guestName} - ${guestStay.room}`
  const description = `Guest stay in ${guestStay.room}${guestStay.notes ? `\n\nNotes: ${guestStay.notes}` : ''}`
  
  return {
    title,
    description,
    startDate: guestStay.checkIn,
    endDate: guestStay.checkOut,
    time: null,
    category: "other" // Guest stays are categorized as "other"
  }
}

export async function getGuestStays() {
  const supabase = await createClient()
  const { data, error } = await supabase.from("guest_stays").select("*").order("from_date", { ascending: true })

  if (error) throw error
  return data
}

export async function createGuestStay(formData: {
  guestName: string
  room: string
  checkIn: string
  checkOut: string
  status: string
  notes: string
}) {
  const supabase = await createClient()
  
  // Create the event first
  const eventData = createEventFromGuestStay(formData)
  const { data: event, error: eventError } = await supabase.from("events").insert({
    title: eventData.title,
    description: eventData.description,
    start_date: eventData.startDate,
    end_date: eventData.endDate,
    time: eventData.time,
    category: eventData.category,
  }).select().single()

  if (eventError) throw eventError

  // Create the guest stay with the event_id
  const { error } = await supabase.from("guest_stays").insert({
    guest_name: formData.guestName,
    room: formData.room,
    from_date: formData.checkIn,
    to_date: formData.checkOut,
    status: formData.status,
    notes: formData.notes,
    event_id: event.id,
  })

  if (error) {
    // If guest stay creation fails, clean up the event
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
    room: string
    checkIn: string
    checkOut: string
    status: string
    notes: string
  },
) {
  const supabase = await createClient()
  
  // Get the current guest stay to find the associated event
  const { data: currentGuestStay, error: fetchError } = await supabase
    .from("guest_stays")
    .select("event_id")
    .eq("id", id)
    .single()

  if (fetchError) throw fetchError

  // Update the guest stay
  const { error } = await supabase
    .from("guest_stays")
    .update({
      guest_name: formData.guestName,
      room: formData.room,
      from_date: formData.checkIn,
      to_date: formData.checkOut,
      status: formData.status,
      notes: formData.notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) throw error

  // Update the associated event if it exists
  if (currentGuestStay.event_id) {
    const eventData = createEventFromGuestStay(formData)
    const { error: eventError } = await supabase
      .from("events")
      .update({
        title: eventData.title,
        description: eventData.description,
        start_date: eventData.startDate,
        end_date: eventData.endDate,
        time: eventData.time,
        category: eventData.category,
        updated_at: new Date().toISOString(),
      })
      .eq("id", currentGuestStay.event_id)

    if (eventError) throw eventError
  }

  revalidatePath("/guest-stays")
  revalidatePath("/calendar")
}

export async function deleteGuestStay(id: string) {
  const supabase = await createClient()
  
  // Get the event_id before deleting the guest stay
  const { data: guestStay, error: fetchError } = await supabase
    .from("guest_stays")
    .select("event_id")
    .eq("id", id)
    .single()

  if (fetchError) throw fetchError

  // Delete the guest stay (this will cascade delete the event due to foreign key)
  const { error } = await supabase.from("guest_stays").delete().eq("id", id)

  if (error) throw error

  // If there was an associated event, delete it manually (in case cascade doesn't work)
  if (guestStay.event_id) {
    await supabase.from("events").delete().eq("id", guestStay.event_id)
  }

  revalidatePath("/guest-stays")
  revalidatePath("/calendar")
}
