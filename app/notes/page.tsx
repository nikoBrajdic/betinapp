import { getNotes } from "@/lib/actions/notes"
import { getNoteDocuments } from "@/lib/actions/note-documents"
import { NotesClient } from "./notes-client"

export default async function NotesPage() {
  const notes = await getNotes()
  const documents = await getNoteDocuments()
  return <NotesClient notes={notes} documents={documents} />
}
