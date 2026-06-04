"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

function isMissingSortOrder(error: any) {
  return error?.code === "42703"
    || error?.code === "PGRST204"
    || String(error?.message ?? "").toLowerCase().includes("sort_order")
}

export async function getNotes() {
  const supabase = await createClient()
  const ordered = await supabase
    .from("notes")
    .select("*")
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })

  if (!ordered.error) return ordered.data
  if (!isMissingSortOrder(ordered.error)) throw ordered.error

  const { data, error } = await supabase.from("notes").select("*").order("created_at", { ascending: false })
  if (error) throw error
  return data
}

export async function createNote(formData: {
  title: string
  content: string
  color: string
  type?: "text" | "table"
}) {
  const supabase = await createClient()
  const { data: latestNote, error: latestError } = await supabase
    .from("notes")
    .select("sort_order")
    .order("sort_order", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle()

  const payload: {
    title: string
    content: string
    color: string
    type: "text" | "table"
    sort_order?: number
  } = {
    title: formData.title,
    content: formData.content,
    color: formData.color,
    type: formData.type ?? "text",
  }

  if (!latestError) payload.sort_order = Number(latestNote?.sort_order ?? -1) + 1

  const { error } = await supabase.from("notes").insert(payload)
  if (error) throw error
  revalidatePath("/notes")
}

export async function updateNote(id: string, formData: {
  title: string
  content: string
  color: string
  type?: "text" | "table"
}) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("notes")
    .update({
      title: formData.title,
      content: formData.content,
      color: formData.color,
      type: formData.type ?? "text",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
  if (error) throw error
  revalidatePath("/notes")
}

export async function reorderNotes(noteIds: string[]) {
  const supabase = await createClient()

  for (const [index, id] of noteIds.entries()) {
    const { error } = await supabase
      .from("notes")
      .update({ sort_order: index, updated_at: new Date().toISOString() })
      .eq("id", id)

    if (isMissingSortOrder(error)) return
    if (error) throw error
  }

  revalidatePath("/notes")
}

export async function deleteNote(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("notes").delete().eq("id", id)
  if (error) throw error
  revalidatePath("/notes")
}
