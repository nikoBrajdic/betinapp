"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Plus, Pencil, Trash2, FileText } from "lucide-react"
import { NoteDialog } from "@/components/note-dialog"
import { NoteViewModal } from "@/components/note-view-modal"
import { createNote, updateNote, deleteNote } from "@/lib/actions/notes"
import { useRouter } from "next/navigation"

interface Note {
  id: string
  title: string
  content: string
  color: string
  created_at: string
  updated_at: string
}

interface NotesClientProps {
  notes: Note[]
}

export function NotesClient({ notes }: NotesClientProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [viewingNote, setViewingNote] = useState<Note | null>(null)
  const router = useRouter()

  const handleAddNote = async (title: string, content: string) => {
    try {
      await createNote({ title, content, color: "blue" })
      router.refresh()
    } catch (error) {
      console.error("Failed to create note:", error)
    }
  }

  const handleEditNote = async (id: string, title: string, content: string) => {
    try {
      await updateNote(id, { title, content, color: "blue" })
      router.refresh()
    } catch (error) {
      console.error("Failed to update note:", error)
    }
  }

  const handleDeleteNote = async (id: string) => {
    try {
      await deleteNote(id)
      router.refresh()
    } catch (error) {
      console.error("Failed to delete note:", error)
    }
  }

  const openEditDialog = (note: Note) => {
    setEditingNote(note)
    setIsDialogOpen(true)
  }

  const openViewModal = (note: Note) => {
    setViewingNote(note)
    setIsViewModalOpen(true)
  }

  const closeDialog = () => {
    setIsDialogOpen(false)
    setEditingNote(null)
  }

  const closeViewModal = () => {
    setIsViewModalOpen(false)
    setViewingNote(null)
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Notes</h1>
          <p className="text-muted-foreground">Keep track of important information and reminders</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Note
        </Button>
      </div>

      {notes.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No notes yet</h3>
          <p className="text-muted-foreground mb-4">Create your first note to get started</p>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Note
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map((note) => (
            <Card 
              key={note.id} 
              className="p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => openViewModal(note)}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-foreground line-clamp-1">{note.title}</h3>
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(note)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteNote(note.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{note.content}</p>
              <p className="text-xs text-muted-foreground">
                Updated {new Date(note.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </p>
            </Card>
          ))}
        </div>
      )}

      <NoteDialog
        open={isDialogOpen}
        onOpenChange={closeDialog}
        onSave={editingNote ? (title, content) => handleEditNote(editingNote.id, title, content) : handleAddNote}
        initialTitle={editingNote?.title}
        initialContent={editingNote?.content}
        mode={editingNote ? "edit" : "create"}
      />

      <NoteViewModal
        open={isViewModalOpen}
        onOpenChange={closeViewModal}
        note={viewingNote}
        onEdit={openEditDialog}
        onDelete={handleDeleteNote}
        onEditSave={handleEditNote}
      />
    </div>
  )
}
