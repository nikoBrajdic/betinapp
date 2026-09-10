import { getNote } from "@/lib/actions/notes"
import { NoteEditorClient } from "./note-editor-client"
import { notFound } from "next/navigation"

export default async function NoteEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const note = await getNote(id)
    return <NoteEditorClient key={note.id} note={note} />
  } catch {
    notFound()
  }
}
