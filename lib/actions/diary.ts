"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export type ImageItem = { url: string; caption: string }

export type Block =
  | { id: string; type: "heading"; text: string }
  | { id: string; type: "paragraph"; text: string; bold: boolean }
  | { id: string; type: "image"; images: ImageItem[] }

export interface DiaryEntry {
  id: string
  title: string
  content: Block[]
  created_at: string
  updated_at: string
}

export async function getDiaryEntries() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("diary_entries")
    .select("*")
    .order("title", { ascending: false })
  if (error) throw error
  return data as DiaryEntry[]
}

export async function getDiaryEntry(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("diary_entries")
    .select("*")
    .eq("id", id)
    .single()
  if (error) throw error
  return data as DiaryEntry
}

export async function createDiaryEntry(title: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("diary_entries")
    .insert({ title, content: [] })
    .select()
    .single()
  if (error) throw error
  revalidatePath("/diary")
  return data as DiaryEntry
}

export async function updateDiaryEntry(id: string, updates: { title?: string; content?: Block[] }) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("diary_entries")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) throw error
  revalidatePath("/diary")
  revalidatePath(`/diary/${id}`)
}

export async function deleteDiaryEntry(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("diary_entries").delete().eq("id", id)
  if (error) throw error
  revalidatePath("/diary")
}
