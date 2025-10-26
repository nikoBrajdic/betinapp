"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function getEvents() {
  const supabase = await createClient()
  const { data, error } = await supabase.from("events").select("*").order("date", { ascending: true })

  if (error) throw error
  return data
}

export async function createEvent(formData: {
  title: string
  description: string
  date: string
  time: string
  category: string
}) {
  const supabase = await createClient()
  const { error } = await supabase.from("events").insert({
    title: formData.title,
    description: formData.description,
    date: formData.date,
    time: formData.time,
    category: formData.category,
  })

  if (error) throw error
  revalidatePath("/calendar")
}

export async function updateEvent(
  id: string,
  formData: {
    title: string
    description: string
    date: string
    time: string
    category: string
  },
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("events")
    .update({
      title: formData.title,
      description: formData.description,
      date: formData.date,
      time: formData.time,
      category: formData.category,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) throw error
  revalidatePath("/calendar")
}

export async function deleteEvent(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("events").delete().eq("id", id)

  if (error) throw error
  revalidatePath("/calendar")
}
