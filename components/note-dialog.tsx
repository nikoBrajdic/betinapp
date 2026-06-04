"use client"

import { useState, useEffect, useRef, DragEvent } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TableNoteEditor, emptyTable, parseTableContent, stringifyTable, type TableData } from "@/components/table-note-editor"
import { FileText, ImageIcon, Loader2, Plus, Table, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { emptyNoteBlocks, noteHasContent, parseNoteBlocks, stringifyNoteBlocks, type NoteBlock, type NoteImage } from "@/components/note-rich-content"

interface NoteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (title: string, content: string, type: "text" | "table") => void
  initialTitle?: string
  initialContent?: string
  initialType?: "text" | "table"
  mode: "create" | "edit"
}

async function compressImage(file: File, maxWidth = 1000, maxHeight = 760, quality = 0.82): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxWidth / img.width, maxHeight / img.height)
      const canvas = document.createElement("canvas")
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Compression failed")), "image/jpeg", quality)
    }
    img.onerror = reject
    img.src = url
  })
}

async function uploadNoteImage(file: File): Promise<string> {
  const supabase = createClient()
  const compressed = await compressImage(file)
  const path = `notes/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}.jpg`
  const { data, error } = await supabase.storage.from("diary-images").upload(path, compressed, {
    contentType: "image/jpeg",
    cacheControl: "31536000",
  })
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage.from("diary-images").getPublicUrl(data.path)
  return publicUrl
}

function genId() {
  return Math.random().toString(36).slice(2, 9)
}

function NoteBlocksEditor({ blocks, onChange }: { blocks: NoteBlock[]; onChange: (blocks: NoteBlock[]) => void }) {
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const updateBlock = (id: string, nextBlock: NoteBlock) => {
    onChange(blocks.map(block => block.id === id ? nextBlock : block))
  }

  const addTextBlock = () => {
    onChange([...blocks, { id: genId(), type: "paragraph", text: "" }])
  }

  const addImageBlock = () => {
    onChange([...blocks, { id: genId(), type: "image", images: [] }])
  }

  const deleteBlock = (id: string) => {
    const next = blocks.filter(block => block.id !== id)
    onChange(next.length > 0 ? next : emptyNoteBlocks())
  }

  const addImages = async (block: Extract<NoteBlock, { type: "image" }>, files: FileList | File[]) => {
    const arr = Array.from(files).filter(file => file.type.startsWith("image/"))
    const slots = 3 - block.images.length
    if (slots <= 0 || arr.length === 0) return
    setUploadingId(block.id)
    try {
      const urls = await Promise.all(arr.slice(0, slots).map(uploadNoteImage))
      const images: NoteImage[] = urls.map(url => ({ url }))
      updateBlock(block.id, { ...block, images: [...block.images, ...images] })
    } catch (error) {
      console.error("Failed to upload note image:", error)
    }
    setUploadingId(null)
  }

  const removeImage = (block: Extract<NoteBlock, { type: "image" }>, index: number) => {
    const next = block.images.filter((_, imgIndex) => imgIndex !== index)
    if (next.length === 0) deleteBlock(block.id)
    else updateBlock(block.id, { ...block, images: next })
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
      <div className="space-y-4">
        {blocks.map(block => {
          if (block.type === "image") {
            const colClass = block.images.length === 1 ? "" : block.images.length === 2 ? "grid grid-cols-2 gap-2" : "grid grid-cols-3 gap-2"
            return (
              <div key={block.id} className="group/block flex items-start gap-2">
                <div className="flex-1">
                  {block.images.length > 0 ? (
                    <div className={colClass}>
                      {block.images.map((img, index) => (
                        <div key={`${img.url}-${index}`} className="group/img relative">
                          <img src={img.url} alt="" className="h-52 w-full rounded-lg object-cover" />
                          <button
                            onClick={() => removeImage(block, index)}
                            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-gray-400 opacity-0 shadow-sm transition-opacity hover:bg-red-50 hover:text-red-600 group-hover/img:opacity-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <button
                      onDragOver={(event: DragEvent) => event.preventDefault()}
                      onDrop={event => { event.preventDefault(); addImages(block, event.dataTransfer.files) }}
                      onClick={() => fileRefs.current[block.id]?.click()}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-8 text-sm text-gray-400 transition-colors hover:border-indigo-300 hover:text-indigo-500"
                    >
                      {uploadingId === block.id ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</> : <><ImageIcon className="h-4 w-4" /> Drop image or click to upload</>}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover/block:opacity-100">
                  {block.images.length < 3 && (
                    <button onClick={() => fileRefs.current[block.id]?.click()} className="rounded-lg px-1.5 py-1.5 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600">
                      <ImageIcon className="h-4 w-4" />
                    </button>
                  )}
                  <span className="text-xs font-medium text-gray-400">{block.images.length}/3</span>
                  <button onClick={() => deleteBlock(block.id)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <input
                  ref={el => { fileRefs.current[block.id] = el }}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={event => {
                    if (event.target.files) addImages(block, event.target.files)
                    event.target.value = ""
                  }}
                />
              </div>
            )
          }

          return (
            <div key={block.id} className="group/block flex items-start gap-2">
              <textarea
                value={block.text}
                onChange={event => updateBlock(block.id, { ...block, text: event.target.value })}
                placeholder="Write something..."
                rows={3}
                className="min-h-24 flex-1 resize-none bg-transparent text-base leading-relaxed outline-none placeholder:text-gray-300"
              />
              <button onClick={() => deleteBlock(block.id)} className="rounded-lg p-1.5 text-gray-300 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover/block:opacity-100">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>
      <div className="mt-3 flex gap-2 border-t border-gray-100 pt-3">
        <button onClick={addTextBlock} className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-gray-400 hover:bg-gray-50 hover:text-gray-700">
          <Plus className="h-3.5 w-3.5" /> Text
        </button>
        <button onClick={addImageBlock} className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-gray-400 hover:bg-indigo-50 hover:text-indigo-600">
          <ImageIcon className="h-3.5 w-3.5" /> Image
        </button>
      </div>
    </div>
  )
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
  const [blocks, setBlocks] = useState<NoteBlock[]>(parseNoteBlocks(initialContent))
  const [tableData, setTableData] = useState<TableData>(
    initialType === "table" ? parseTableContent(initialContent) : emptyTable()
  )

  useEffect(() => {
    if (open) {
      setTitle(initialTitle)
      setType(initialType)
      setBlocks(initialType === "text" ? parseNoteBlocks(initialContent) : emptyNoteBlocks())
      setTableData(initialType === "table" ? parseTableContent(initialContent) : emptyTable())
    }
  }, [open, initialTitle, initialContent, initialType])

  const handleSave = () => {
    if (!title.trim()) return
    if (type === "text" && !noteHasContent(blocks)) return

    const content = type === "table" ? stringifyTable(tableData) : stringifyNoteBlocks(blocks)
    onSave(title, content, type)
    onOpenChange(false)
  }

  const canSave = title.trim() && (type === "table" || noteHasContent(blocks))

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
              <NoteBlocksEditor blocks={blocks} onChange={setBlocks} />
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
