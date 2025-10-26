"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function getNotes() {
  const supabase = await createClient()
  const { data, error } = await supabase.from("notes").select("*").order("created_at", { ascending: false })

  if (error) throw error
  return data
}

export async function createNote(formData: {
  title: string
  content: string
  color: string
}) {
  const supabase = await createClient()
  const { error } = await supabase.from("notes").insert({
    title: formData.title,
    content: formData.content,
    color: formData.color,
  })

  if (error) throw error
  revalidatePath("/notes")
}

export async function updateNote(id: string, formData: { title: string; content: string; color: string }) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("notes")
    .update({
      title: formData.title,
      content: formData.content,
      color: formData.color,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) throw error
  revalidatePath("/notes")
}

export async function deleteNote(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("notes").delete().eq("id", id)

  if (error) throw error
  revalidatePath("/notes")
}
