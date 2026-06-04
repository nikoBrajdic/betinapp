"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2 } from "lucide-react"
import { NoteDialog } from "@/components/note-dialog"
import { NoteBlocksView } from "@/components/note-rich-content"
import { TableNotePreview } from "@/components/table-note-editor"

interface Note {
  id: string
  title: string
  content: string
  color: string
  type: "text" | "table"
  created_at: string
  updated_at: string
}

interface NoteViewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  note: Note | null
  onEdit: (note: Note) => void
  onDelete: (id: string) => void
  onEditSave: (id: string, title: string, content: string, type?: "text" | "table") => void
}

export function NoteViewModal({ open, onOpenChange, note, onEdit, onDelete, onEditSave }: NoteViewModalProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  if (!note) return null

  const handleEdit = () => {
    setIsEditDialogOpen(true)
  }

  const handleDelete = () => {
    onDelete(note.id)
    onOpenChange(false)
  }

  const handleEditSave = (title: string, content: string, type: "text" | "table") => {
    onEditSave(note.id, title, content, type)
    setIsEditDialogOpen(false)
    onOpenChange(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="min-w-[80vw] max-w-[1000px] min-h-[90vh] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">{note.title}</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 py-6">
            {note.type === "table" ? <TableNotePreview content={note.content} /> : <NoteBlocksView content={note.content} />}
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Updated {new Date(note.updated_at).toLocaleDateString("en-US", { 
                month: "long", 
                day: "numeric", 
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              })}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleEdit}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <NoteDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSave={handleEditSave}
        initialTitle={note.title}
        initialContent={note.content}
        initialType={note.type}
        mode="edit"
      />
    </>
  )
}
