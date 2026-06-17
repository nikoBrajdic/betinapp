"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { Block } from "@/lib/actions/diary"

export type { Block }

export interface Note {
  id: string
  title: string
  content: Block[]
  created_at: string
  updated_at: string
}

function isMissingSortOrder(error: any) {
  return error?.code === "42703"
    || error?.code === "PGRST204"
    || String(error?.message ?? "").toLowerCase().includes("sort_order")
}

export async function getNotes(): Promise<Note[]> {
  const supabase = await createClient()
  const ordered = await supabase
    .from("notes")
    .select("*")
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })

  if (!ordered.error) return ordered.data as Note[]
  if (!isMissingSortOrder(ordered.error)) throw ordered.error

  const { data, error } = await supabase.from("notes").select("*").order("created_at", { ascending: false })
  if (error) throw error
  return data as Note[]
}

export async function getNote(id: string): Promise<Note> {
  const supabase = await createClient()
  const { data, error } = await supabase.from("notes").select("*").eq("id", id).single()
  if (error) throw error
  return data as Note
}

export async function createNote(title: string): Promise<Note> {
  const supabase = await createClient()
  const { data: latestNote, error: latestError } = await supabase
    .from("notes")
    .select("sort_order")
    .order("sort_order", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle()

  const payload: { title: string; content: Block[]; sort_order?: number } = {
    title,
    content: [],
  }

  if (!latestError) payload.sort_order = Number(latestNote?.sort_order ?? -1) + 1

  const { data, error } = await supabase.from("notes").insert(payload).select().single()
  if (error) throw error
  revalidatePath("/notes")
  return data as Note
}

export async function updateNote(id: string, updates: { title?: string; content?: Block[] }) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("notes")
    .update({ ...updates, updated_at: new Date().toISOString() })
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
