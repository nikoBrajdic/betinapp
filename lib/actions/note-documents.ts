"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export type DocumentTextKind = "plain" | "rich"

export interface NoteDocument {
  id: string
  name: string
  file_type: string
  text_kind: DocumentTextKind
  size_bytes: number
  storage_path: string
  created_by: string | null
  last_modified_by: string | null
  created_at: string
  updated_at: string
  added_by_name: string
  last_modified_by_name: string
}

function displayName(profile?: { full_name?: string | null; email?: string | null }) {
  if (!profile) return "Unknown"
  return profile.full_name?.trim() || profile.email?.trim() || "Unknown"
}

export async function getNoteDocuments(): Promise<NoteDocument[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("note_documents")
    .select("*")
    .order("updated_at", { ascending: false })

  if (error) throw error
  const docs = (data ?? []) as Omit<NoteDocument, "added_by_name" | "last_modified_by_name">[]

  const userIds = Array.from(new Set(docs.flatMap(doc => [doc.created_by, doc.last_modified_by]).filter(Boolean))) as string[]
  let profileMap = new Map<string, { full_name?: string | null; email?: string | null }>()
  if (userIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id,full_name,email")
      .in("id", userIds)
    if (profilesError) throw profilesError
    profileMap = new Map((profiles ?? []).map(profile => [profile.id, profile]))
  }

  return docs.map(doc => ({
    ...doc,
    added_by_name: displayName(doc.created_by ? profileMap.get(doc.created_by) : undefined),
    last_modified_by_name: displayName(doc.last_modified_by ? profileMap.get(doc.last_modified_by) : undefined),
  }))
}

export async function createNoteDocument(input: {
  name: string
  fileType: string
  textKind: DocumentTextKind
  sizeBytes: number
  storagePath: string
}) {
  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()
  const uid = authData.user?.id ?? null

  const { data, error } = await supabase
    .from("note_documents")
    .insert({
      name: input.name,
      file_type: input.fileType,
      text_kind: input.textKind,
      size_bytes: input.sizeBytes,
      storage_path: input.storagePath,
      created_by: uid,
      last_modified_by: uid,
    })
    .select("*")
    .single()

  if (error) throw error
  revalidatePath("/notes")
  return data
}

export async function updateNoteDocumentVersion(
  id: string,
  input: { sizeBytes: number; storagePath: string }
) {
  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()
  const uid = authData.user?.id ?? null

  const { data: current, error: currentError } = await supabase
    .from("note_documents")
    .select("id,storage_path")
    .eq("id", id)
    .single()
  if (currentError) throw currentError

  const { error } = await supabase
    .from("note_documents")
    .update({
      size_bytes: input.sizeBytes,
      storage_path: input.storagePath,
      last_modified_by: uid,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
  if (error) throw error

  if (current.storage_path && current.storage_path !== input.storagePath) {
    await supabase.storage.from("notes-documents").remove([current.storage_path])
  }

  revalidatePath("/notes")
}

export async function deleteNoteDocument(id: string) {
  const supabase = await createClient()
  const { data: current, error: currentError } = await supabase
    .from("note_documents")
    .select("storage_path")
    .eq("id", id)
    .single()
  if (currentError) throw currentError

  const { error } = await supabase.from("note_documents").delete().eq("id", id)
  if (error) throw error

  if (current.storage_path) {
    await supabase.storage.from("notes-documents").remove([current.storage_path])
  }

  revalidatePath("/notes")
}
