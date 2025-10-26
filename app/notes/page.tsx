import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Plus, Pencil, Trash2, FileText } from "lucide-react"
import { NoteDialog } from "@/components/note-dialog"
import { getNotes, createNote, updateNote, deleteNote } from "@/lib/actions/notes"
import { NotesClient } from "./notes-client"

interface Note {
  id: string
  title: string
  content: string
  color: string
  created_at: string
  updated_at: string
}

export default async function NotesPage() {
  const notes = await getNotes()

  return <NotesClient notes={notes} />
}
