"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function getGuestStays() {
  const supabase = await createClient()
  const { data, error } = await supabase.from("guest_stays").select("*").order("check_in", { ascending: true })

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
  const { error } = await supabase.from("guest_stays").insert({
    guest_name: formData.guestName,
    room: formData.room,
    check_in: formData.checkIn,
    check_out: formData.checkOut,
    status: formData.status,
    notes: formData.notes,
  })

  if (error) throw error
  revalidatePath("/guest-stays")
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
  const { error } = await supabase
    .from("guest_stays")
    .update({
      guest_name: formData.guestName,
      room: formData.room,
      check_in: formData.checkIn,
      check_out: formData.checkOut,
      status: formData.status,
      notes: formData.notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) throw error
  revalidatePath("/guest-stays")
}

export async function deleteGuestStay(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("guest_stays").delete().eq("id", id)

  if (error) throw error
  revalidatePath("/guest-stays")
}
