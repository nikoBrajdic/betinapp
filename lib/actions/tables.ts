"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function getTables() {
  const supabase = await createClient()
  const { data, error } = await supabase.from("tables").select("*").order("created_at", { ascending: false })

  if (error) throw error
  return data
}

export async function createTable(formData: {
  name: string
  capacity: number
  location: string
  status: "available" | "occupied" | "reserved"
  notes: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error("User not authenticated")

  const { error } = await supabase.from("tables").insert({
    name: formData.name,
    capacity: formData.capacity,
    location: formData.location,
    status: formData.status,
    notes: formData.notes,
    created_by_id: user.id,
  })

  if (error) throw error
  revalidatePath("/tables")
}

export async function updateTable(
  id: string,
  formData: {
    name: string
    capacity: number
    location: string
    status: "available" | "occupied" | "reserved"
    notes: string
  },
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("tables")
    .update({
      name: formData.name,
      capacity: formData.capacity,
      location: formData.location,
      status: formData.status,
      notes: formData.notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) throw error
  revalidatePath("/tables")
}

export async function deleteTable(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("tables").delete().eq("id", id)

  if (error) throw error
  revalidatePath("/tables")
}
