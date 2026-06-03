"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Plus, Pencil, Trash2, FileText, Table, MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog"
import { NoteDialog } from "@/components/note-dialog"
import { NoteViewModal } from "@/components/note-view-modal"
import { TableNotePreview } from "@/components/table-note-editor"
import { createNote, updateNote, deleteNote } from "@/lib/actions/notes"
import { useRouter } from "next/navigation"

interface Note {
  id: string
  title: string
  content: string
  color: string
  type: "text" | "table"
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
  const [deleteNote_, setDeleteNote_] = useState<Note | null>(null)
  const router = useRouter()

  useEffect(() => {
    const handler = () => { setEditingNote(null); setIsDialogOpen(true) }
    window.addEventListener("topbar:new", handler)
    return () => window.removeEventListener("topbar:new", handler)
  }, [])

  const handleAddNote = async (title: string, content: string, type: "text" | "table") => {
    try {
      await createNote({ title, content, color: "blue", type })
      router.refresh()
    } catch (error) {
      console.error("Failed to create note:", error)
    }
  }

  const handleEditNote = async (id: string, title: string, content: string, type?: "text" | "table") => {
    try {
      const note = notes.find(n => n.id === id)
      await updateNote(id, { title, content, color: "blue", type: type ?? note?.type ?? "text" })
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
    if (note.type === "table") {
      // Table notes open directly in edit mode
      openEditDialog(note)
    } else {
      setViewingNote(note)
      setIsViewModalOpen(true)
    }
  }

  const closeDialog = () => {
    setIsDialogOpen(false)
    setEditingNote(null)
  }

  return (
    <div className="p-8">
      {notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <p className="text-gray-400 text-base">No notes yet</p>
          <button
            onClick={() => setIsDialogOpen(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-xl cursor-pointer transition-colors"
          >
            <Plus className="h-4 w-4" /> New Note
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map((note) => (
            <Card
              key={note.id}
              className="p-5 transition-all cursor-pointer group border-2 hover:border-gray-200 shadow-none hover:shadow-md hover:-translate-y-0.5"
              onClick={() => openViewModal(note)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  {note.type === "table"
                    ? <Table className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    : <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  }
                  <h3 className="text-sm font-semibold text-foreground line-clamp-1">{note.title}</h3>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2" onClick={e => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 cursor-pointer text-gray-400 hover:text-gray-700">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="cursor-pointer" onClick={() => openEditDialog(note)}>
                        <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={() => setDeleteNote_(note)}>
                        <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {note.type === "table" ? (
                <TableNotePreview content={note.content} />
              ) : (
                <p className="text-sm text-muted-foreground line-clamp-3">{note.content}</p>
              )}

              <p className="text-xs text-muted-foreground mt-2">
                {new Date(note.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </p>
            </Card>
          ))}
        </div>
      )}

      <NoteDialog
        open={isDialogOpen}
        onOpenChange={closeDialog}
        onSave={
          editingNote
            ? (title, content, type) => handleEditNote(editingNote.id, title, content, type)
            : handleAddNote
        }
        initialTitle={editingNote?.title}
        initialContent={editingNote?.content}
        initialType={editingNote?.type ?? "text"}
        mode={editingNote ? "edit" : "create"}
      />

      <NoteViewModal
        open={isViewModalOpen}
        onOpenChange={(open) => { if (!open) { setIsViewModalOpen(false); setViewingNote(null) } }}
        note={viewingNote}
        onEdit={openEditDialog}
        onDelete={handleDeleteNote}
        onEditSave={handleEditNote}
      />

      <ConfirmDeleteDialog
        open={!!deleteNote_}
        onOpenChange={open => { if (!open) setDeleteNote_(null) }}
        onConfirm={() => deleteNote_ && handleDeleteNote(deleteNote_.id)}
        itemName={deleteNote_?.title}
      />
    </div>
  )
}
