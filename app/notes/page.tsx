"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Plus, Pencil, Trash2, FileText } from "lucide-react"
import { NoteDialog } from "@/components/note-dialog"

interface Note {
  id: string
  title: string
  content: string
  createdAt: Date
  updatedAt: Date
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([
    {
      id: "1",
      title: "Grocery List",
      content: "Milk, eggs, bread, cheese, vegetables",
      createdAt: new Date("2025-10-20"),
      updatedAt: new Date("2025-10-25"),
    },
    {
      id: "2",
      title: "Home Maintenance",
      content: "Fix leaky faucet in bathroom, replace air filter, clean gutters",
      createdAt: new Date("2025-10-22"),
      updatedAt: new Date("2025-10-22"),
    },
    {
      id: "3",
      title: "Weekend Plans",
      content: "Saturday: Farmers market at 9am, Sunday: Family brunch at 11am",
      createdAt: new Date("2025-10-24"),
      updatedAt: new Date("2025-10-26"),
    },
  ])

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)

  const handleAddNote = (title: string, content: string) => {
    const newNote: Note = {
      id: Date.now().toString(),
      title,
      content,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setNotes([newNote, ...notes])
  }

  const handleEditNote = (id: string, title: string, content: string) => {
    setNotes(notes.map((note) => (note.id === id ? { ...note, title, content, updatedAt: new Date() } : note)))
  }

  const handleDeleteNote = (id: string) => {
    setNotes(notes.filter((note) => note.id !== id))
  }

  const openEditDialog = (note: Note) => {
    setEditingNote(note)
    setIsDialogOpen(true)
  }

  const closeDialog = () => {
    setIsDialogOpen(false)
    setEditingNote(null)
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
            <Card key={note.id} className="p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-foreground line-clamp-1">{note.title}</h3>
                <div className="flex gap-1">
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
                Updated {note.updatedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
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
    </div>
  )
}
