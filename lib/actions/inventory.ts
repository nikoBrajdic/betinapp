"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function getInventory() {
  const supabase = await createClient()
  const { data, error } = await supabase.from("inventory").select("*").order("name", { ascending: true })

  if (error) throw error
  return data
}

export async function createInventoryItem(formData: {
  name: string
  category: string
  location: string
  quantity: number
  notes: string
}) {
  const supabase = await createClient()
  const { error } = await supabase.from("inventory").insert({
    name: formData.name,
    category: formData.category,
    location: formData.location,
    quantity: formData.quantity,
    notes: formData.notes,
  })

  if (error) throw error
  revalidatePath("/tables")
}

export async function updateInventoryItem(
  id: string,
  formData: {
    name: string
    category: string
    location: string
    quantity: number
    notes: string
  },
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("inventory")
    .update({
      name: formData.name,
      category: formData.category,
      location: formData.location,
      quantity: formData.quantity,
      notes: formData.notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) throw error
  revalidatePath("/tables")
}

export async function deleteInventoryItem(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("inventory").delete().eq("id", id)

  if (error) throw error
  revalidatePath("/tables")
}
