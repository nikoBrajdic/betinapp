"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { TableNoteEditor, emptyTable, parseTableContent, stringifyTable, type TableData } from "@/components/table-note-editor"
import { FileText, Table } from "lucide-react"
import { cn } from "@/lib/utils"

interface NoteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (title: string, content: string, type: "text" | "table") => void
  initialTitle?: string
  initialContent?: string
  initialType?: "text" | "table"
  mode: "create" | "edit"
}

export function NoteDialog({
  open,
  onOpenChange,
  onSave,
  initialTitle = "",
  initialContent = "",
  initialType = "text",
  mode,
}: NoteDialogProps) {
  const [title, setTitle] = useState(initialTitle)
  const [type, setType] = useState<"text" | "table">(initialType)
  const [textContent, setTextContent] = useState(initialContent)
  const [tableData, setTableData] = useState<TableData>(
    initialType === "table" ? parseTableContent(initialContent) : emptyTable()
  )

  useEffect(() => {
    if (open) {
      setTitle(initialTitle)
      setType(initialType)
      setTextContent(initialContent)
      setTableData(initialType === "table" ? parseTableContent(initialContent) : emptyTable())
    }
  }, [open, initialTitle, initialContent, initialType])

  const handleSave = () => {
    if (!title.trim()) return
    if (type === "text" && !textContent.trim()) return

    const content = type === "table" ? stringifyTable(tableData) : textContent
    onSave(title, content, type)
    onOpenChange(false)
  }

  const canSave = title.trim() && (type === "table" || textContent.trim())

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("sm:max-w-[560px]", type === "table" && "sm:max-w-[780px]")}>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New Note" : "Edit Note"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Note title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          {/* Type picker — only on create */}
          {mode === "create" && (
            <div className="flex gap-2">
              <button
                onClick={() => setType("text")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all cursor-pointer",
                  type === "text"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 text-gray-500 hover:border-gray-300"
                )}
              >
                <FileText className="h-4 w-4" /> Text
              </button>
              <button
                onClick={() => setType("table")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all cursor-pointer",
                  type === "table"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 text-gray-500 hover:border-gray-300"
                )}
              >
                <Table className="h-4 w-4" /> Table
              </button>
            </div>
          )}

          {/* Content */}
          {type === "text" ? (
            <div className="space-y-1.5">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                placeholder="Write your note..."
                value={textContent}
                onChange={e => setTextContent(e.target.value)}
                rows={6}
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Table</Label>
              <TableNoteEditor value={tableData} onChange={setTableData} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave} className="cursor-pointer">
            {mode === "create" ? "Create" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
